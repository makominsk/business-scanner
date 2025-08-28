import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import BusinessScanner from '@/app/business-scanner-client';
import { ThemeProvider } from '@/components/theme-provider';

describe('BusinessScanner UI', () => {
  it('renders initial form and headings', () => {
    const html = renderToString(
      <ThemeProvider attribute="class" defaultTheme="dark">
        <BusinessScanner />
      </ThemeProvider>
    );
    expect(html).toContain('Business Scanner');
    expect(html).toContain('Сбор контактных данных');
    expect(html).toContain('Регион');
    expect(html).toContain('Деятельность');
    expect(html).toContain('Собрать контакты');
  });
});
