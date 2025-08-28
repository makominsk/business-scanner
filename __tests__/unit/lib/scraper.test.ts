import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { scrapeContactsFromWebsite } from '@/lib/scraper';

// Мокаем глобальный fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('scrapeContactsFromWebsite', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('should return empty contacts for an empty URL', async () => {
    const result = await scrapeContactsFromWebsite('');
    expect(result).toEqual({ emails: [], socials: {} });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should block scraping for internal/localhost URLs', async () => {
    const internalUrls = [
      'http://localhost:3000',
      'http://10.0.0.1',
      'http://172.16.0.1',
      'http://192.168.1.1',
      'http://169.254.0.1',
    ];

    for (const url of internalUrls) {
      const result = await scrapeContactsFromWebsite(url);
      expect(result).toEqual({ emails: [], socials: {} });
      expect(mockFetch).not.toHaveBeenCalled();
    }
  });

  it('should return empty contacts if fetch fails', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));
    const result = await scrapeContactsFromWebsite('http://example.com');
    expect(result).toEqual({ emails: [], socials: {} });
    expect(mockFetch).toHaveBeenCalledWith('http://example.com', expect.any(Object));
  });

  it('should return empty contacts if response is not ok', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      text: () => Promise.resolve(''),
      headers: new Headers(),
    });
    const result = await scrapeContactsFromWebsite('http://example.com');
    expect(result).toEqual({ emails: [], socials: {} });
  });

  it('should return empty contacts if content type is not HTML', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      text: () => Promise.resolve('{}'),
    });
    const result = await scrapeContactsFromWebsite('http://example.com');
    expect(result).toEqual({ emails: [], socials: {} });
  });

  it('should return empty contacts if content length exceeds max bytes', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-type': 'text/html', 'content-length': '3000000' }), // 3MB > 2MB
      text: () => Promise.resolve('<html><body>Large content</body></html>'),
    });
    const result = await scrapeContactsFromWebsite('http://example.com');
    expect(result).toEqual({ emails: [], socials: {} });
  });

  it('should extract emails from text content and mailto links', async () => {
    const html = `
      <html>
        <body>
          <p>Contact us at info@example.com or support@example.org.</p>
          <a href="mailto:sales@example.net">Email Sales</a>
          <a href="http://example.com">Link</a>
        </body>
      </html>
    `;
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-type': 'text/html' }),
      text: () => Promise.resolve(html),
    });

    const result = await scrapeContactsFromWebsite('http://example.com');
    expect(result.emails).toEqual(expect.arrayContaining(['info@example.com', 'support@example.org', 'sales@example.net']));
    expect(result.emails.length).toBe(3);
  });

  it('should extract social media links', async () => {
    const html = `
      <html>
        <body>
          <a href="https://facebook.com/mycompany">Facebook</a>
          <a href="https://www.instagram.com/mycompany_official/">Instagram</a>
          <a href="https://x.com/mycompany_tweets">Twitter/X</a>
          <a href="https://t.me/mycompany_channel">Telegram</a>
          <a href="https://vk.com/mycompany_vk">VK</a>
          <a href="https://www.linkedin.com/company/mycompany/">LinkedIn</a>
          <a href="https://www.youtube.com/user/mycompanytube">YouTube</a>
          <a href="https://www.tiktok.com/@mycompanytiktok">TikTok</a>
          <a href="https://other.com/profile">Other link</a>
        </body>
      </html>
    `;
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-type': 'text/html' }),
      text: () => Promise.resolve(html),
    });

    const result = await scrapeContactsFromWebsite('http://example.com');
    expect(result.socials).toEqual({
      facebook: 'https://facebook.com/mycompany',
      instagram: 'https://www.instagram.com/mycompany_official/',
      x: 'https://x.com/mycompany_tweets',
      telegram: 'https://t.me/mycompany_channel',
      vk: 'https://vk.com/mycompany_vk',
      linkedin: 'https://www.linkedin.com/company/mycompany/',
      youtube: 'https://www.youtube.com/user/mycompanytube',
      tiktok: 'https://www.tiktok.com/@mycompanytiktok',
    });
  });

  it('should handle timeout during fetch', async () => {
    mockFetch.mockImplementationOnce(() => {
      return new Promise((resolve) => setTimeout(() => resolve({ ok: true, headers: new Headers(), text: () => Promise.resolve('') }), 10000)); // 10 seconds
    });

    const result = await scrapeContactsFromWebsite('http://timeout.com');
    expect(result).toEqual({ emails: [], socials: {} });
    expect(mockFetch).toHaveBeenCalled();
  }, 12000); // Увеличиваем таймаут для этого теста до 12 секунд

  it('should extract unique emails and first social link of each type', async () => {
    const html = `
      <html>
        <body>
          <p>Email: test@example.com, test@example.com</p>
          <a href="mailto:another@example.com">Another Email</a>
          <a href="https://facebook.com/first">FB1</a>
          <a href="https://facebook.com/second">FB2</a>
        </body>
      </html>
    `;
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-type': 'text/html' }),
      text: () => Promise.resolve(html),
    });

    const result = await scrapeContactsFromWebsite('http://example.com');
    expect(result.emails).toEqual(expect.arrayContaining(['test@example.com', 'another@example.com']));
    expect(result.emails.length).toBe(2);
    expect(result.socials.facebook).toBe('https://facebook.com/first'); // Should take the first one
  });
});
