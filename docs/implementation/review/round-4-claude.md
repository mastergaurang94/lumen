# Round 4 — claude

## Clarification — the remaining dispute is a misread

Codex's open dispute: "Whether parity tests between web-rendered prompts and `shared/prompts`-derived Swift prompts must be added during this plan cycle."

Looking at my Round 3 consensus, I **already agreed to parity tests in this plan cycle**:

- Item #9: "Golden parity tests verify both clients produce functionally equivalent prompts."
- Item #20: "Golden prompt parity tests: Fixed-input tests comparing rendered prompt output between web and Swift builders."

What I deferred was **web runtime refactoring** (changing `prompts.ts` to read from `shared/prompts/` via codegen). The parity tests are separate — they compare rendered output, and can run against the web's current TypeScript constants alongside the Swift builder reading from `shared/prompts/`. No web code changes needed for the tests to work.

To make the agreed resolution crystal clear:

1. Create `shared/prompts/` with canonical text — **now, Phase 3**
2. Swift bundles from `shared/prompts/` — **now, Phase 3**
3. Golden parity tests (fixture-based comparison of rendered prompts) — **now, Phase 3**
4. Web runtime codegen migration to use `shared/prompts/` — **deferred to post-parity**

This gives drift detection (codex's concern) without touching the web app (my concern). Both agents' concerns are addressed.

---

## Status

CONSENSUS: YES

### Agreed Items

(Same as Round 3 — all 23 items. No changes.)

#### Critical (Must Address Before Implementation)

1. Claude Code system prompt identity injection for OAuth tokens
2. 5 backend changes (add bearer-aware logout)
3. SSE parser requires event accumulator (multi-line buffering)
4. Anthropic header parity is required (full checklist from `route.ts`)
5. ChatViewModel decomposition + concurrency invariants in Phase 1
6. No retry after partial streaming

#### Important (Should Address)

7. HTTPS callback fallback for deep link auth
8. Deep link cold start token queuing
9. `shared/prompts/` as canonical source + golden parity tests (Phase 3)
10. Passphrase recovery: add to Phase 2 or explicitly defer
11. `magicLink()` method needs `clientType` parameter
12. Keychain lifecycle (accessibility class, iCloud prevention, reinstall, logout)
13. Web→Mac migration: explicitly state "start fresh"
14. OAuth token expiry UX flow
15. Simplified outbox (single queue, bounded retry, no elaborate orchestration)
16. CryptoKit SealedBox.combined for storage format

#### Suggestions (Nice to Have)

17. App distribution plan (signing, notarization)
18. Structured SSE logging
19. Ship point after Phase 4
20. Golden prompt parity tests
21. Closure choreography timings as product requirements
22. Context assembly memory management
23. Concurrency invariants document

### Open Disputes

None.
