import { describe, it, expect, vi, beforeEach } from 'vitest';
import { normalizeWithGemini } from '@/lib/normalizer';
import { BusinessRecordSchema } from '@/lib/schemas';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Мокаем GoogleGenerativeAI
vi.mock('@google/generative-ai', () => {
  const mockGenerateContent = vi.fn();
  const mockGetGenerativeModel = vi.fn(() => ({
    generateContent: mockGenerateContent,
  }));
  return {
    GoogleGenerativeAI: vi.fn(() => ({
      getGenerativeModel: mockGetGenerativeModel,
    })),
  };
});

describe('normalizeWithGemini', () => {
  const GEMINI_API_KEY = 'test-gemini-key';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should normalize raw business data into a valid BusinessRecord', async () => {
    const rawBusiness = {
      place_id: 'test_place_id_1',
      name: 'ООО "Тестовая Компания"',
      address: 'ул. Тестовая, 10, г. Тестоград',
      website: 'https://testcompany.com',
      phone: '8 (800) 555-35-35',
      categories: ['clothing_store', 'retail'],
      rating: 4.5,
      user_ratings_total: 100,
      emails: ['info@testcompany.com'],
      socials: { facebook: 'https://facebook.com/testcompany' },
    };

    const mockGeminiResponse = {
      response: {
        text: () => JSON.stringify({
          source: 'rapidapi-local-business-data',
          collected_at: new Date().toISOString(),
          region_query: 'Тестоград',
          activity_query: 'одежда',
          place_id: 'test_place_id_1',
          name: 'Тестовая Компания',
          categories: ['одежда', 'retail'],
          description: null,
          address_full: 'ул. Тестовая, 10, Тестоград',
          address_components: {
            city: 'Тестоград',
            street: 'Тестовая',
            house: '10',
            country: undefined, // Явно указываем undefined для опциональных полей
            region: undefined,
            postal_code: undefined,
          },
          location: { lat: 10, lng: 20 }, // Gemini должен будет сгенерировать
          phone_e164: '+78005553535',
          website: 'https://testcompany.com',
          emails: ['info@testcompany.com'],
          socials: { facebook: 'https://facebook.com/testcompany' },
          rating: 4.5,
          user_ratings_total: 100,
          opening_hours_raw: null,
          price_level: null,
          google_url: null,
          notes: null,
        }),
      },
    };

    (GoogleGenerativeAI as any).mockImplementation(() => ({
      getGenerativeModel: () => ({
        generateContent: vi.fn().mockResolvedValueOnce(mockGeminiResponse),
      }),
    }));

    const result = await normalizeWithGemini(rawBusiness, GEMINI_API_KEY);
    expect(result).not.toBeNull();
    expect(() => BusinessRecordSchema.parse(result)).not.toThrow();
    expect(result?.name).toBe('Тестовая Компания');
    expect(result?.phone_e164).toBe('+78005553535');
  });

  it('should return null if Gemini returns invalid JSON', async () => {
    const rawBusiness = {
      place_id: 'test_place_id_2',
      name: 'Invalid Data Co',
      address: '123 Invalid St',
      emails: [],
      socials: {},
    };

    const mockGeminiResponse = {
      response: {
        text: () => 'This is not JSON',
      },
    };

    (GoogleGenerativeAI as any).mockImplementation(() => ({
      getGenerativeModel: () => ({
        generateContent: vi.fn().mockResolvedValueOnce(mockGeminiResponse),
      }),
    }));

    const result = await normalizeWithGemini(rawBusiness, GEMINI_API_KEY);
    expect(result).toBeNull();
  });

  it('should return null if Gemini returns JSON that does not match schema', async () => {
    const rawBusiness = {
      place_id: 'test_place_id_3',
      name: 'Schema Mismatch Inc',
      address: '456 Schema Ave',
      emails: [],
      socials: {},
    };

    const mockGeminiResponse = {
      response: {
        text: () => JSON.stringify({
          // Отсутствуют обязательные поля, например, collected_at, region_query
          name: 'Schema Mismatch Inc',
          place_id: 'test_place_id_3',
          address_full: '456 Schema Ave',
          categories: [],
          location: { lat: 0, lng: 0 },
          emails: [],
          socials: {},
        }),
      },
    };

    (GoogleGenerativeAI as any).mockImplementation(() => ({
      getGenerativeModel: () => ({
        generateContent: vi.fn().mockResolvedValueOnce(mockGeminiResponse),
      }),
    }));

    const result = await normalizeWithGemini(rawBusiness, GEMINI_API_KEY);
    expect(result).toBeNull();
  });

  it('should handle API errors from Gemini', async () => {
    const rawBusiness = {
      place_id: 'test_place_id_4',
      name: 'API Error Corp',
      address: '789 Error Rd',
      emails: [],
      socials: {},
    };

    (GoogleGenerativeAI as any).mockImplementation(() => ({
      getGenerativeModel: () => ({
        generateContent: vi.fn().mockRejectedValueOnce(new Error('Gemini API error')),
      }),
    }));

    const result = await normalizeWithGemini(rawBusiness, GEMINI_API_KEY);
    expect(result).toBeNull();
  });
});
