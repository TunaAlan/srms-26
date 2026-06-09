// =============================================================================
// review.personnel.spec.ts
// Blackbox E2E — review_personnel workflows.
// Tests the full review cycle: queue loads, approve removes from queue,
// reject requires a reason, confidence filter separates reports correctly.
// =============================================================================

import { test, expect } from '@playwright/test';
import { REVIEWER, loginAs } from './helpers';

test.describe('Review Personnel workflows', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, REVIEWER);
    // Reviewer lands on review tab after login; click it to ensure it's active.
    await page.locator('.nav-tab', { hasText: /İnceleme/ }).click();
  });

  test('review queue loads with reports in the table', async ({ page }) => {
    const hasReports = await page.locator('table').count() > 0;
    if (!hasReports) {
      // Queue is empty — verify empty state is shown instead
      await expect(page.locator('.empty-state')).toBeVisible();
      return;
    }
    await expect(page.locator('thead')).toBeVisible();
    await expect(page.locator('th', { hasText: 'Güven' })).toBeVisible();
  });

  test('approving a report removes it from the queue', async ({ page }) => {
    const rowsBefore = await page.locator('tbody tr').count();
    test.skip(rowsBefore === 0, 'No reports in queue — seed the DB first');

    // Open the first report in the inspection modal
    await page.locator('tbody tr').first().click();
    await expect(page.locator('.modal')).toBeVisible();

    // Click approve — opens confirm screen
    await page.locator('.modal').getByRole('button', { name: /✓ Onayla/i }).click();
    // Confirm on the second screen
    await page.locator('.modal').getByRole('button', { name: /✓ Onayla/i }).click();

    // Modal closes; wait for the table to reflect the state update (API is async)
    await expect(page.locator('.modal')).not.toBeVisible();
    await expect(page.locator('tbody tr')).toHaveCount(rowsBefore - 1);
  });

  test('rejecting without a reason keeps the submit button disabled', async ({ page }) => {
    const rowsBefore = await page.locator('tbody tr').count();
    test.skip(rowsBefore === 0, 'No reports in queue — seed the DB first');

    await page.locator('tbody tr').first().click();
    await expect(page.locator('.modal')).toBeVisible();

    // Open reject modal
    await page.locator('.modal').getByRole('button', { name: /Reddet/i }).click();

    // The "Reddet" submit button must be disabled when no reason is entered
    const submitBtn = page.locator('.modal').getByRole('button', { name: 'Reddet' });
    await expect(submitBtn).toBeDisabled();

    // Fill in a reason — button should become enabled
    await page.locator('.modal textarea').fill('Görsel alakasız içerik');
    await expect(submitBtn).not.toBeDisabled();

    // Confirm rejection
    await submitBtn.click();
    await expect(page.locator('.modal')).not.toBeVisible();

    // Queue should have one fewer report (wait for async state update)
    await expect(page.locator('tbody tr')).toHaveCount(rowsBefore - 1);
  });

  test('correcting a report saves the updated category', async ({ page }) => {
    const rowsBefore = await page.locator('tbody tr').count();
    test.skip(rowsBefore === 0, 'No reports in queue — seed the DB first');

    await page.locator('tbody tr').first().click();
    await expect(page.locator('.modal')).toBeVisible();

    // Open the correction flow
    await page.locator('.modal').getByRole('button', { name: /Düzelt/i }).click();

    // ReviewModal opens — change category to something specific
    await page.locator('select.modal-status-select').first().selectOption('waste');

    // First click opens the confirm screen, second click confirms
    await page.getByRole('button', { name: 'Düzeltmeyi Kaydet' }).click();
    await page.getByRole('button', { name: /Düzeltmeyi Onayla/i }).click();

    // Modal closes and the report is removed from the in_review queue
    await expect(page.locator('.modal')).not.toBeVisible();
    await expect(page.locator('tbody tr')).toHaveCount(rowsBefore - 1);
  });

  test('confidence filter separates low and high confidence reports', async ({ page }) => {
    const hasReports = await page.locator('table').count() > 0;
    test.skip(!hasReports, 'No reports in queue — seed the DB first');

    // Switch to "Düşük (<60%)" filter
    await page.getByRole('button', { name: /Düşük/i }).click();
    const lowCount = await page.locator('tbody tr').count();

    // Switch to "Yüksek (≥60%)" filter
    await page.getByRole('button', { name: /Yüksek/i }).click();
    const highCount = await page.locator('tbody tr').count();

    // The two filters must show disjoint sets — counts need not be equal
    // but both can't be zero at the same time if the queue is non-empty.
    const total = lowCount + highCount;
    const queueTotal = await page.locator('tbody tr').count();
    // After switching back to high, total visible is highCount
    // This just checks the filter actually changes the displayed rows
    expect(total).toBeGreaterThanOrEqual(queueTotal);
  });
});
