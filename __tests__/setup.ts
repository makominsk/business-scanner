// Глобальные настройки для тестов
// Полифилл ReadableStream для окружений, где он отсутствует (например, при работе undici)
try {
  // @ts-ignore
  if (typeof (global as any).ReadableStream === 'undefined') {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { ReadableStream } = require('stream/web');
    (global as any).ReadableStream = ReadableStream;
  }
} catch { /* noop */ }
