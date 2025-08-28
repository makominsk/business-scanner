import { GoogleGenerativeAI } from '@google/generative-ai';
import { BusinessRecord, BusinessRecordSchema } from './schemas';
import { z } from 'zod';

const GEMINI_MODEL = 'gemini-1.5-flash'; // Экономичная модель для MVP
const GEMINI_TEMPERATURE = 0.2; // Низкая температура для стабильных результатов

interface RawBusinessData {
  place_id: string;
  name: string;
  address: string;
  website?: string;
  phone?: string;
  categories?: string[];
  rating?: number;
  user_ratings_total?: number;
  emails: string[];
  socials: {
    facebook?: string;
    instagram?: string;
    x?: string;
    telegram?: string;
    vk?: string;
    linkedin?: string;
    youtube?: string;
    tiktok?: string;
    other?: string[];
  };
  // Добавьте другие сырые поля, которые могут прийти от RapidAPI и скрейпера
}

export async function normalizeWithGemini(
  rawBusiness: RawBusinessData,
  geminiApiKey: string
): Promise<BusinessRecord | null> {
  const genAI = new GoogleGenerativeAI(geminiApiKey);
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

  const prompt = `
  Ты — эксперт по нормализации бизнес-данных. Твоя задача — взять сырые данные о компании и привести их к строгому JSON-формату, соответствующему предоставленной схеме.

  **Правила нормализации:**
  1.  **Не выдумывай данные.** Если поле отсутствует в сырых данных и ты не можешь его достоверно вывести, установи его значение в \`null\` или пропусти, если оно опционально.
  2.  **Имя компании:** Очисти от лишних символов, унифицируй регистр (например, "ООО 'Компания'" -> "Компания").
  3.  **Категории:** Маппинг "типов" из сырых данных в более общие и унифицированные категории. Например, "clothing_store" -> ["одежда", "retail"].
  4.  **Адрес:** Попробуй распарсить полный адрес на компоненты (страна, регион, город, улица, дом, почтовый индекс). Если не можешь, оставь \`null\` для компонентов.
  5.  **Телефон:** Приведи к формату E.164 (например, "+375291234567").
  6.  **Emails и соцсети:** Де-дублируй, валидируй.
  7.  **JSON-формат:** Верни ТОЛЬКО JSON-объект, без какого-либо дополнительного текста или пояснений.

  **Сырые данные о компании:**
  ${JSON.stringify(rawBusiness, null, 2)}

  **Требуемая JSON-схема (Zod-совместимая):**
  ${JSON.stringify(BusinessRecordSchema.shape, null, 2)}

  Верни ТОЛЬКО JSON-объект, соответствующий этой схеме.
  `;

  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: GEMINI_TEMPERATURE,
        responseMimeType: "application/json", // Указываем, что ожидаем JSON
      },
    });

    const responseText = result.response.text();
    const normalizedData = JSON.parse(responseText);

    // Валидация результата с помощью Zod
    const parsedBusiness = BusinessRecordSchema.parse(normalizedData);
    return parsedBusiness;

  } catch (error) {
    console.error('Error normalizing with Gemini:', error);
    if (error instanceof z.ZodError) {
      console.error('Gemini returned invalid JSON:', error.errors);
    }
    // Можно реализовать ретраи здесь
    return null;
  }
}
