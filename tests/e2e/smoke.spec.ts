import { expect, test } from '@playwright/test';

test('home exposes the PHEVO shell and primary navigation', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('link', { name: 'Trang chủ PHEVO' })).toBeVisible();
  await expect(page.locator('a[href="/kham-pha"]').first()).toBeVisible();
  await expect(page.locator('body')).toContainText('PHEVO');
});

test('home navigation reaches discovery', async ({ page }) => {
  await page.goto('/');
  const discoveryLink = page.locator('a[href="/kham-pha"]').first();

  await expect(discoveryLink).toBeVisible();
  await expect(discoveryLink).toBeEnabled();
  await discoveryLink.click();

  await expect(page).toHaveURL(/\/kham-pha(?:\?.*)?$/);
  await expect(page.getByRole('link', { name: 'Trang chủ PHEVO' })).toBeVisible();
});

test('search entry point can navigate to the search route', async ({ page }) => {
  await page.goto('/');
  const searchInput = page.locator('input[aria-label="Tìm kiếm phim"]').first();

  await expect(searchInput).toBeVisible();
  await expect(searchInput).toBeEnabled();
  await searchInput.fill('qa-smoke');
  await searchInput.press('Enter');

  await expect(page).toHaveURL(/\/tim-kiem\?keyword=qa-smoke$/);
});

test('login page shows PHEVO branding and safe guest access', async ({ page }) => {
  await page.goto('/dang-nhap');

  await expect(page.getByText('PHEVO', { exact: true }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: /Google/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /không cần đăng nhập/i })).toBeVisible();
});

test('guest personal routes render without requiring cloud data', async ({ page }) => {
  for (const route of ['/yeu-thich', '/lich-su']) {
    const response = await page.goto(route);

    expect(response?.ok()).toBe(true);
    await expect(page.getByRole('link', { name: 'Trang chủ PHEVO' })).toBeVisible();
  }
});
