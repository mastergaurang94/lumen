import { test, expect } from '@playwright/test';

test('vault smoke flow', async ({ page }) => {
  // Covers setup, encrypted write, lock/unlock, and resume.
  await page.goto('/setup');

  await page.locator('#passphrase').fill('correct-horse-battery-staple');
  await page.locator('#confirm').fill('correct-horse-battery-staple');
  await page.getByRole('button', { name: 'Continue' }).click();

  await expect(page).toHaveURL(/\/session$/);
  await page.getByRole('button', { name: /begin session/i }).click();

  await expect(page).toHaveURL(/\/chat$/);
  const input = page.getByLabel('Message input');
  await expect(input).toBeEnabled({ timeout: 15000 });

  await input.fill('Testing encrypted storage.');
  await page.keyboard.press('Enter');

  await expect(page.getByText('Testing encrypted storage.')).toBeVisible();
  await page.waitForTimeout(1500);

  await page.getByRole('button', { name: 'Open menu' }).click();
  await page.getByRole('button', { name: 'Lock vault' }).click();

  await expect(page).toHaveURL(/\/unlock$/);
  await page.locator('#passphrase').fill('correct-horse-battery-staple');
  await page.getByRole('button', { name: 'Unlock' }).click();

  await expect(page).toHaveURL(/\/session$/);
  await page.getByRole('button', { name: /begin session/i }).click();

  await expect(page).toHaveURL(/\/chat$/);
  await expect(page.getByText('Testing encrypted storage.')).toBeVisible();
});
