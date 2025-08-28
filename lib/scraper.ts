import * as cheerio from 'cheerio';

const SCRAPE_TIMEOUT_MS = 8000; // 8 секунд
const SCRAPE_MAX_BYTES = 2 * 1024 * 1024; // 2 MB

// Регулярные выражения для поиска email и ссылок на соцсети
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const SOCIAL_REGEXES = {
  facebook: /(?:https?:\/\/)?(?:www\.)?facebook\.com\/[a-zA-Z0-9\.]+\/?/g,
  instagram: /(?:https?:\/\/)?(?:www\.)?instagram\.com\/[a-zA-Z0-9\._]+\/?/g,
  x: /(?:https?:\/\/)?(?:www\.)?(?:twitter|x)\.com\/[a-zA-Z0-9_]+\/?/g,
  telegram: /(?:https?:\/\/)?(?:t\.me|telegram\.me)\/[a-zA-Z0-9_]+\/?/g,
  vk: /(?:https?:\/\/)?(?:vk\.com)\/[a-zA-Z0-9_]+\/?/g,
  linkedin: /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/(?:in|company)\/[a-zA-Z0-9\-\_]+\/?/g,
  youtube: /(?:https?:\/\/)?(?:www\.)?youtube\.com\/(?:channel|user)\/[a-zA-Z0-9\-\_]+\/?/g,
  tiktok: /(?:https?:\/\/)?(?:www\.)?tiktok\.com\/@[a-zA-Z0-9\-\_]+\/?/g,
};

interface ScrapedContacts {
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
}

export async function scrapeContactsFromWebsite(websiteUrl: string): Promise<ScrapedContacts> {
  const contacts: ScrapedContacts = { emails: [], socials: {} };

  if (!websiteUrl) {
    return contacts;
  }

  try {
    // Проверка на внутренние IP и localhost для предотвращения SSRF
    const url = new URL(websiteUrl);
    if (url.hostname === 'localhost' || url.hostname.startsWith('169.254.') || url.hostname.match(/^(10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|192\.168\.)/)) {
      console.warn(`Blocked scraping attempt for internal/localhost URL: ${websiteUrl}`);
      return contacts;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SCRAPE_TIMEOUT_MS);

    const response = await fetch(websiteUrl, {
      signal: controller.signal,
      // Дополнительные заголовки, если нужно имитировать браузер
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`Failed to fetch ${websiteUrl}: ${response.status} ${response.statusText}`);
      return contacts;
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('text/html')) {
      console.warn(`Skipping non-HTML content type for ${websiteUrl}: ${contentType}`);
      return contacts;
    }

    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > SCRAPE_MAX_BYTES) {
      console.warn(`Skipping large content for ${websiteUrl}: ${contentLength} bytes`);
      return contacts;
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Извлечение email
    const emails = new Set<string>();
    const textContent = $('body').text();
    let match;
    while ((match = EMAIL_REGEX.exec(textContent)) !== null) {
      emails.add(match[0].toLowerCase());
    }
    // Также ищем в атрибутах href и mailto
    $('a[href^="mailto:"]').each((_, element) => {
      const href = $(element).attr('href');
      if (href) {
        const email = href.replace('mailto:', '').split('?')[0];
        if (email) emails.add(email.toLowerCase());
      }
    });
    contacts.emails = Array.from(emails);

    // Извлечение соцсетей
    const foundSocials: { [key: string]: string } = {};
    $('a').each((_, element) => {
      const href = $(element).attr('href');
      if (href) {
        for (const socialType in SOCIAL_REGEXES) {
          const regex = SOCIAL_REGEXES[socialType as keyof typeof SOCIAL_REGEXES];
          if (regex.test(href)) {
            if (!foundSocials[socialType]) { // Берем первую найденную ссылку для каждого типа
              foundSocials[socialType] = href;
            }
          }
        }
      }
    });
    contacts.socials = foundSocials;

  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn(`Scraping timed out for ${websiteUrl}`);
    } else {
      console.error(`Error scraping ${websiteUrl}:`, error);
    }
  }

  return contacts;
}
