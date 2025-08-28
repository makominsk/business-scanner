import { z } from 'zod';

// Схема для компонентов адреса
export const AddressComponentsSchema = z.object({
  country: z.string().optional(),
  region: z.string().optional(),
  city: z.string().optional(),
  street: z.string().optional(),
  house: z.string().optional(),
  postal_code: z.string().optional(),
});

// Схема для местоположения
export const LocationSchema = z.object({
  lat: z.number(),
  lng: z.number(),
});

// Схема для социальных сетей
export const SocialsSchema = z.object({
  facebook: z.string().optional(),
  instagram: z.string().optional(),
  x: z.string().optional(), // Twitter
  telegram: z.string().optional(),
  vk: z.string().optional(),
  linkedin: z.string().optional(),
  youtube: z.string().optional(),
  tiktok: z.string().optional(),
  other: z.array(z.string()).optional(),
});

// Основная схема BusinessRecord
export const BusinessRecordSchema = z.object({
  source: z.literal("rapidapi-local-business-data"), // Обновлено с "google-places"
  collected_at: z.string().datetime(), // ISO8601
  region_query: z.string(),
  activity_query: z.string(),

  place_id: z.string(),
  name: z.string(),
  categories: z.array(z.string()),
  description: z.string().nullable().optional(), // Разрешаем null
  address_full: z.string(),
  address_components: AddressComponentsSchema,
  location: LocationSchema,
  phone_e164: z.string().nullable().optional(), // Разрешаем null
  website: z.string().url().nullable().optional(), // Разрешаем null
  emails: z.array(z.string().email()),
  socials: SocialsSchema,

  rating: z.number().nullable().optional(), // Разрешаем null
  user_ratings_total: z.number().int().nullable().optional(), // Разрешаем null
  opening_hours_raw: z.array(z.string()).nullable().optional(), // Разрешаем null
  price_level: z.number().int().min(0).max(4).nullable().optional(), // Разрешаем null
  google_url: z.string().url().nullable().optional(), // Разрешаем null
  notes: z.string().nullable().optional(), // Разрешаем null
});

export type BusinessRecord = z.infer<typeof BusinessRecordSchema>;

// Схема для входных данных API
export const ScanRequestSchema = z.object({
  region: z.string().min(1, "Region is required"),
  activity: z.string().min(1, "Activity is required"),
});

export type ScanRequest = z.infer<typeof ScanRequestSchema>;
