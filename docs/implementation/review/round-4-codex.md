# Round 4 — codex

## Agreements

I agree with Claude’s Round 3 resolutions and accept the final consolidated set as written.

- Shared prompts dispute: resolved with canonical `shared/prompts/`, Swift bundle consumption, web build-time codegen, and parity tests.
- Outbox dispute: resolved with simplified persistent outbox (bounded retries, no heavy orchestration).
- Claude Code identity injection: explicitly accepted as parity-critical and must be included in Phase 3.

## Rebuttals

None.

## New Insights

No additional disputes; the current consensus set is strong and implementation-ready.

## Revised Positions

I revised my prior remaining dispute on prompt parity timing to align with Claude’s accepted synthesis:

- Do not destabilize web runtime loading now.
- Still enforce shared source + generated constants + parity tests in this cycle.

## Status

CONSENSUS: YES

### Agreed Items

#### Critical (Must Address Before Implementation)

1. Claude Code system prompt identity injection must be included for `sk-ant-oat-*` token compatibility.
2. Backend changes are 5 (not 4): include bearer-aware Logout handler.
3. SSE parser must use an event accumulator; line-by-line alone is insufficient.
4. Anthropic header parity is required (beta flags, user-agent, `x-app`, direct-browser header).
5. Chat orchestration must be decomposed (avoid monolithic `ChatViewModel`) with explicit state/concurrency invariants.
6. No retry after partial streaming output.

#### Important (Should Address)

7. Deep-link auth should use HTTPS callback fallback with manual token path.
8. Handle cold-start deep-link token queueing.
9. Use `shared/prompts/` as canonical source; Swift bundles; web uses build-time codegen; add parity tests.
10. Add/explicitly defer passphrase recovery (currently missing from phases).
11. Explicitly update `magicLink()` helper for `clientType`.
12. Specify Keychain lifecycle/accessibility and logout clearing semantics.
13. Explicitly document web→Mac migration story (likely fresh start).
14. Define OAuth token-expiry UX.
15. Keep simplified outbox semantics (bounded retries).
16. Prefer CryptoKit `SealedBox.combined` for native storage format.

#### Suggestions (Nice to Have)

17. Clarify app distribution/signing/notarization assumptions.
18. Add structured SSE logging for debugging.
19. Add explicit ship checkpoint after Phase 4 (parity vs polish split).
20. Add fixed-fixture golden prompt parity tests.
21. Treat closure choreography and non-fatal Arc failure behavior as product requirements.
22. Add explicit context assembly memory handling notes.
23. Add a short "Concurrency and State Invariants" section in Phase 1.

### Open Disputes

None.
