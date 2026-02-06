import { test, expect } from '@playwright/test';

function buildSseResponse(text: string) {
  return [
    'event: message_start',
    `data: ${JSON.stringify({ message: { usage: { input_tokens: 10 } } })}`,
    '',
    'event: content_block_start',
    `data: ${JSON.stringify({ content_block: { text } })}`,
    '',
    'event: message_delta',
    `data: ${JSON.stringify({ usage: { output_tokens: 2 } })}`,
    '',
    'data: [DONE]',
    '',
  ].join('\n');
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { __E2E_SKIP_LLM_VALIDATION__?: boolean }).__E2E_SKIP_LLM_VALIDATION__ =
      true;
  });
  // Clear IndexedDB to ensure test isolation
  await page.goto('/');
  await page.evaluate(() => {
    return new Promise<void>((resolve) => {
      const req = indexedDB.deleteDatabase('lumen-db');
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
      req.onblocked = () => resolve();
    });
  });

  // Mock auth session check - return authenticated
  await page.route('**/v1/auth/session', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ authenticated: true, user_id: 'test-user-123' }),
    });
  });

  // Mock session metadata endpoints
  await page.route('**/v1/sessions/start', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ session_id: 'test-session-123' }),
    });
  });

  await page.route('**/v1/sessions/end', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true }),
    });
  });

  // Mock LLM API - return SSE for streams, JSON otherwise
  await page.route('**/api/llm/**', async (route) => {
    let postData: { stream?: boolean } | null = null;
    try {
      postData = route.request().postDataJSON();
    } catch {
      postData = null;
    }
    if (postData?.stream) {
      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body: buildSseResponse('OK'),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'msg_mock',
        type: 'message',
        role: 'assistant',
        content: [{ type: 'text', text: 'OK' }],
        model: 'claude-sonnet-4-20250514',
        stop_reason: 'end_turn',
        usage: { input_tokens: 10, output_tokens: 2 },
      }),
    });
  });
});

test('vault smoke flow', async ({ page }) => {
  // Covers setup, encrypted write, lock/unlock, and resume.
  await page.goto('/setup');

  await page.locator('#passphrase').fill('correct-horse-battery-staple');
  await page.locator('#confirm').fill('correct-horse-battery-staple');
  await page.getByRole('button', { name: 'Continue' }).click();

  await expect(page).toHaveURL(/\/session$/);
  await page.getByRole('button', { name: /let's go|continue/i }).click();

  await expect(page).toHaveURL(/\/chat$/);

  // Enter OAuth token to enable message input
  const tokenInput = page.getByPlaceholder('sk-ant-oat...');
  await expect(tokenInput).toBeVisible({ timeout: 15000 });
  await tokenInput.fill('sk-ant-oat-mock-test-token');
  await page.getByRole('button', { name: /save/i }).click();

  const input = page.getByLabel('Message input');
  await expect(input).toBeEnabled({ timeout: 15000 });

  await input.fill('Testing encrypted storage.');
  await page.keyboard.press('Enter');

  await expect(page.getByText('Testing encrypted storage.')).toBeVisible();
  await page.waitForTimeout(1500);

  // Lock the vault - opens a confirmation dialog
  await page.getByRole('button', { name: 'Open menu' }).click();
  await page.getByRole('button', { name: 'Lock vault' }).first().click();

  // Confirm in the dialog
  await page.getByRole('button', { name: 'Lock vault' }).last().click();

  await expect(page).toHaveURL(/\/unlock$/, { timeout: 10000 });
  await page.locator('#passphrase').fill('correct-horse-battery-staple');
  await page.getByRole('button', { name: 'Unlock' }).click();

  await expect(page).toHaveURL(/\/session$/);
  // After unlock with existing session, button says "Continue"
  await page.getByRole('button', { name: /let's go|continue/i }).click();

  await expect(page).toHaveURL(/\/chat$/);
  await expect(page.getByText('Testing encrypted storage.')).toBeVisible();
});
