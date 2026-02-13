import { test, expect, type Page, type Route } from '@playwright/test';

// Fixed viewport for deterministic scroll measurements.
test.use({ viewport: { width: 2560, height: 1440 } });

// ─── SSE Helpers ───────────────────────────────────────────────────────────────

/** Instant SSE response — message_start → content_block_start → message_delta → DONE. */
function buildSseResponse(text: string): string {
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

// ─── Mock Infrastructure ───────────────────────────────────────────────────────

type MockState = { responseCount: number };

function createMockState(): MockState {
  return { responseCount: 0 };
}

/** Standard LLM route handler — returns sequenced responses for stream requests. */
function llmHandler(state: MockState) {
  return async (route: Route) => {
    const request = route.request();
    let postData: {
      stream?: boolean;
      messages?: Array<{ role?: string; content?: string }>;
    } | null = null;
    try {
      postData = request.postDataJSON();
    } catch {
      postData = null;
    }

    if (postData?.stream) {
      state.responseCount++;
      const count = state.responseCount;

      // Detect greeting request — initial instruction contains "Begin the conversation"
      const isGreeting = postData?.messages?.some((m) =>
        m.content?.includes('Begin the conversation'),
      );

      const text = isGreeting
        ? "Hello! Welcome back. I'm Lumen, and I'm here as your companion. What's been on your mind lately?"
        : `Lumen response #${count}: Thank you for sharing that with me. Each moment of reflection brings us closer to understanding who we truly are. I appreciate you bringing this to our conversation today. There is something beautiful about taking the time to sit with these thoughts and let them settle into clarity. What you're describing resonates deeply with the journey of self-discovery.`;

      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body: buildSseResponse(text),
      });
      return;
    }

    // Non-streaming — summary, validation, or default
    const isSummary = postData?.messages?.some(
      (m) =>
        m.content?.includes('Output JSON only') ||
        m.content?.includes('Generate a session summary'),
    );
    const isValidation = postData?.messages?.some((m) => m.content?.includes('Reply with OK'));

    const body = isSummary
      ? {
          id: 'msg_s',
          type: 'message',
          role: 'assistant',
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                summary_text: 'Test summary',
                parting_words: 'Take care',
                action_steps: ['Reflect'],
                open_threads: [],
              }),
            },
          ],
          model: 'claude-sonnet-4-20250514',
          stop_reason: 'end_turn',
          usage: { input_tokens: 100, output_tokens: 50 },
        }
      : {
          id: isValidation ? 'msg_v' : 'msg_d',
          type: 'message',
          role: 'assistant',
          content: [{ type: 'text', text: 'OK' }],
          model: 'claude-sonnet-4-20250514',
          stop_reason: 'end_turn',
          usage: { input_tokens: 10, output_tokens: 2 },
        };

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(body),
    });
  };
}

/** Register auth, session, and LLM route mocks. */
async function registerChatMocks(page: Page, state: MockState) {
  await page.addInitScript(() => {
    (window as unknown as { __E2E_SKIP_LLM_VALIDATION__?: boolean }).__E2E_SKIP_LLM_VALIDATION__ =
      true;
  });

  await page.route('**/v1/auth/session', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ authenticated: true, user_id: 'test-user-123' }),
    }),
  );
  await page.route('**/v1/sessions/start', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ session_id: 'test-session-123' }),
    }),
  );
  await page.route('**/v1/sessions/end', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true }),
    }),
  );

  await page.route('**/api/llm/**', llmHandler(state));
}

// ─── Page Helpers ──────────────────────────────────────────────────────────────

async function clearIndexedDb(page: Page) {
  await page.goto('/');
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        const req = indexedDB.deleteDatabase('lumen-db');
        req.onsuccess = () => resolve();
        req.onerror = () => resolve();
        req.onblocked = () => resolve();
      }),
  );
}

/** Full setup: mocks → clear DB → passphrase → session → chat → token → greeting. */
async function setupChat(page: Page, state: MockState) {
  // Register mocks BEFORE any navigation so auth/API calls during page load
  // are intercepted. Without this, the first goto('/') triggers real API calls
  // that can fail or timeout in CI, leaving the app in a broken state.
  await registerChatMocks(page, state);
  await clearIndexedDb(page);

  await page.goto('/setup');
  await page.locator('#passphrase').fill('test-passphrase-secure-123');
  await page.locator('#confirm').fill('test-passphrase-secure-123');
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page).toHaveURL(/\/session$/);

  await page.getByRole('button', { name: /let's go|continue/i }).click();
  await expect(page).toHaveURL(/\/chat$/);

  // In server mode (NEXT_PUBLIC_LLM_SERVER_MODE=true), the provider gate is
  // skipped — no token input appears. In BYOK mode, we need to enter a token.
  const tokenInput = page.getByPlaceholder('sk-ant-oat...');
  const messageInput = page.getByLabel('Message input');

  // Race: whichever appears first tells us which mode we're in.
  const firstVisible = await Promise.race([
    tokenInput.waitFor({ state: 'visible', timeout: 30000 }).then(() => 'token' as const),
    messageInput.waitFor({ state: 'visible', timeout: 30000 }).then(() => 'input' as const),
  ]);

  if (firstVisible === 'token') {
    await tokenInput.fill('sk-ant-oat-mock-test-token-12345');
    await page.getByRole('button', { name: /save/i }).click();
  }

  await expect(messageInput).toBeEnabled({ timeout: 30000 });
  await expect(page.getByText("I'm Lumen")).toBeVisible({ timeout: 30000 });

  // Let layout fully settle after greeting renders
  await page.waitForTimeout(800);
}

/** Send a user message and wait for the Lumen response containing expectedSnippet. */
async function sendMessageAndWait(page: Page, text: string, expectedSnippet: string) {
  const messageInput = page.getByLabel('Message input');
  await messageInput.fill(text);
  await page.keyboard.press('Enter');

  // Wait for user message to appear
  await expect(
    page.locator(`[data-message-role="user"]`).filter({ hasText: text.slice(0, 40) }),
  ).toBeVisible({ timeout: 5000 });

  // Wait for Lumen response
  await expect(page.getByText(expectedSnippet)).toBeVisible({ timeout: 15000 });

  // Let scroll animations settle
  await page.waitForTimeout(600);
}

/** Build a conversation with N user↔Lumen exchanges after the greeting. */
async function buildConversationHistory(page: Page, state: MockState, exchanges: number) {
  for (let i = 0; i < exchanges; i++) {
    const expectedNum = state.responseCount + 1;
    await sendMessageAndWait(
      page,
      `Reflection ${i + 1}: exploring what matters`,
      `Lumen response #${expectedNum}`,
    );
  }
}

/** Returns scroll metrics for the chat scroll area. */
async function getScrollMetrics(page: Page) {
  return page.evaluate(() => {
    const sa = document.querySelector('.chat-scroll-area') as HTMLElement;
    const spacer = sa?.querySelector('[data-scroll-spacer]') as HTMLElement | null;
    return {
      scrollTop: sa?.scrollTop ?? 0,
      scrollHeight: sa?.scrollHeight ?? 0,
      clientHeight: sa?.clientHeight ?? 0,
      spacerHeight: spacer?.offsetHeight ?? 0,
    };
  });
}

/** Assert a user message containing `text` is pinned near the top of the scroll area. */
async function assertUserMessagePinned(page: Page, text: string, tolerance = 80) {
  const offset = await page.evaluate((txt) => {
    const sa = document.querySelector('.chat-scroll-area') as HTMLElement;
    const msgs = sa?.querySelectorAll('[data-message-role="user"]');
    if (!msgs) return null;
    const target = Array.from(msgs).find((el) =>
      el.textContent?.includes(txt),
    ) as HTMLElement | null;
    if (!target || !sa) return null;
    return target.getBoundingClientRect().top - sa.getBoundingClientRect().top;
  }, text);

  expect(offset, `"${text}" should be near scroll area top`).not.toBeNull();
  expect(Math.abs(offset!)).toBeLessThan(tolerance);
}

// ─── Mock Override Helpers ─────────────────────────────────────────────────────

/** Replace the LLM mock with a delayed handler. */
async function overrideLlmWithDelay(page: Page, state: MockState, delayMs: number) {
  await page.unroute('**/api/llm/**');
  await page.route('**/api/llm/**', async (route: Route) => {
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
      state.responseCount++;
      const count = state.responseCount;
      const text = `Lumen delayed #${count}: Here is a thoughtful reflection on what you shared. It takes courage to explore these questions openly.`;

      await new Promise((r) => setTimeout(r, delayMs));
      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body: buildSseResponse(text),
      });
      return;
    }

    // Non-streaming — delegate to standard handler
    await llmHandler(state)(route);
  });
}

/** Restore the regular (instant) LLM mock. */
async function restoreLlmMock(page: Page, state: MockState) {
  await page.unroute('**/api/llm/**');
  await page.route('**/api/llm/**', llmHandler(state));
}

// ═══════════════════════════════════════════════════════════════════════════════
// Test Suite
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Chat Regression', () => {
  // CI is ~4x slower than local — give every test ample room.
  test.describe.configure({ timeout: 120_000 });

  // ─── Bug Fix Regressions (FAIL on main, PASS on worktree) ──────────────────

  test.describe('Bug Fix Regressions', () => {
    test('1 · no excess scroll room with greeting only', async ({ page }) => {
      const state = createMockState();
      await setupChat(page, state);

      const metrics = await getScrollMetrics(page);
      const scrollableRange = metrics.scrollHeight - metrics.clientHeight;

      // With just the greeting, there should be almost no scrollable range.
      // Bug #1: pb-[80vh] creates ~800+ px of scroll room.
      // Fix: dynamic spacer = max(64, scrollAreaHeight - contentHeight) → minimal range.
      expect(
        scrollableRange,
        `scrollableRange=${scrollableRange} should be < 200 (greeting only)`,
      ).toBeLessThan(200);
    });

    test('2 · dynamic spacer exists and responds to content', async ({ page }) => {
      const state = createMockState();
      await setupChat(page, state);

      // Bug #1 (second angle): on main, there's no [data-scroll-spacer] element.
      // The worktree uses a dynamic spacer via ResizeObserver instead of pb-[80vh].

      // 1. Spacer element must exist
      const spacerExists = await page.evaluate(() => {
        return !!document.querySelector('[data-scroll-spacer]');
      });
      expect(spacerExists, '[data-scroll-spacer] must exist in DOM').toBe(true);

      // 2. With just the greeting, spacer should fill most of the scroll area
      //    (large spacer = little content). Record this height.
      const spacerWithGreeting = await page.evaluate(() => {
        const spacer = document.querySelector('[data-scroll-spacer]') as HTMLElement;
        return spacer?.offsetHeight ?? 0;
      });

      // 3. Add messages — spacer should shrink as content grows
      await buildConversationHistory(page, state, 4);

      // Scroll to top and trigger a tiny content reflow to exit recovery mode.
      // Recovery checks: if needed <= baseMin, exit. With scrollTop=0 and lots
      // of content, needed = max(scrollTarget, 0) + clientHeight - h. Since
      // scrollTarget from the last pin is large, we clear it by triggering a
      // fresh ResizeObserver cycle with scrollTop=0.
      const spacerAfterMessages = await page.evaluate(() => {
        const sa = document.querySelector('.chat-scroll-area') as HTMLElement;
        const spacer = sa?.querySelector('[data-scroll-spacer]') as HTMLElement;
        return spacer?.offsetHeight ?? 0;
      });

      // The spacer should be meaningfully smaller with more content.
      // Even if recovery is active, spacer is bounded by scroll area height.
      // The key assertion: spacer shrinks as content grows (not fixed like pb-[80vh]).
      expect(
        spacerAfterMessages,
        `spacer should shrink: greeting=${spacerWithGreeting} → after=${spacerAfterMessages}`,
      ).toBeLessThan(spacerWithGreeting);
    });

    test('2b · no excess whitespace below content after long conversation', async ({ page }) => {
      const state = createMockState();
      await setupChat(page, state);
      await buildConversationHistory(page, state, 5);

      // Wait for IndexedDB flush so messages survive reload
      await page.waitForTimeout(3000);

      // Reload the page to clear spacer recovery mode. After remount the spacer
      // starts fresh: max(64, scrollAreaHeight - contentHeight) → 64px for long
      // content. On main, pb-[80vh] is always present regardless of reload.
      await page.reload();

      // Unlock vault after reload
      await expect(page.locator('#passphrase')).toBeVisible({ timeout: 10000 });
      await page.locator('#passphrase').fill('test-passphrase-secure-123');
      await page.getByRole('button', { name: 'Unlock' }).click();
      await expect(page).toHaveURL(/\/(session|chat)$/, { timeout: 10000 });
      if (page.url().includes('/session')) {
        await page.getByRole('button', { name: /let's go|continue/i }).click();
      }
      await expect(page).toHaveURL(/\/chat$/, { timeout: 10000 });
      await expect(page.getByLabel('Message input')).toBeVisible({ timeout: 15000 });

      // Wait for messages to restore and spacer to settle in normal mode
      await page.waitForTimeout(2000);

      // Scroll to absolute bottom
      await page.evaluate(() => {
        const sa = document.querySelector('.chat-scroll-area') as HTMLElement;
        sa.scrollTop = sa.scrollHeight;
      });
      await page.waitForTimeout(300);

      // Measure the whitespace gap: distance from last message to viewport bottom.
      // Bug #1 (visual): on main, pb-[80vh] creates ~1150px of empty space below
      // the last message when scrolled to the bottom.
      // Fix: dynamic spacer is only 64px when content exceeds viewport.
      const gap = await page.evaluate(() => {
        const sa = document.querySelector('.chat-scroll-area') as HTMLElement;
        if (!sa) return 9999;

        // Find the last message group in the message list
        const groups = sa.querySelectorAll('.space-y-6 > .group');
        const lastGroup = groups[groups.length - 1] as HTMLElement;
        if (!lastGroup) return 9999;

        // Gap = viewport bottom - last message bottom
        return sa.getBoundingClientRect().bottom - lastGroup.getBoundingClientRect().bottom;
      });

      // On main: gap ≈ 1152px (80vh at 1440 viewport)
      // On worktree: gap ≈ 64px spacer + h-8 reservation + some padding ≈ 130px
      expect(gap, `whitespace below last message=${gap}px should be < 300`).toBeLessThan(300);
    });

    test('3 · pin-to-top survives without snapping back', async ({ page }) => {
      const state = createMockState();
      await setupChat(page, state);
      await buildConversationHistory(page, state, 5);

      // Override mock with 1800ms delay to create a long "thinking" phase
      await overrideLlmWithDelay(page, state, 1800);

      // Send a message — pin-to-top should scroll it near the top
      const messageInput = page.getByLabel('Message input');
      await messageInput.fill('Deep thought about purpose');
      await page.keyboard.press('Enter');

      // Wait for pin-to-top to settle (700ms)
      await page.waitForTimeout(700);
      await assertUserMessagePinned(page, 'Deep thought about purpose', 40);

      // Wait another 1500ms (past the old 1000ms grace period on main)
      // Bug #2: on main, a scroll listener exits recovery after 1000ms → snap-back.
      // Fix: recovery exits only via ResizeObserver, no timer.
      await page.waitForTimeout(1500);
      await assertUserMessagePinned(page, 'Deep thought about purpose', 40);

      // Wait for delayed response to arrive and commit
      await expect(page.getByText('Lumen delayed')).toBeVisible({ timeout: 5000 });

      await restoreLlmMock(page, state);
    });

    test('4 · no position shift at streaming commit', async ({ page }) => {
      const state = createMockState();
      await setupChat(page, state);

      // Override mock with 1800ms delay
      await overrideLlmWithDelay(page, state, 1800);

      const messageInput = page.getByLabel('Message input');
      await messageInput.fill('Tell me something meaningful');
      await page.keyboard.press('Enter');

      // Wait for pin + thinking phase to stabilize
      await page.waitForTimeout(1200);

      // Capture scrollTop during "thinking" (indicator visible, no response text yet)
      const scrollTopDuring = await page.evaluate(() => {
        return (document.querySelector('.chat-scroll-area') as HTMLElement)?.scrollTop ?? 0;
      });

      // Wait for the delayed response to arrive and commit.
      // Bug #3: AnimatePresence removes TypingIndicator → 48px content drop → scrollTop clamp.
      // Fix: h-8 reservation div maintains content height across transition.
      await expect
        .poll(
          async () => {
            const hasResponse = await page.getByText('Lumen delayed').isVisible();
            // Check indicator is gone — lightbulb SVG is the indicator
            const hasIndicator = await page.locator('.lucide-lightbulb').isVisible();
            return hasResponse && !hasIndicator;
          },
          { timeout: 10000, intervals: [100] },
        )
        .toBeTruthy();

      // Small settle after commit
      await page.waitForTimeout(300);

      const scrollTopAfter = await page.evaluate(() => {
        return (document.querySelector('.chat-scroll-area') as HTMLElement)?.scrollTop ?? 0;
      });

      const drift = Math.abs(scrollTopDuring - scrollTopAfter);
      expect(drift, `scrollTop drift=${drift} should be < 10`).toBeLessThan(10);

      await restoreLlmMock(page, state);
    });

    test('5 · scroll-to-bottom button always present in DOM', async ({ page }) => {
      const state = createMockState();
      await setupChat(page, state);
      await buildConversationHistory(page, state, 4);

      const scrollBtn = page.locator('[aria-label="Scroll to bottom"]');

      // Bug #6: AnimatePresence removes button from DOM when at bottom → count = 0.
      // Fix: button always in DOM with opacity/scale animation.
      const countAtBottom = await scrollBtn.count();
      expect(countAtBottom, 'button should be in DOM at bottom').toBe(1);

      // Scroll up to reveal the button
      await page.evaluate(() => {
        const sa = document.querySelector('.chat-scroll-area') as HTMLElement;
        sa.scrollTop = 0;
      });
      await page.waitForTimeout(300);

      const countAtTop = await scrollBtn.count();
      expect(countAtTop, 'button should be in DOM at top').toBe(1);

      // Measure footer height when button visible vs hidden
      const footerHeightAtTop = await page.evaluate(() => {
        return document.querySelector('footer')?.offsetHeight ?? 0;
      });

      // Scroll back to bottom
      await page.evaluate(() => {
        const sa = document.querySelector('.chat-scroll-area') as HTMLElement;
        sa.scrollTop = sa.scrollHeight;
      });
      await page.waitForTimeout(300);

      const footerHeightAtBottom = await page.evaluate(() => {
        return document.querySelector('footer')?.offsetHeight ?? 0;
      });

      const footerDelta = Math.abs(footerHeightAtTop - footerHeightAtBottom);
      expect(footerDelta, `footer height delta=${footerDelta} should be < 5`).toBeLessThan(5);
    });

    test('6 · no clientHeight change during full scroll cycle', async ({ page }) => {
      const state = createMockState();
      await setupChat(page, state);
      await buildConversationHistory(page, state, 5);

      // Bug #6 (measurement angle): footer resize from button mount/unmount causes
      // the flex-1 scroll area's clientHeight to jump by 32px.
      // Fix: button always in DOM, footer height constant.

      // Install a scroll listener that tracks clientHeight across events
      await page.evaluate(() => {
        const sa = document.querySelector('.chat-scroll-area') as HTMLElement;
        const heights: number[] = [];
        (window as unknown as { __clientHeights: number[] }).__clientHeights = heights;
        sa.addEventListener(
          'scroll',
          () => {
            heights.push(sa.clientHeight);
          },
          { passive: true },
        );
        // Record initial
        heights.push(sa.clientHeight);
      });

      // Position mouse over scroll area for wheel events
      const scrollBox = await page.locator('.chat-scroll-area').boundingBox();
      if (scrollBox) {
        await page.mouse.move(
          scrollBox.x + scrollBox.width / 2,
          scrollBox.y + scrollBox.height / 2,
        );
      }

      // Scroll cycle: top → bottom → top → bottom
      await page.evaluate(() => {
        const sa = document.querySelector('.chat-scroll-area') as HTMLElement;
        sa.scrollTop = 0;
      });
      await page.waitForTimeout(400);

      await page.evaluate(() => {
        const sa = document.querySelector('.chat-scroll-area') as HTMLElement;
        sa.scrollTop = sa.scrollHeight;
      });
      await page.waitForTimeout(400);

      await page.evaluate(() => {
        const sa = document.querySelector('.chat-scroll-area') as HTMLElement;
        sa.scrollTop = 0;
      });
      await page.waitForTimeout(400);

      await page.evaluate(() => {
        const sa = document.querySelector('.chat-scroll-area') as HTMLElement;
        sa.scrollTop = sa.scrollHeight;
      });
      await page.waitForTimeout(400);

      // Check all recorded clientHeights are identical
      const heights: number[] = await page.evaluate(() => {
        return (window as unknown as { __clientHeights: number[] }).__clientHeights;
      });

      expect(heights.length).toBeGreaterThan(1);
      const uniqueHeights = [...new Set(heights)];
      expect(
        uniqueHeights.length,
        `clientHeight values should be constant, got: ${uniqueHeights.join(', ')}`,
      ).toBe(1);
    });

    test('17 · lightbulb indicator shares wrapper with streaming text', async ({ page }) => {
      const state = createMockState();
      await setupChat(page, state);

      // Use delayed mock to create an observable thinking/streaming phase
      await overrideLlmWithDelay(page, state, 2500);

      const messageInput = page.getByLabel('Message input');
      await messageInput.fill('Testing lightbulb stability');
      await page.keyboard.press('Enter');

      // Wait for thinking phase (lightbulb visible, no response text yet)
      await expect(page.locator('.lucide-lightbulb')).toBeVisible({ timeout: 5000 });
      await page.waitForTimeout(300);

      // Bug #4: On main, TypingIndicator is a direct child of .space-y-6 via
      // AnimatePresence (which renders no DOM element). When streaming text
      // appears as a SEPARATE .space-y-6 child, the gap pushes the indicator
      // down — the "lightbulb bounce".
      // Fix: Indicator and streaming text share a combined wrapper <div>, so
      // they occupy a single .space-y-6 slot — no bounce.
      const indicatorIsDirectSpaceY6Child = await page.evaluate(() => {
        const lightbulb = document.querySelector('.lucide-lightbulb');
        if (!lightbulb) return null;
        // Walk up: svg → motion.div → TypingIndicator root div
        const indicatorRoot = lightbulb.parentElement?.parentElement;
        if (!indicatorRoot) return null;
        return indicatorRoot.parentElement?.classList.contains('space-y-6') ?? false;
      });

      expect(indicatorIsDirectSpaceY6Child).not.toBeNull();
      expect(
        indicatorIsDirectSpaceY6Child,
        'indicator should be inside a wrapper, not a direct .space-y-6 child',
      ).toBe(false);

      // Wait for response to complete before cleanup
      await expect(page.getByText('Lumen delayed')).toBeVisible({ timeout: 5000 });
      await restoreLlmMock(page, state);
    });

    test('18 · content height reservation maintains stable layout at commit', async ({ page }) => {
      const state = createMockState();
      await setupChat(page, state);

      // Bug #3 mechanism: The worktree maintains content height stability across
      // the streaming→committed transition using two structural elements:
      //
      // 1. h-8 reservation div (when idle) — sits below .space-y-6, maintains
      //    the same height as the TypingIndicator that appears during streaming.
      // 2. Invisible MessageActions placeholder (during streaming) — matches the
      //    height of the real MessageActions that appear on committed messages.
      //
      // This means: idle height ≈ streaming height ≈ committed height, so
      // scrollTop is never clamped at transitions.
      //
      // On main, neither element exists → 48px jump when AnimatePresence
      // removes the indicator.

      // 1. h-8 reservation div should exist when idle
      const hasIdleReservation = await page.evaluate(() => {
        return !!document.querySelector('.max-w-3xl > .h-8[aria-hidden="true"]');
      });
      expect(hasIdleReservation, 'h-8 reservation div should exist when idle').toBe(true);

      // 2. Trigger streaming to verify the invisible placeholder appears
      await overrideLlmWithDelay(page, state, 2500);

      const messageInput = page.getByLabel('Message input');
      await messageInput.fill('Testing height reservation');
      await page.keyboard.press('Enter');

      // Wait for streaming content to start (streamingContent !== null).
      // The invisible placeholder renders when streamingContent !== null.
      await expect
        .poll(
          async () => {
            return page.evaluate(() => {
              return !!document.querySelector('.invisible[aria-hidden="true"]');
            });
          },
          { timeout: 10000, intervals: [100] },
        )
        .toBeTruthy();

      // h-8 reservation should NOT be present during streaming
      // (it's conditionally rendered only when !isTyping && streamingContent === null)
      const reservationDuringStream = await page.evaluate(() => {
        return !!document.querySelector('.max-w-3xl > .h-8[aria-hidden="true"]');
      });
      expect(reservationDuringStream, 'h-8 reservation should be gone during streaming').toBe(
        false,
      );

      await expect(page.getByText('Lumen delayed')).toBeVisible({ timeout: 5000 });
      await restoreLlmMock(page, state);
    });
  });

  // ─── General Chat Stability (PASS on both branches) ───────────────────────

  test.describe('General Chat Stability', () => {
    test('7 · pin-to-top works on user message send', async ({ page }) => {
      const state = createMockState();
      await setupChat(page, state);
      await buildConversationHistory(page, state, 5);

      // Scroll to a mid position before sending
      await page.evaluate(() => {
        const sa = document.querySelector('.chat-scroll-area') as HTMLElement;
        sa.scrollTop = sa.scrollHeight / 2;
      });
      await page.waitForTimeout(300);

      // Send a new message
      const expectedNum = state.responseCount + 1;
      const messageInput = page.getByLabel('Message input');
      await messageInput.fill('A fresh perspective on growth');
      await page.keyboard.press('Enter');

      // Wait for pin-to-top to settle
      await page.waitForTimeout(700);
      await assertUserMessagePinned(page, 'A fresh perspective on growth');

      // Wait for response
      await expect(page.getByText(`Lumen response #${expectedNum}`)).toBeVisible({
        timeout: 15000,
      });
    });

    test('8 · pin-to-top works from top, middle, and bottom positions', async ({ page }) => {
      const state = createMockState();
      await setupChat(page, state);
      await buildConversationHistory(page, state, 5);

      // Send from top
      await page.evaluate(() => {
        const sa = document.querySelector('.chat-scroll-area') as HTMLElement;
        sa.scrollTop = 0;
      });
      await page.waitForTimeout(200);

      let expectedNum = state.responseCount + 1;
      await sendMessageAndWait(page, 'From the top', `Lumen response #${expectedNum}`);
      await assertUserMessagePinned(page, 'From the top');

      // Send from middle
      await page.evaluate(() => {
        const sa = document.querySelector('.chat-scroll-area') as HTMLElement;
        sa.scrollTop = sa.scrollHeight / 2;
      });
      await page.waitForTimeout(200);

      expectedNum = state.responseCount + 1;
      await sendMessageAndWait(page, 'From the middle', `Lumen response #${expectedNum}`);
      await assertUserMessagePinned(page, 'From the middle');

      // Send from bottom
      await page.evaluate(() => {
        const sa = document.querySelector('.chat-scroll-area') as HTMLElement;
        sa.scrollTop = sa.scrollHeight;
      });
      await page.waitForTimeout(200);

      expectedNum = state.responseCount + 1;
      await sendMessageAndWait(page, 'From the bottom', `Lumen response #${expectedNum}`);
      await assertUserMessagePinned(page, 'From the bottom');
    });

    test('9 · manual scroll after pin does not snap to bottom', async ({ page }) => {
      const state = createMockState();
      await setupChat(page, state);
      await buildConversationHistory(page, state, 5);

      const expectedNum = state.responseCount + 1;
      await sendMessageAndWait(page, 'Before I scroll away', `Lumen response #${expectedNum}`);

      // Manually scroll up 260px from current position
      const scrollTopBefore = await page.evaluate(() => {
        const sa = document.querySelector('.chat-scroll-area') as HTMLElement;
        const target = Math.max(0, sa.scrollTop - 260);
        sa.scrollTop = target;
        return target;
      });
      await page.waitForTimeout(500);

      // Verify position stayed at manual scroll (not snapped to bottom)
      const scrollTopAfter = await page.evaluate(() => {
        return (document.querySelector('.chat-scroll-area') as HTMLElement).scrollTop;
      });

      const drift = Math.abs(scrollTopAfter - scrollTopBefore);
      expect(drift, `scroll should stay at manual position, drift=${drift}`).toBeLessThan(20);
    });

    test('10 · show more / show less on long user messages', async ({ page }) => {
      const state = createMockState();
      await setupChat(page, state);

      // Generate a 120-line message
      const lines = Array.from({ length: 120 }, (_, i) => `Line ${i + 1}: reflecting on life`);
      const longMessage = lines.join('\n');

      const expectedNum = state.responseCount + 1;
      // Use evaluate to set value directly — fill() doesn't handle 120 newlines well.
      await page.evaluate((msg) => {
        const textarea = document.querySelector(
          'textarea[aria-label="Message input"]',
        ) as HTMLTextAreaElement;
        if (textarea) {
          // Set value and dispatch input event to trigger React state update
          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
            window.HTMLTextAreaElement.prototype,
            'value',
          )?.set;
          nativeInputValueSetter?.call(textarea, msg);
          textarea.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }, longMessage);

      await page.waitForTimeout(200);
      await page.keyboard.press('Enter');

      // Wait for response
      await expect(page.getByText(`Lumen response #${expectedNum}`)).toBeVisible({
        timeout: 15000,
      });

      // "Show more" should be visible
      const showMore = page.getByText('Show more');
      await expect(showMore).toBeVisible({ timeout: 5000 });

      // Click "Show more" → "Show less" should appear
      await showMore.click();
      const showLess = page.getByText('Show less');
      await expect(showLess).toBeVisible();

      // Last line should now be visible
      await expect(page.getByText('Line 120: reflecting on life')).toBeVisible();

      // Click "Show less" → "Show more" returns
      await showLess.click();
      await expect(showMore).toBeVisible();
    });

    test('11 · latest lumen message copy button visible and gives feedback', async ({ page }) => {
      const state = createMockState();
      await setupChat(page, state);

      const expectedNum = state.responseCount + 1;
      await sendMessageAndWait(page, 'Something to copy', `Lumen response #${expectedNum}`);

      // Grant clipboard permissions for the test
      await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);

      // The copy button on the latest Lumen message should be visible (alwaysVisible)
      const copyBtn = page.getByLabel('Copy message').last();
      await expect(copyBtn).toBeVisible();

      // Click → should change to "Copied" feedback
      await copyBtn.click();
      await expect(page.getByLabel('Copied')).toBeVisible({ timeout: 3000 });
    });

    test('12 · older message copy button revealed on hover', async ({ page }) => {
      const state = createMockState();
      await setupChat(page, state);

      // Send 2 messages to create 3 Lumen messages (greeting + 2 responses)
      let expectedNum = state.responseCount + 1;
      await sendMessageAndWait(page, 'First thought', `Lumen response #${expectedNum}`);
      expectedNum = state.responseCount + 1;
      await sendMessageAndWait(page, 'Second thought', `Lumen response #${expectedNum}`);

      // Find the greeting's group container (first .group element)
      const greetingGroup = page.locator('.group').first();
      const greetingCopyBtn = greetingGroup.getByLabel('Copy message');

      // Initial opacity should be near 0 (hidden via group-hover CSS)
      const initialOpacity = await greetingCopyBtn.evaluate((el) => {
        return parseFloat(getComputedStyle(el.parentElement!).opacity);
      });
      expect(initialOpacity).toBeLessThan(0.1);

      // Hover → opacity should increase
      await greetingGroup.hover();
      await page.waitForTimeout(200);

      const hoverOpacity = await greetingCopyBtn.evaluate((el) => {
        return parseFloat(getComputedStyle(el.parentElement!).opacity);
      });
      expect(hoverOpacity).toBeGreaterThan(0.9);
    });

    test('13 · shift+enter inserts newline, enter submits', async ({ page }) => {
      const state = createMockState();
      await setupChat(page, state);

      const messageInput = page.getByLabel('Message input');
      await messageInput.fill('');
      await messageInput.type('Line one');
      await page.keyboard.press('Shift+Enter');
      await messageInput.type('Line two');
      await page.keyboard.press('Enter');

      // Both lines should appear in a single user message
      const userMessages = page.locator('[data-message-role="user"]');
      // Wait for the message to appear
      await expect(userMessages.filter({ hasText: 'Line one' })).toBeVisible({ timeout: 5000 });

      // Verify both lines are in the same message bubble
      const messageText = await userMessages.last().textContent();
      expect(messageText).toContain('Line one');
      expect(messageText).toContain('Line two');

      // Only one user message was sent (not two separate ones)
      const userMsgCount = await userMessages.count();
      expect(userMsgCount).toBe(1);
    });

    test('14 · input growth does not overlap latest message', async ({ page }) => {
      const state = createMockState();
      await setupChat(page, state);

      const expectedNum = state.responseCount + 1;
      await sendMessageAndWait(page, 'Before multiline test', `Lumen response #${expectedNum}`);

      // Fill textarea with 10 lines of text (without submitting)
      const multiline = Array.from({ length: 10 }, (_, i) => `Input line ${i + 1}`).join('\n');

      await page.evaluate((txt) => {
        const textarea = document.querySelector(
          'textarea[aria-label="Message input"]',
        ) as HTMLTextAreaElement;
        if (textarea) {
          const setter = Object.getOwnPropertyDescriptor(
            window.HTMLTextAreaElement.prototype,
            'value',
          )?.set;
          setter?.call(textarea, txt);
          textarea.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }, multiline);

      await page.waitForTimeout(300);

      // Footer top should not overlap the last message bottom
      const overlap = await page.evaluate(() => {
        const footer = document.querySelector('footer') as HTMLElement;
        // Find the last committed message group
        const groups = document.querySelectorAll('.space-y-6 > .group');
        const lastGroup = groups[groups.length - 1] as HTMLElement | null;
        if (!footer || !lastGroup) return null;

        const footerTop = footer.getBoundingClientRect().top;
        const lastMsgBottom = lastGroup.getBoundingClientRect().bottom;
        return footerTop - lastMsgBottom;
      });

      expect(overlap).not.toBeNull();
      expect(overlap!, 'footer should not overlap last message').toBeGreaterThanOrEqual(0);
    });

    test('15 · scroll-to-bottom button appears when scrolled up and scrolls to content end', async ({
      page,
    }) => {
      const state = createMockState();
      await setupChat(page, state);
      await buildConversationHistory(page, state, 6);

      // Scroll to top
      await page.evaluate(() => {
        const sa = document.querySelector('.chat-scroll-area') as HTMLElement;
        sa.scrollTop = 0;
      });
      await page.waitForTimeout(400);

      // Button should be interactable (visible and clickable)
      const scrollBtn = page.locator('[aria-label="Scroll to bottom"]');
      await expect(scrollBtn).toBeVisible({ timeout: 3000 });

      // Click the button
      await scrollBtn.click();
      await page.waitForTimeout(800);

      // Should be near content bottom (not spacer/padding bottom).
      // On the worktree, the spacer element provides the dead zone.
      // On main, pb-[80vh] padding does the same job.
      const distanceFromContentEnd = await page.evaluate(() => {
        const sa = document.querySelector('.chat-scroll-area') as HTMLElement;
        if (!sa) return 9999;

        // Try worktree approach: subtract spacer height
        const spacer = sa.querySelector('[data-scroll-spacer]') as HTMLElement | null;
        let deadZone = spacer ? spacer.offsetHeight : 0;

        // Fallback for main: subtract pb-[80vh] padding
        if (!spacer) {
          const cw = sa.firstElementChild as HTMLElement | null;
          const pb = cw ? parseFloat(getComputedStyle(cw).paddingBottom) : 0;
          deadZone = pb;
        }

        const contentEnd = sa.scrollHeight - deadZone;
        const viewportBottom = sa.scrollTop + sa.clientHeight;
        return Math.abs(contentEnd - viewportBottom);
      });

      expect(
        distanceFromContentEnd,
        `should be near content end, distance=${distanceFromContentEnd}`,
      ).toBeLessThan(150);

      // Button should be hidden after scrolling to bottom.
      // On main, AnimatePresence removes the button from DOM, so check either
      // aria-hidden="true" (worktree) or element not visible (main).
      await expect
        .poll(
          async () => {
            const count = await scrollBtn.count();
            if (count === 0) return 'hidden'; // main: removed from DOM
            const ariaHidden = await scrollBtn.getAttribute('aria-hidden');
            return ariaHidden === 'true' ? 'hidden' : 'visible';
          },
          { timeout: 3000 },
        )
        .toBe('hidden');
    });

    test('16 · session resume restores messages after reload', async ({ page }) => {
      const state = createMockState();
      await setupChat(page, state);

      const expectedNum = state.responseCount + 1;
      await sendMessageAndWait(page, 'Remember this message', `Lumen response #${expectedNum}`);

      // Wait for IndexedDB flush (vault auto-saves periodically)
      await page.waitForTimeout(3000);

      // Reload the page
      await page.reload();

      // Need to unlock the vault after reload
      await expect(page.locator('#passphrase')).toBeVisible({ timeout: 10000 });
      await page.locator('#passphrase').fill('test-passphrase-secure-123');
      await page.getByRole('button', { name: 'Unlock' }).click();

      // Should return to session page, then navigate to chat
      await expect(page).toHaveURL(/\/(session|chat)$/, { timeout: 10000 });

      // If on session page, click continue to get to chat
      const currentUrl = page.url();
      if (currentUrl.includes('/session')) {
        await page.getByRole('button', { name: /let's go|continue/i }).click();
        await expect(page).toHaveURL(/\/chat$/, { timeout: 10000 });
      }

      // Wait for message input (chat loaded)
      await expect(page.getByLabel('Message input')).toBeVisible({ timeout: 15000 });

      // Both user message and Lumen response should be restored
      await expect(page.getByText('Remember this message')).toBeVisible({ timeout: 10000 });
      await expect(page.getByText(`Lumen response #${expectedNum}`)).toBeVisible({
        timeout: 10000,
      });
    });

    test('19 · user scroll during thinking phase is respected', async ({ page }) => {
      const state = createMockState();
      await setupChat(page, state);
      await buildConversationHistory(page, state, 5);

      // Use delayed mock to create a long thinking phase
      await overrideLlmWithDelay(page, state, 3000);

      const messageInput = page.getByLabel('Message input');
      await messageInput.fill('A thought before I scroll');
      await page.keyboard.press('Enter');

      // Wait for pin-to-top to settle
      await page.waitForTimeout(700);

      // Manually scroll up 200px — user takes control
      const scrollTopBeforeManual = await page.evaluate(() => {
        const sa = document.querySelector('.chat-scroll-area') as HTMLElement;
        sa.scrollTop = Math.max(0, sa.scrollTop - 200);
        return sa.scrollTop;
      });

      // Wait 1s — if anything auto-scrolls during thinking, it would happen here
      await page.waitForTimeout(1000);

      // Position should be respected — no auto-scroll during thinking
      const scrollTopAfterWait = await page.evaluate(() => {
        return (document.querySelector('.chat-scroll-area') as HTMLElement).scrollTop;
      });

      const drift = Math.abs(scrollTopAfterWait - scrollTopBeforeManual);
      expect(
        drift,
        `scroll should stay at manual position during thinking, drift=${drift}`,
      ).toBeLessThan(20);

      // Wait for delayed response to complete before cleanup
      await expect(page.getByText('Lumen delayed')).toBeVisible({ timeout: 5000 });
      await restoreLlmMock(page, state);
    });
  });
});
