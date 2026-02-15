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

/**
 * Full E2E smoke test covering the complete user journey:
 * login → setup passphrase → start session → send message → receive response → end session
 *
 * Uses Playwright route interception to mock:
 * - Auth API (magic link request/verify)
 * - LLM API (Anthropic proxy)
 */

// Mock LLM response matching Anthropic's message format
const mockLlmResponse = {
  id: 'msg_mock_123',
  type: 'message',
  role: 'assistant',
  content: [
    {
      type: 'text',
      text: "Hello! I'm here to support you. What's on your mind today?",
    },
  ],
  model: 'claude-sonnet-4-20250514',
  stop_reason: 'end_turn',
  usage: {
    input_tokens: 150,
    output_tokens: 25,
  },
};

// Mock session summary response
const mockSummaryResponse = {
  id: 'msg_mock_summary',
  type: 'message',
  role: 'assistant',
  content: [
    {
      type: 'text',
      text: JSON.stringify({
        summary_text: 'This was a brief test session exploring initial thoughts.',
        parting_words: 'Taking time for self-reflection is valuable.',
        action_steps: ['Continue practicing mindfulness'],
        open_threads: [],
      }),
    },
  ],
  model: 'claude-sonnet-4-20250514',
  stop_reason: 'end_turn',
  usage: {
    input_tokens: 300,
    output_tokens: 100,
  },
};

test.describe('Smoke Test', () => {
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

    // Mock magic link request
    await page.route('**/v1/auth/request-link', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'Magic link sent',
          magic_link: 'http://localhost:3000/login/callback?token=test-token',
        }),
      });
    });

    // Mock magic link verification
    await page.route('**/v1/auth/verify', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, user_id: 'test-user-123' }),
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

    // Mock LLM API calls - detect request type by checking the message content
    await page.route('**/api/llm/**', async (route) => {
      const request = route.request();
      let postData: {
        stream?: boolean;
        messages?: Array<{ content?: string }>;
      } | null = null;
      try {
        postData = request.postDataJSON();
      } catch {
        postData = null;
      }

      if (postData?.stream) {
        const firstMessage = postData?.messages?.[0]?.content ?? '';
        const streamText = firstMessage.includes('Begin the conversation')
          ? mockLlmResponse.content[0].text
          : mockLlmResponse.content[0].text;
        await route.fulfill({
          status: 200,
          contentType: 'text/event-stream',
          body: buildSseResponse(streamText),
        });
        return;
      }

      // Check if this is a summary request (contains JSON output instruction)
      const isSummaryRequest = postData?.messages?.some(
        (msg: { content?: string }) =>
          msg.content?.includes('Output JSON only') ||
          msg.content?.includes('Generate a session summary'),
      );

      // Check if this is a token validation request (contains "Reply with OK")
      const isValidationRequest = postData?.messages?.some((msg: { content?: string }) =>
        msg.content?.includes('Reply with OK'),
      );

      let response;
      if (isSummaryRequest) {
        response = mockSummaryResponse;
      } else if (isValidationRequest) {
        // Simple OK response for validation
        response = {
          ...mockLlmResponse,
          content: [{ type: 'text', text: 'OK' }],
          usage: { input_tokens: 10, output_tokens: 2 },
        };
      } else {
        // Regular conversation
        response = mockLlmResponse;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(response),
      });
    });
  });

  test('complete session flow: setup → chat → end session', async ({ page }) => {
    // Step 1: Start at setup page (simulating first-time user after auth)
    await page.goto('/setup');

    // Step 2: Set up passphrase
    await page.locator('#passphrase').fill('test-passphrase-secure-123');
    await page.locator('#confirm').fill('test-passphrase-secure-123');
    await page.getByRole('button', { name: 'Continue' }).click();

    // Step 3: Should navigate to session page
    await expect(page).toHaveURL(/\/session$/);

    // Step 4: Begin session
    await page.getByRole('button', { name: /let's go|continue/i }).click();

    // Step 5: Should navigate to chat
    await expect(page).toHaveURL(/\/chat$/);

    // Step 6: Support both provider modes:
    // - BYOK: token input is shown and must be saved.
    // - Server-managed: chat input is immediately available.
    const tokenInput = page.getByPlaceholder('sk-ant-oat...');
    const messageInput = page.getByLabel('Message input');
    const firstVisible = await Promise.race([
      tokenInput.waitFor({ state: 'visible', timeout: 30000 }).then(() => 'token' as const),
      messageInput.waitFor({ state: 'visible', timeout: 30000 }).then(() => 'input' as const),
    ]);

    if (firstVisible === 'token') {
      await tokenInput.fill('sk-ant-oat-mock-test-token-12345');
      await page.getByRole('button', { name: /save/i }).click();
    }

    // Step 7: Wait for message input to be enabled (LLM key verified)
    await expect(messageInput).toBeEnabled({ timeout: 15000 });

    // Step 8: Send a message
    await messageInput.fill('Hello, this is a test message.');
    await page.keyboard.press('Enter');

    // Step 9: Verify user message appears
    await expect(page.getByText('Hello, this is a test message.')).toBeVisible();

    // Step 10: Verify Lumen response appears (from mock)
    await expect(page.getByText("I'm here to support you")).toBeVisible({ timeout: 10000 });

    // Step 11: End the session
    await page.getByRole('button', { name: /wrap up/i }).click();

    // Step 12: Confirm end session in dialog
    await page
      .getByRole('alertdialog')
      .getByRole('button', { name: /^wrap up$/i })
      .click();

    // Step 13: Verify session closure UI appears
    await expect(page.getByText(/until next time/i)).toBeVisible({ timeout: 15000 });

    // Step 14: Summary rendering can be asynchronous; closure UI is the stable signal here.
  });

  test('handles returning user unlock flow', async ({ page }) => {
    // First, set up the vault
    await page.goto('/setup');
    await page.locator('#passphrase').fill('returning-user-passphrase');
    await page.locator('#confirm').fill('returning-user-passphrase');
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page).toHaveURL(/\/session$/);

    // Lock the vault via sidebar
    await page.getByRole('button', { name: 'Open menu' }).click();

    // Click "Lock vault" to open the confirmation dialog
    await page.getByRole('button', { name: 'Lock vault' }).first().click();

    // Confirm in the dialog (there are two "Lock vault" buttons - one in sidebar, one in dialog)
    await page.getByRole('button', { name: 'Lock vault' }).last().click();

    // Should redirect to unlock page
    await expect(page).toHaveURL(/\/unlock$/, { timeout: 10000 });

    // Unlock with correct passphrase
    await page.locator('#passphrase').fill('returning-user-passphrase');
    await page.getByRole('button', { name: 'Unlock' }).click();

    // Should return to session page
    await expect(page).toHaveURL(/\/session$/);
  });
});
