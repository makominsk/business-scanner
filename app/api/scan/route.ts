import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ScanRequestSchema, BusinessRecord, BusinessRecordSchema } from '@/lib/schemas';
import { searchLocalBusinesses } from '@/lib/local-business-api';
import { scrapeContactsFromWebsite } from '@/lib/scraper';
import { normalizeWithGemini } from '@/lib/normalizer';
import { appendToGoogleSheet } from '@/lib/google-sheets';
import Bottleneck from 'bottleneck';

// Инициализация Bottleneck для контроля частоты запросов
// Настройки можно вынести в переменные окружения
const limiter = new Bottleneck({
  maxConcurrent: 3, // Максимум 3 параллельных запроса
  minTime: 200,     // Минимум 200 мс между запросами
});

export async function POST(req: Request) {
  // Устанавливаем заголовки для Server-Sent Events (SSE)
  const headers = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
  };

  // Создаем ReadableStream для отправки данных клиенту
  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data: any, event = 'message') => {
        controller.enqueue(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      };

      try {
        const body = await req.json();
        const { region, activity } = ScanRequestSchema.parse(body);

        const jobId = `job-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        console.log(`[${jobId}] Scan initiated for region: ${region}, activity: ${activity}`);
        sendEvent({ status: 'started', jobId, message: 'Scan initiated' });

        const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
        const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
        const SHEETS_CLIENT_EMAIL = process.env.SHEETS_CLIENT_EMAIL;
        const SHEETS_PRIVATE_KEY = process.env.SHEETS_PRIVATE_KEY;
        const SHEETS_SPREADSHEET_ID = process.env.SHEETS_SPREADSHEET_ID;

        if (!RAPIDAPI_KEY || !GEMINI_API_KEY || !SHEETS_CLIENT_EMAIL || !SHEETS_PRIVATE_KEY || !SHEETS_SPREADSHEET_ID) {
          throw new Error('Missing one or more API keys or Sheets credentials in environment variables.');
        }

        sendEvent({ status: 'progress', message: 'Searching local businesses...', progress: 5 });
        const rawBusinesses = await searchLocalBusinesses(region, activity, RAPIDAPI_KEY);
        sendEvent({ status: 'progress', message: `Found ${rawBusinesses.length} businesses.`, foundCount: rawBusinesses.length, progress: 20 });

        const processedRecords: BusinessRecord[] = [];
        let processedCount = 0;

        for (const rawBusiness of rawBusinesses) {
          const website = rawBusiness.website;
          let emails: string[] = [];
          let socials: { [key: string]: string | undefined } = {};

          if (website) {
            try {
              const scraped = await limiter.schedule(() => scrapeContactsFromWebsite(website));
              emails = scraped.emails;
              socials = scraped.socials;
            } catch (scrapeError) {
              console.warn(`[${jobId}] Failed to scrape website ${website}:`, scrapeError);
            }
          }

          const rawDataForNormalization = {
            ...rawBusiness,
            emails,
            socials,
            // Добавьте другие поля, которые Gemini должен нормализовать
          };

          try {
            const normalizedRecord = await limiter.schedule(() =>
              normalizeWithGemini(rawDataForNormalization, GEMINI_API_KEY!)
            );

            if (normalizedRecord) {
              processedRecords.push({
                ...normalizedRecord,
                collected_at: new Date().toISOString(),
                region_query: region,
                activity_query: activity,
                source: "rapidapi-local-business-data", // Убедимся, что источник правильный
              });
            } else {
              console.warn(`[${jobId}] Failed to normalize business: ${rawBusiness.name}`);
            }
          } catch (normalizeError) {
            console.error(`[${jobId}] Error during normalization for ${rawBusiness.name}:`, normalizeError);
          }

          processedCount++;
          const currentProgress = 20 + (processedCount / rawBusinesses.length) * 70; // 20% на поиск, 70% на обработку
          sendEvent({
            status: 'progress',
            message: `Processing business ${processedCount}/${rawBusinesses.length}...`,
            processedCount,
            progress: Math.min(currentProgress, 90),
          });

          // Батчевая запись в Google Sheets
          if (processedRecords.length >= 50 || (processedCount === rawBusinesses.length && processedRecords.length > 0)) {
            try {
              await limiter.schedule(() =>
                appendToGoogleSheet(
                  processedRecords,
                  SHEETS_CLIENT_EMAIL!,
                  SHEETS_PRIVATE_KEY!,
                  SHEETS_SPREADSHEET_ID!
                )
              );
              sendEvent({ status: 'progress', message: `Appended ${processedRecords.length} records to Google Sheet.`, progress: Math.min(currentProgress + 5, 95) });
              processedRecords.length = 0; // Очищаем массив после записи
            } catch (sheetError) {
              console.error(`[${jobId}] Error appending to Google Sheet:`, sheetError);
              sendEvent({ status: 'error', message: 'Failed to write to Google Sheet.', details: (sheetError as Error).message });
            }
          }
        }

        sendEvent({ status: 'completed', message: 'Scan finished successfully!', progress: 100, sheetUrl: `https://docs.google.com/spreadsheets/d/${SHEETS_SPREADSHEET_ID}/edit` });
        controller.close();

      } catch (error) {
        if (error instanceof z.ZodError) {
          sendEvent({ status: 'error', message: 'Invalid request data', details: error.errors, progress: 0 });
        } else {
          sendEvent({ status: 'error', message: 'Internal server error', details: (error as Error).message, progress: 0 });
        }
        console.error('API Scan Error:', error);
        controller.close();
      }
    },
    cancel() {
      console.log('Client disconnected from SSE stream.');
    },
  });

  return new NextResponse(stream, { headers });
}
