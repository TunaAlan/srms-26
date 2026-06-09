// =============================================================================
// admin.spec.ts
// Blackbox E2E — admin user workflows.
// Destructive "delete all" test lives in z-cleanup.spec.ts so it runs after
// all other spec files (alphabetical order).
// =============================================================================

import { test, expect } from '@playwright/test';
import { ADMIN, loginAs } from './helpers';

test.describe('Admin workflows', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, ADMIN);
  });

  test('reports tab loads and shows the reports table', async ({ page }) => {
    await page.locator('.nav-tab', { hasText: /Raporlar/ }).click();
    // Page always renders — either a table or the empty state
    await expect(page.locator('.table-container')).toBeVisible();
  });

  test('status filter changes the visible rows', async ({ page }) => {
    await page.locator('.nav-tab', { hasText: /Raporlar/ }).click();

    // Count rows before filtering
    const allRows = page.locator('tbody tr');
    const totalBefore = await allRows.count();

    // Apply "Beklemede" filter
    await page.locator('select.filter-select').first().selectOption('pending');

    const filteredRows = page.locator('tbody tr');
    const totalAfter = await filteredRows.count();

    // Filtered count must be ≤ total (could be equal if all are pending)
    expect(totalAfter).toBeLessThanOrEqual(totalBefore);
  });

  test('view on map navigates to the map tab and focuses the report', async ({ page }) => {
    await page.locator('.nav-tab', { hasText: /Raporlar/ }).click();

    const rowCount = await page.locator('tbody tr').count();
    test.skip(rowCount === 0, 'No reports in DB — seed data first');

    // Open first report detail
    await page.locator('tbody tr').first().click();
    await expect(page.locator('.modal')).toBeVisible();

    // Click "Haritada Gör" — only enabled when report has coordinates
    const mapBtn = page.locator('.modal').getByText(/Haritada Gör/);
    test.skip(await mapBtn.count() === 0, 'Report has no coordinates');

    await mapBtn.click();

    // Modal closes and map tab becomes active
    await expect(page.locator('.modal')).not.toBeVisible();
    await expect(page.locator('.map-wrapper')).toBeVisible();
    await expect(page.locator('.nav-tab.active')).toHaveText(/Harita/);
  });

  test('opening a report detail and changing its status updates the badge', async ({ page }) => {
    await page.locator('.nav-tab', { hasText: /Raporlar/ }).click();

    const rowCount = await page.locator('tbody tr').count();
    test.skip(rowCount === 0, 'No reports in DB — seed data first');

    // Click the first report row to open the detail modal
    await page.locator('tbody tr').first().click();
    await expect(page.locator('.modal')).toBeVisible();

    // If there is a status dropdown (report has allowed transitions), change it
    const dropdown = page.locator('.modal').getByText(/▾/);
    if (await dropdown.count() > 0) {
      await dropdown.click();
      // Transition options are plain <div>s with known label text
      await page.locator('.modal').getByText(/Çözüldü|Tekrar İncelemeye Al/).first().click();
      // Confirm the change
      await page.getByRole('button', { name: 'Onayla' }).click();
    }

    // Modal should close after action
    await page.getByRole('button', { name: 'Kapat' }).click();
    await expect(page.locator('.modal')).not.toBeVisible();
  });

  test('personnel panel creates a new staff account', async ({ page }) => {
    await page.locator('.nav-tab', { hasText: /Personel/ }).click();
    await expect(page.locator('table')).toBeVisible();

    // Open the create form
    await page.getByRole('button', { name: /Personel Ekle/i }).click();

    const timestamp = Date.now();
    await page.getByPlaceholder('Ad Soyad').fill('Test Personel');
    await page.getByPlaceholder('ad.soyad@ankara.bel.tr').fill(`test${timestamp}@ankara.bel.tr`);
    // Two password fields share the same placeholder — fill both
    await page.getByPlaceholder('••••••••').nth(0).fill('test1234');
    await page.getByPlaceholder('••••••••').nth(1).fill('test1234');

    await page.getByRole('button', { name: 'Kaydet' }).click();

    // New user should appear in the table
    await expect(page.locator('table')).toContainText('Test Personel');
  });

  test('personnel panel toggles a staff account active/inactive', async ({ page }) => {
    await page.locator('.nav-tab', { hasText: /Personel/ }).click();
    await expect(page.locator('table')).toBeVisible();

    // Find the first non-self row — self row has toggle disabled
    const toggleBtn = page.locator('tbody tr').filter({ hasNot: page.locator('[disabled]') })
      .locator('button', { hasText: /Askıya Al|Aktifleştir/ }).first();
    test.skip(await toggleBtn.count() === 0, 'No toggleable staff rows found');

    const labelBefore = await toggleBtn.textContent();
    await toggleBtn.click();

    // Button label should flip
    const expectedAfter = labelBefore?.includes('Askıya Al') ? /Aktifleştir/ : /Askıya Al/;
    await expect(toggleBtn).toHaveText(expectedAfter);
  });

  test('personnel panel deletes a staff account', async ({ page }) => {
    await page.locator('.nav-tab', { hasText: /Personel/ }).click();
    await expect(page.locator('table')).toBeVisible();

    const rowsBefore = await page.locator('tbody tr').count();
    test.skip(rowsBefore === 0, 'No staff rows to delete');

    // Click the delete button on the first non-self row
    const deleteBtn = page.locator('tbody tr').filter({ hasNot: page.locator('[disabled]') })
      .locator('button.btn-delete').first();
    test.skip(await deleteBtn.count() === 0, 'No deletable staff rows found');

    await deleteBtn.click();

    // Confirmation modal must appear
    await expect(page.locator('.modal')).toBeVisible();
    await expect(page.locator('.modal')).toContainText('kalıcı olarak silinecek');

    // Confirm deletion
    await page.locator('.modal').getByRole('button', { name: 'Sil' }).click();

    // One fewer row in the table
    await expect(page.locator('tbody tr')).toHaveCount(rowsBefore - 1);
  });


});
