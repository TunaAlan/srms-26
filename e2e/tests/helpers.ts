// =============================================================================
// helpers.ts
// Shared login helper used by all spec files.
// Performs the full login flow and waits for the dashboard to be visible
// so each test starts from a known authenticated state.
// =============================================================================

import { Page } from '@playwright/test';

export const ADMIN = {
  email: 'admin@ankara.bel.tr',
  password: 'admin123',
};

export const REVIEWER = {
  email: 'review@ankara.bel.tr',
  password: 'review123',
};

export function attachNetworkLogger(page: Page) {
  page.on('response', (response) => {
    const url = response.url();
    if (url.includes('localhost:3000')) {
      const method = response.request().method();
      const status = response.status();
      const path = new URL(url).pathname + new URL(url).search;
      const level = status >= 400 ? '⚠ ' : '  ';
      console.log(`${level}[${method}] ${path} → ${status}`);
    }
  });
}

export async function loginAs(page: Page, user: { email: string; password: string }) {
  attachNetworkLogger(page);
  await page.goto('/');
  await page.getByPlaceholder('ad.soyad@ankara.bel.tr').fill(user.email);
  await page.getByPlaceholder('••••••••').fill(user.password);
  await page.getByRole('button', { name: 'Giriş Yap' }).click();
  // Wait until the dashboard is rendered — confirms login succeeded.
  // .nav-tabs is rendered for all roles; admin goes to dashboard, reviewer goes to review tab.
  await page.waitForSelector('.nav-tabs', { timeout: 10_000 });
}
