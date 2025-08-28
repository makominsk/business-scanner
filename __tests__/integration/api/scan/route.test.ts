/// <reference types="vitest" />
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'; // Переносим vi сюда
import { POST } from '@/app/api/scan/route';
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { BusinessRecordSchema } from '@/lib/schemas';

// Мокаем переменные окружения
const mockEnv = {
  RAPIDAPI_KEY: 'mock-rapidapi-key',
  GEMINI_API_KEY: 'mock-gemini-api-key',
  SHEETS_CLIENT_EMAIL: 'mock-client-email@example.com',
  SHEETS_PRIVATE_KEY: 'mock-private-key',
  SHEETS_SPREADSHEET_ID: 'mock-spreadsheet-id',
  NODE_ENV: 'test', // Добавляем NODE_ENV
};

vi.stubGlobal('process', {
  env: mockEnv,
});

// Мокаем внешние зависимости
vi.mock('@/lib/local-business-api', () => ({
  searchLocalBusinesses: vi.fn(),
}));
vi.mock('@/lib/scraper', () => ({
  scrapeContactsFromWebsite: vi.fn(),
}));
vi.mock('@/lib/normalizer', () => ({
  normalizeWithGemini: vi.fn(),
}));
vi.mock('@/lib/google-sheets', () => ({
  appendToGoogleSheet: vi.fn(),
}));

// Импортируем моки
import { searchLocalBusinesses } from '@/lib/local-business-api';
import { scrapeContactsFromWebsite } from '@/lib/scraper';
import { normalizeWithGemini } from '@/lib/normalizer';
import { appendToGoogleSheet } from '@/lib/google-sheets';

describe('API /api/scan', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Убедимся, что моки возвращают ожидаемые значения по умолчанию
    (searchLocalBusinesses as vi.Mock).mockResolvedValue([
      {
        place_id: 'place_1',
        name: 'Business One',
        address: 'Address One',
        website: 'http://website1.com',
        phone: '111',
        categories: ['cat1'],
        rating: 4,
        user_ratings_total: 10,
      },
      {
        place_id: 'place_2',
        name: 'Business Two',
        address: 'Address Two',
        website: null,
        phone: '222',
        categories: ['cat2'],
        rating: 3,
        user_ratings_total: 5,
      },
    ]);
    (scrapeContactsFromWebsite as vi.Mock).mockResolvedValue({
      emails: ['info@website1.com'],
      socials: { facebook: 'http://fb.com/one' },
    });
    (normalizeWithGemini as vi.Mock).mockImplementation((rawData: any) => { // Добавляем тип any
      const normalized = {
        source: 'rapidapi-local-business-data',
        collected_at: new Date().toISOString(),
        region_query: 'TestRegion',
        activity_query: 'TestActivity',
        place_id: rawData.place_id,
        name: rawData.name,
        categories: rawData.categories || [],
        address_full: rawData.address,
        address_components: { city: 'TestCity' },
        location: { lat: 1, lng: 1 },
        phone_e164: rawData.phone ? `+1${rawData.phone}` : undefined,
        website: rawData.website,
        emails: rawData.emails,
        socials: rawData.socials,
        rating: rawData.rating,
        user_ratings_total: rawData.user_ratings_total,
        google_url: 'http://google.com/place_id',
      };
      return BusinessRecordSchema.parse(normalized); // Валидируем мок
    });
    (appendToGoogleSheet as vi.Mock).mockResolvedValue(undefined);
  });

  it('should return 400 for invalid request data', async () => {
    const req = new NextRequest('http://localhost/api/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ region: '', activity: 'test' }), // Невалидные данные
    });

    const response = await POST(req);
    expect(response.status).toBe(200); // SSE stream всегда возвращает 200
    expect(response.headers.get('Content-Type')).toBe('text/event-stream');

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let output = '';
    const events: any[] = [];

    while (true) {
      const { done, value } = await reader!.read();
      if (done) break;
      // Проверяем тип value перед декодированием
      const chunk = typeof value === 'string' ? value : decoder.decode(value, { stream: true });
      output += chunk;
      const newEvents = output.split('\n\n').filter(e => e.startsWith('event: message\ndata: '));
      for (const eventString of newEvents) {
        const dataString = eventString.substring('event: message\ndata: '.length);
        try {
          events.push(JSON.parse(dataString));
        } catch (parseError) {
          console.error('Failed to parse event data:', dataString, parseError);
        }
      }
      // Очищаем буфер, оставляя только необработанную часть
      const lastEventIndex = output.lastIndexOf('\n\n');
      if (lastEventIndex !== -1) {
        output = output.substring(lastEventIndex + 2);
      } else {
        output = '';
      }
    }

    expect(events.length).toBeGreaterThan(0);
    const errorEvent = events.find(e => e.status === 'error');
    expect(errorEvent).toBeDefined();
    expect(errorEvent.message).toBe('Invalid request data');
    expect(errorEvent.details).toBeInstanceOf(Array);
  });

  it('should return 500 if environment variables are missing', async () => {
    // Временно очищаем переменные окружения
    const originalEnv = process.env;
    process.env = { NODE_ENV: 'test' }; // Оставляем NODE_ENV
    
    const req = new NextRequest('http://localhost/api/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ region: 'Minsk', activity: 'autoservice' }),
    });

    const response = await POST(req);
    expect(response.status).toBe(200); // SSE stream всегда возвращает 200, ошибки передаются через события
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let output = '';
    const events: any[] = []; // Объявляем events здесь
    while (true) {
      const { done, value } = await reader!.read();
      if (done) break;
      const chunk = typeof value === 'string' ? value : decoder.decode(value, { stream: true });
      output += chunk;
      const newEvents = output.split('\n\n').filter(e => e.startsWith('event: message\ndata: '));
      for (const eventString of newEvents) {
        const dataString = eventString.substring('event: message\ndata: '.length);
        try {
          events.push(JSON.parse(dataString));
        } catch (parseError) {
          console.error('Failed to parse event data:', dataString, parseError);
        }
      }
      const lastEventIndex = output.lastIndexOf('\n\n');
      if (lastEventIndex !== -1) {
        output = output.substring(lastEventIndex + 2);
      } else {
        output = '';
      }
    }
    const errorEvent = events.find(e => e.status === 'error');
    expect(errorEvent).toBeDefined();
    expect(errorEvent.details).toContain('Missing one or more API keys or Sheets credentials');

    process.env = originalEnv; // Восстанавливаем переменные окружения
  });

  it('should successfully process a scan request and stream progress', async () => {
    const req = new NextRequest('http://localhost/api/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ region: 'Minsk', activity: 'autoservice' }),
    });

    const response = await POST(req);
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('text/event-stream');

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let output = '';
    const events: any[] = [];

    while (true) {
      const { done, value } = await reader!.read();
      if (done) break;
      const chunk = typeof value === 'string' ? value : decoder.decode(value, { stream: true });
      output += chunk;
      const newEvents = output.split('\n\n').filter(e => e.startsWith('event: message\ndata: '));
      for (const eventString of newEvents) {
        const dataString = eventString.substring('event: message\ndata: '.length);
        try {
          events.push(JSON.parse(dataString));
        } catch (parseError) {
          console.error('Failed to parse event data:', dataString, parseError);
        }
      }
      const lastEventIndex = output.lastIndexOf('\n\n');
      if (lastEventIndex !== -1) {
        output = output.substring(lastEventIndex + 2);
      } else {
        output = '';
      }
    }

    expect(events.length).toBeGreaterThan(0);
    expect(events[0].status).toBe('started');
    expect(events.some(e => e.status === 'progress' && e.message.includes('Searching local businesses'))).toBe(true);
    expect(events.some(e => e.status === 'progress' && e.message.includes('Found 2 businesses'))).toBe(true);
    expect(events.some(e => e.status === 'progress' && e.message.includes('Processing business'))).toBe(true);
    expect(events.some(e => e.status === 'completed')).toBe(true);

    expect(searchLocalBusinesses).toHaveBeenCalledTimes(1);
    expect(scrapeContactsFromWebsite).toHaveBeenCalledTimes(1); // Только для Business One, у Business Two нет сайта
    expect(normalizeWithGemini).toHaveBeenCalledTimes(2);
    expect(appendToGoogleSheet).toHaveBeenCalledTimes(1); // Батчевая запись
  });

  it('should handle scraping errors gracefully', async () => {
    (scrapeContactsFromWebsite as vi.Mock).mockRejectedValueOnce(new Error('Scrape failed'));

    const req = new NextRequest('http://localhost/api/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ region: 'Minsk', activity: 'autoservice' }),
    });

    const response = await POST(req);
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let output = '';
    const events: any[] = []; // Объявляем events здесь
    while (true) {
      const { done, value } = await reader!.read();
      if (done) break;
      const chunk = typeof value === 'string' ? value : decoder.decode(value, { stream: true });
      output += chunk;
      const newEvents = output.split('\n\n').filter(e => e.startsWith('event: message\ndata: '));
      for (const eventString of newEvents) {
        const dataString = eventString.substring('event: message\ndata: '.length);
        try {
          events.push(JSON.parse(dataString));
        } catch (parseError) {
          console.error('Failed to parse event data:', dataString, parseError);
        }
      }
      const lastEventIndex = output.lastIndexOf('\n\n');
      if (lastEventIndex !== -1) {
        output = output.substring(lastEventIndex + 2);
      } else {
        output = '';
      }
    }

    const errorEvent = events.find(e => e.status === 'error');
    expect(errorEvent).toBeUndefined(); // Ошибка скрейпинга не должна приводить к общей ошибке стрима
    expect(scrapeContactsFromWebsite).toHaveBeenCalledTimes(1);
    expect(normalizeWithGemini).toHaveBeenCalledTimes(2); // Должны быть вызваны для обоих бизнесов
    expect(appendToGoogleSheet).toHaveBeenCalledTimes(1);
  });

  it('should handle normalization errors gracefully', async () => {
    (normalizeWithGemini as vi.Mock).mockResolvedValueOnce(null); // Первый бизнес не нормализуется

    const req = new NextRequest('http://localhost/api/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ region: 'Minsk', activity: 'autoservice' }),
    });

    const response = await POST(req);
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let output = '';
    const events: any[] = []; // Объявляем events здесь
    while (true) {
      const { done, value } = await reader!.read();
      if (done) break;
      const chunk = typeof value === 'string' ? value : decoder.decode(value, { stream: true });
      output += chunk;
      const newEvents = output.split('\n\n').filter(e => e.startsWith('event: message\ndata: '));
      for (const eventString of newEvents) {
        const dataString = eventString.substring('event: message\ndata: '.length);
        try {
          events.push(JSON.parse(dataString));
        } catch (parseError) {
          console.error('Failed to parse event data:', dataString, parseError);
        }
      }
      const lastEventIndex = output.lastIndexOf('\n\n');
      if (lastEventIndex !== -1) {
        output = output.substring(lastEventIndex + 2);
      } else {
        output = '';
      }
    }

    const errorEvent = events.find(e => e.status === 'error');
    expect(errorEvent).toBeUndefined();
    expect(normalizeWithGemini).toHaveBeenCalledTimes(2);
    expect(appendToGoogleSheet).toHaveBeenCalledTimes(1); // Должен записать только один успешно нормализованный бизнес
  });

  it('should handle Google Sheets append errors gracefully', async () => {
    (appendToGoogleSheet as vi.Mock).mockRejectedValueOnce(new Error('Sheets write failed'));

    const req = new NextRequest('http://localhost/api/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ region: 'Minsk', activity: 'autoservice' }),
    });

    const response = await POST(req);
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let output = '';
    const events: any[] = []; // Объявляем events здесь
    while (true) {
      const { done, value } = await reader!.read();
      if (done) break;
      const chunk = typeof value === 'string' ? value : decoder.decode(value, { stream: true });
      output += chunk;
      const newEvents = output.split('\n\n').filter(e => e.startsWith('event: message\ndata: '));
      for (const eventString of newEvents) {
        const dataString = eventString.substring('event: message\ndata: '.length);
        try {
          events.push(JSON.parse(dataString));
        } catch (parseError) {
          console.error('Failed to parse event data:', dataString, parseError);
        }
      }
      const lastEventIndex = output.lastIndexOf('\n\n');
      if (lastEventIndex !== -1) {
        output = output.substring(lastEventIndex + 2);
      } else {
        output = '';
      }
    }

    const errorEvent = events.find(e => e.status === 'error');
    expect(errorEvent).toBeDefined();
    expect(errorEvent.details).toContain('Sheets write failed');
    expect(appendToGoogleSheet).toHaveBeenCalledTimes(1);
  });
});
