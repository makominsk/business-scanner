import { google } from 'googleapis';
import { BusinessRecord } from './schemas';

const sheets = google.sheets('v4'); // Инициализируем sheets глобально

export async function appendToGoogleSheet(
  records: BusinessRecord[],
  sheetsClientEmail: string,
  sheetsPrivateKey: string,
  sheetsSpreadsheetId: string
): Promise<void> {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: sheetsClientEmail,
      private_key: sheetsPrivateKey.replace(/\\n/g, '\n'), // Заменяем экранированные \n на реальные
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const authClient = await auth.getClient();
  google.options({ auth: authClient as any }); // Приводим к any для обхода ошибки типов

  // Преобразование BusinessRecord в массив строк для Google Sheets
  const values = records.map(record => [
    record.collected_at,
    record.region_query,
    record.activity_query,
    record.name,
    record.address_full,
    record.phone_e164 || '',
    record.website || '',
    record.emails.join('; '), // Emails как ;-разделённая строка
    JSON.stringify(record.socials), // Socials как JSON-строка
    record.categories.join('; '),
    record.place_id,
    record.rating || '',
    record.user_ratings_total || '',
    record.location.lat,
    record.location.lng,
    record.google_url || '',
  ]);

  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetsSpreadsheetId,
      range: 'Sheet1!A:P', // Предполагаем, что данные начинаются с A1 и занимают 16 колонок
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: values,
      },
    });
    console.log(`Successfully appended ${records.length} rows to Google Sheet.`);
  } catch (error) {
    console.error('Error appending to Google Sheet:', error);
    throw error;
  }
}
