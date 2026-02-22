# docs/implementation/swift-mac-app.md — Review Feedback

Reviewed by: claude + codex
Date: 2026-02-22
Rounds: 4

## Summary

The Swift native plan is directionally strong and uses an appropriate stack, but a few parity-critical details are currently under-specified and could cause major rework if not addressed first. The largest risks are Anthropic OAuth compatibility (headers + identity injection), SSE streaming semantics, and orchestration complexity in chat/session lifecycle. With the agreed backend/auth adjustments, prompt-source strategy, and Phase 4 parity checkpoint, the plan is execution-ready.

## Agreed Feedback

### Critical (Must Address Before Implementation)

- Include Claude Code identity injection in Anthropic requests for OAuth token compatibility.
- Treat backend changes as 5 items (add bearer-aware logout, not only 4).
- Specify SSE parser as event-accumulator based (multi-line events, blank-line flush), not naive line parsing.
- Enforce Anthropic header parity (`anthropic-beta`, `user-agent`, `x-app`, direct-browser header).
- Decompose chat orchestration into multiple components (not a monolithic `ChatViewModel`) and define state/concurrency invariants early.
- Preserve no-retry-after-partial-stream semantics.

### Important (Should Address)

- Use HTTPS callback fallback for auth deep links with manual token fallback.
- Handle cold-start deep-link token queueing.
- Adopt `shared/prompts/` as canonical prompt source; Swift bundles prompts; web uses build-time codegen from shared files.
- Add prompt parity tests (fixture-based rendered output checks).
- Add or explicitly defer passphrase recovery (currently missing from phases).
- Explicitly update backend `magicLink()` helper for `clientType` handling.
- Define Keychain lifecycle/accessibility/logout semantics.
- Explicitly state migration posture (likely fresh start, no web vault migration).
- Define token-expiry UX for Anthropic OAuth tokens.
- Keep a simplified outbox (bounded retries, no heavy worker orchestration).
- Prefer CryptoKit `SealedBox.combined` for native encryption blob format.

### Suggestions (Nice to Have)

- Clarify signing/notarization/distribution assumptions.
- Add structured SSE lifecycle/event logging for debugging.
- Split delivery into parity-critical (through Phase 4) vs polish (Phases 5-6).
- Treat closure choreography timing and non-fatal Arc failure behavior as product-level requirements.
- Add explicit context-assembly memory handling notes for large histories.
- Add a short "Concurrency and State Invariants" section in Phase 1.

## Debate Notes

Main disagreements were about timing/scope for shared prompt extraction and whether outbox should exist at all. Both resolved to a practical middle path: keep web runtime stable via build-time codegen from shared prompt files, and keep a simplified persistent outbox instead of full worker-style complexity. Minor disputes about backend gating and cookie/bearer precedence were resolved by using Phase 2 integration checkpoints and straightforward cookie-first fallback behavior.
