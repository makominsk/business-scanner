import { z } from 'zod';

// Схема для ответа от RapidAPI (упрощенная, для примера)
// В реальном проекте нужно будет детально изучить структуру ответа RapidAPI
// и создать соответствующую Zod-схему.
const RapidApiBusinessSchema = z.object({
  place_id: z.string(),
  name: z.string(),
  address: z.string(),
  website: z.string().url().optional(),
  phone: z.string().optional(),
  categories: z.array(z.string()).optional(),
  rating: z.number().optional(),
  user_ratings_total: z.number().int().optional(),
  // Добавьте другие поля, которые возвращает RapidAPI
  // и которые нужны для BusinessRecord
});

export type RapidApiBusiness = z.infer<typeof RapidApiBusinessSchema>;

export async function searchLocalBusinesses(
  region: string,
  activity: string,
  rapidApiKey: string
): Promise<RapidApiBusiness[]> {
  const url = `https://local-business-data.p.rapidapi.com/search?query=${encodeURIComponent(activity)}&location=${encodeURIComponent(region)}`;
  
  const options = {
    method: 'GET',
    headers: {
      'X-RapidAPI-Key': rapidApiKey,
      'X-RapidAPI-Host': 'local-business-data.p.rapidapi.com'
    }
  };

  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`RapidAPI request failed: ${response.status} ${response.statusText} - ${errorText}`);
    }
    const data = await response.json();
    
    // Предполагаем, что RapidAPI возвращает массив бизнесов в поле 'data' или 'results'
    // Это нужно будет уточнить по документации RapidAPI
    const businesses = z.array(RapidApiBusinessSchema).parse(data.data || data.results || []);
    return businesses;

  } catch (error) {
    console.error('Error searching local businesses:', error);
    throw error;
  }
}
