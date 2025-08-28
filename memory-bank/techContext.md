# Tech Context: Бизнес-сканер MVP

**Технологии, используемые в проекте:**
- **Фронтенд/Бэкенд:** Next.js 14 (App Router) на Vercel.
- **Язык:** TypeScript (строгая типизация).
- **UI-компоненты:** shadcn/ui (на базе Radix UI и Tailwind CSS).
- **Поиск бизнес-данных:** RapidAPI Local Business Data API.
- **Нормализация данных:** Google Gemini API (модель 1.5-Flash).
- **Хранение результатов:** Google Sheets API.
- **Парсинг HTML:** Cheerio.
- **Контроль частоты запросов:** Bottleneck.
- **Валидация данных:** Zod.
- **Управление формами:** React Hook Form.
- **Логирование:** Pino (или консоль + Vercel Observability).
- **Тестирование:** Vitest/Jest (unit/integration), Playwright (E2E).

**Настройка разработки:**
- Проект инициализирован с Next.js.
- Используется `pnpm` для управления пакетами.
- Переменные окружения для API-ключей и кредов Google Sheets будут храниться в `.env.local` (не отслеживается Git).

**Технические ограничения:**
- MVP не использует базу данных для персистентного хранения данных, кроме Google Sheets.
- Ограничения по квотам и скорости запросов к внешним API (RapidAPI, Gemini, Google Sheets).
- Ограничения по таймауту и размеру при скрейпинге сайтов.
- Отсутствие аутентификации/авторизации пользователей в MVP.

**Зависимости:**
- `@hookform/resolvers`
- `@radix-ui/*` (для shadcn/ui)
- `@react-three/drei`, `@react-three/fiber`, `three` (для 3D-сцены, существующие)
- `autoprefixer`, `tailwindcss`, `postcss`
- `class-variance-authority`, `clsx`, `tailwind-merge`
- `cmdk`, `date-fns`, `embla-carousel-react`, `input-otp`, `lucide-react`
- `next`, `next-themes`, `react`, `react-dom`, `react-day-picker`, `react-hook-form`, `react-resizable-panels`, `recharts`, `sonner`, `tailwindcss-animate`, `vaul`
- `zod`
- **Будут добавлены:** `google-auth-library`, `googleapis`, `cheerio`, `bottleneck`.

**Паттерны использования инструментов:**
- `Zod` для валидации входных данных на API-слое и нормализованных данных от Gemini.
- `Bottleneck` для управления параллельными запросами к внешним API.
- `Cheerio` для быстрого и безопасного парсинга HTML.
