import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    globals: true,
    setupFiles: './__tests__/setup.ts',
    testTimeout: 10000, // Глобальный таймаут
    root: './', // Явно указываем корень проекта
    projects: [
      {
        // Unit тесты
        extends: './vitest.config.ts', // Расширяем базовую конфигурацию
        test: {
          environment: 'jsdom',
          include: ['__tests__/unit/**/*.test.ts'],
        },
      },
      {
        // Интеграционные тесты
        extends: './vitest.config.ts', // Расширяем базовую конфигурацию
        test: {
          environment: 'node',
          include: ['__tests__/integration/**/*.test.ts'],
        },
      },
    ],
  },
});
