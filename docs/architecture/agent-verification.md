# Agent UI Verification

How AI coding agents verify UI correctness across Lumen's platforms. This doc covers the general approach — for platform-specific implementation details, see the linked plan docs.

---

## Core Principle: Snapshot → Act → Verify

All agent UI verification follows the same loop regardless of platform:

1. **Snapshot** — capture the current state (accessibility tree, screenshot, or both)
2. **Act** — interact with the UI (click, type, navigate)
3. **Verify** — snapshot again and confirm the expected change occurred

The key enabler is **accessibility-first testing**: both Playwright (web) and Peekaboo (native) read the accessibility tree to understand what's on screen, not pixel-matching. This makes tests resilient to visual changes while catching structural/functional regressions.

---

## Web: Playwright + SweetLink

### Playwright (E2E Test Suites)

Standard E2E testing framework. Tests in `apps/web/e2e/`.

- **Accessibility snapshots**: `page.accessibility.snapshot()` returns the full element tree
- **Interactions**: `page.click()`, `page.fill()`, `page.keyboard.press()`
- **Screenshots**: `page.screenshot()` for visual verification
- **CLI-driven**: `pnpm --filter web test:e2e`

Key test suites:

- `chat-regression.spec.ts` — 23 tests covering message rendering, streaming, scroll behavior
- Smoke and vault specs for auth flow

### SweetLink (Live Browser Verification)

Custom tool connecting agents to a real browser session with encryption keys already unlocked. Useful for verifying post-unlock UI that headless browsers can't reach.

**Config**: `sweetlink.json` defines route groups:

- `public` — `/`, `/login`
- `auth` — `/login`, `/setup`, `/unlock`
- `core` — `/chat`, `/session` (requires unlocked vault)
- `history` — `/history`

**Commands**:

```bash
pnpm sweetlink smoke --routes core    # smoke test core routes
pnpm sweetlink screenshot --path /chat # screenshot a specific page
pnpm sweetlink sessions               # check console errors
```

**When to use**: after UI changes, debugging rendering issues, verifying encrypted data renders correctly.

---

## Native macOS: Peekaboo + Xcode 26.3

### Peekaboo MCP (Runtime Verification)

[Peekaboo](https://github.com/steipete/Peekaboo) is the Playwright equivalent for native Mac apps. MCP server with 25+ tools for accessibility inspection, screenshots, and interaction.

**Setup**:

```bash
brew install steipete/tap/peekaboo
```

Add as MCP server in Claude Code config or connect to Xcode 26.3 via MCP.

**Requirements**: macOS 15+ (Sequoia), Screen Recording + Accessibility permissions.

**Core tools**:
| Tool | Purpose |
|------|---------|
| `see --app <name>` | Accessibility tree snapshot + screenshot with element IDs |
| `click` | Click element by ID |
| `type` | Type text into element |
| `scroll` | Scroll within element |
| `hotkey` / `press` | Keyboard shortcuts and key presses |
| `window` | Window management (resize, move, focus) |
| `menu` / `menubar` | Menu discovery and activation |

**Agent workflow**:

1. Build and launch: `xcodebuild ... && open .../App.app`
2. `see --app AppName` → get accessibility tree + screenshot
3. Inspect the returned tree for expected elements
4. `click` / `type` to interact
5. `see` again to verify result

### Xcode 26.3 Agentic Coding (Compile-Time Verification)

Xcode 26.3 (RC Feb 2026) embeds AI agents (Claude Agent, OpenAI Codex) with native IDE tools:

- **File operations**: create, modify, examine project structure
- **Build**: build the project, read build logs, iterate on errors
- **Test**: run unit and UI tests, read results
- **Visual**: capture Xcode Preview snapshots for visual verification
- **Docs**: access full Apple developer documentation formatted for AI

Xcode exposes all of this via **MCP**, so Peekaboo can be added as an additional MCP tool alongside Xcode's native capabilities — giving agents both compile-time and runtime verification in a single session.

### Supplementary Tools

| Tool                                                                            | Purpose                                                         | When to use                                               |
| ------------------------------------------------------------------------------- | --------------------------------------------------------------- | --------------------------------------------------------- |
| [swift-snapshot-testing](https://github.com/pointfreeco/swift-snapshot-testing) | Visual regression — diff SwiftUI views against reference images | Catch unintended visual changes across builds             |
| XCUITest                                                                        | Full E2E test suite with screenshots in `.xcresult` bundles     | Structured, repeatable UI test suites                     |
| [ViewInspector](https://github.com/nalexn/ViewInspector)                        | Assert on SwiftUI view hierarchy without rendering              | Fast structural unit tests                                |
| [macapptree](https://github.com/MacPaw/macapptree)                              | JSON accessibility tree dump + annotated screenshots            | Lightweight CLI check without MCP                         |
| [AXorcist](https://github.com/steipete/AXorcist)                                | CLI for accessibility queries + element interaction             | macOS 14+ alternative when Peekaboo (15+) isn't available |

---

## Cross-Platform Comparison

| Capability                  | Web                                   | Native macOS                              |
| --------------------------- | ------------------------------------- | ----------------------------------------- |
| Accessibility tree snapshot | Playwright `accessibility.snapshot()` | Peekaboo `see` / macapptree               |
| Element interaction         | Playwright `click`/`fill`/`press`     | Peekaboo `click`/`type`/`hotkey`          |
| Screenshots                 | Playwright `screenshot()` / SweetLink | Peekaboo `see` / `screencapture`          |
| Live browser/app inspection | SweetLink (unlocked vault)            | Peekaboo MCP (running app)                |
| Compile-time verification   | `pnpm build && pnpm test`             | Xcode 26.3 agent (build + test + Preview) |
| Visual regression           | Screenshot diff                       | swift-snapshot-testing                    |
| E2E test suites             | Playwright specs (`*.spec.ts`)        | XCUITest (`LumenUITests/`)                |
| Smoke testing               | `pnpm sweetlink smoke --routes core`  | Peekaboo: `see` key screens after launch  |

---

## Layered Verification Strategy

Both platforms use the same layered approach, from fastest/cheapest to most comprehensive:

| Layer                  | Purpose                             | Speed   | Scope              |
| ---------------------- | ----------------------------------- | ------- | ------------------ |
| 1. Unit tests          | Logic correctness                   | Seconds | Functions/services |
| 2. Structural tests    | View hierarchy correct              | Seconds | Individual views   |
| 3. Snapshot regression | No visual drift                     | Seconds | Key views          |
| 4. Compile-time agent  | Builds, tests pass, Previews render | Minutes | Full project       |
| 5. Runtime agent       | App works end-to-end                | Minutes | Full app           |
| 6. E2E suites          | Structured, repeatable verification | Minutes | Critical flows     |

Run layers 1-3 on every change. Run layers 4-6 after significant changes or before shipping.

---

## References

- **Web E2E tests**: `apps/web/e2e/`
- **SweetLink config**: `sweetlink.json`
- **Swift Mac app plan**: `docs/implementation/swift-mac-app.md` (UI Verification section)
- **Peekaboo**: https://github.com/steipete/Peekaboo
- **Xcode 26.3 agentic coding**: https://www.apple.com/newsroom/2026/02/xcode-26-point-3-unlocks-the-power-of-agentic-coding/
