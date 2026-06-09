// =============================================================================
// auth.spec.ts
// Blackbox E2E — authentication flows.
// Tests only what a real user sees: the login form, error messages, and which
// dashboard loads after a successful login. No internal state is inspected.
// =============================================================================

import { test, expect } from '@playwright/test';
import { ADMIN, REVIEWER, loginAs } from './helpers';

test.describe('Authentication', () => {
  test('admin login shows the full admin dashboard with all tabs', async ({ page }) => {
    await loginAs(page, ADMIN);

    // Admin sees all tabs (NavTabs renders <div class="nav-tab">, not <button>)
    await expect(page.locator('.nav-tab', { hasText: /Raporlar/ })).toBeVisible();
    await expect(page.locator('.nav-tab', { hasText: /İnceleme/ })).toBeVisible();
    await expect(page.locator('.nav-tab', { hasText: /Harita/ })).toBeVisible();
    await expect(page.locator('.nav-tab', { hasText: /Personel/ })).toBeVisible();
  });

  test('review_personnel login shows only reviewer tabs', async ({ page }) => {
    await loginAs(page, REVIEWER);

    // Reviewer sees review queue and map — not reports or personnel
    await expect(page.locator('.nav-tab', { hasText: /İnceleme/ })).toBeVisible();
    await expect(page.locator('.nav-tab', { hasText: /Personel/ })).not.toBeVisible();
  });

  test('wrong password shows an error message', async ({ page }) => {
    await page.goto('/');
    await page.getByPlaceholder('ad.soyad@ankara.bel.tr').fill(ADMIN.email);
    await page.getByPlaceholder('••••••••').fill('yanlis_sifre');
    await page.getByRole('button', { name: 'Giriş Yap' }).click();

    // Error message must appear; dashboard must not load.
    await expect(page.locator('.login-error')).toBeVisible();
    await expect(page.locator('.stats-grid')).not.toBeVisible();
  });

  test('citizen account is rejected with an access-denied message', async ({ page }) => {
    // Citizen accounts have role "user" — the admin panel must refuse them
    // even if the server returns 200 with valid credentials.
    await page.goto('/');
    await page.getByPlaceholder('ad.soyad@ankara.bel.tr').fill('citizen@test.com');
    await page.getByPlaceholder('••••••••').fill('citizen123');
    await page.getByRole('button', { name: 'Giriş Yap' }).click();

    await expect(page.locator('.login-error')).toContainText('Bu panele erişim yetkiniz yok');
  });
});
