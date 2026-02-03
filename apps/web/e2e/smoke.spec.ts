import { test, expect } from '@playwright/test';

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
        recognition_moment: 'Taking time for self-reflection is valuable.',
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
    await page.route('**/api/llm/anthropic', async (route) => {
      const request = route.request();
      const postData = request.postDataJSON();

      // Check if this is a summary request (contains "Summarize this session")
      const isSummaryRequest = postData?.messages?.some(
        (msg: { content: string }) => msg.content?.includes('Summarize this session'),
      );

      // Check if this is a token validation request (contains "Reply with OK")
      const isValidationRequest = postData?.messages?.some(
        (msg: { content: string }) => msg.content?.includes('Reply with OK'),
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

      route.fulfill({
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
    await page.getByRole('button', { name: /begin session/i }).click();

    // Step 5: Should navigate to chat
    await expect(page).toHaveURL(/\/chat$/);

    // Step 6: Wait for LLM key input to appear (BYOK flow)
    // The placeholder is "sk-ant-oat..."
    const tokenInput = page.getByPlaceholder('sk-ant-oat...');
    await expect(tokenInput).toBeVisible({ timeout: 15000 });

    // Enter a mock OAuth token (sk-ant-oat prefix required)
    await tokenInput.fill('sk-ant-oat-mock-test-token-12345');
    await page.getByRole('button', { name: /save/i }).click();

    // Step 7: Wait for message input to be enabled (LLM key verified)
    const messageInput = page.getByLabel('Message input');
    await expect(messageInput).toBeEnabled({ timeout: 15000 });

    // Step 8: Send a message
    await messageInput.fill('Hello, this is a test message.');
    await page.keyboard.press('Enter');

    // Step 9: Verify user message appears
    await expect(page.getByText('Hello, this is a test message.')).toBeVisible();

    // Step 10: Verify coach response appears (from mock)
    await expect(page.getByText("I'm here to support you")).toBeVisible({ timeout: 10000 });

    // Step 11: End the session
    await page.getByRole('button', { name: 'End Session' }).click();

    // Step 12: Confirm end session in dialog (lowercase "session" to distinguish from header button)
    await page.getByRole('button', { name: 'End session', exact: true }).click();

    // Step 13: Verify session closure UI appears
    await expect(page.getByText(/session complete/i)).toBeVisible({ timeout: 15000 });

    // Step 14: Verify recognition moment from summary is displayed
    await expect(page.getByText(/self-reflection/i)).toBeVisible({ timeout: 10000 });
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
