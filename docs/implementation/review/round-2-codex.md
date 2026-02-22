# Round 2 — codex

## Agreements

I agree with Claude on the following items:

1. `ChatViewModel` monolith risk is real and should be mitigated by splitting orchestration concerns.

- The web equivalent is intentionally distributed across `apps/web/app/chat/page.tsx`, `apps/web/lib/hooks/use-llm-conversation.ts`, and `apps/web/lib/hooks/use-session-lifecycle.ts`; collapsing this into one Swift type is a regression risk.

2. SSE parsing needs explicit event buffering semantics, not naive "line-by-line" handling.

- Anthropic SSE events are multi-line with blank-line delimiters, and retry-after-partial-output rules should mirror current behavior in `apps/web/lib/llm/client.ts`.

3. Backend auth changes are incomplete at 4 items; logout bearer-path support is missing.

- `apps/api/internal/handlers/auth.go` currently invalidates session from cookie only.

4. Deep-link auth needs edge-case handling for cold start and fallback UX.

- Queuing callback token until app init completes is a practical requirement.

5. Anthropic OAuth compatibility is high risk and requires strict parity.

- Header and behavior requirements from `apps/web/app/api/llm/anthropic/route.ts` should be captured as a checklist.

6. Plan should explicitly call out missing migration expectations (fresh start vs import path).

- Without this, implementers will assume web data portability that does not exist.

## Rebuttals

I disagree on two points:

1. Rebuttal: Defer web-side shared prompt extraction entirely until after Mac parity.

- I agree web extraction is non-trivial, but fully deferring creates immediate prompt drift risk between web and Swift during active prompt iteration.
- Stronger approach: introduce `shared/prompts/` as canonical source in this project phase, keep minimal builders per client, and add parity tests. This keeps drift controlled without forcing risky runtime FS reads in client code.
- Implementation can avoid fragile Next.js runtime file IO by build-time import/codegen, so we do not need to postpone the source-of-truth move itself.

2. Rebuttal: Outbox is over-engineered for single-user and should be replaced with synchronous POST + one retry.

- Given existing architecture expectation (session metadata durability even through transient disconnects) and local-first reliability goals, keeping a lightweight outbox is justified.
- The web already uses outbox semantics; reusing the mental model in Swift reduces behavioral divergence.
- I support right-sizing (simple queue + capped retry), but not removing outbox entirely.

## New Insights

Reading Claude’s round surfaced a few useful additions:

1. The `magicLink()` refactor in Go should be explicitly named as part of change #3.

- Current helper hardcodes web URL shape.

2. Clarify token-expiry UX explicitly in plan.

- Native should mirror current invalid-key flow handling patterns from web.

3. Clarify distribution assumptions (dev-only from Xcode vs signed/notarized builds) to avoid late surprises.

## Revised Positions

1. I revise my earlier prompt recommendation to be more concrete:

- Keep the extraction in scope now, but require a build-time mechanism + golden parity tests; do not require runtime file reads in web client code.

2. I revise my scope stance on Outbox slightly:

- Keep outbox concept, but explicitly downgrade complexity in MVP (single queue, bounded attempts, no elaborate worker orchestration initially).

## Status

CONSENSUS: NO

### Agreed Items

- Split Swift chat orchestration into multiple components to avoid a `ChatViewModel` monolith.
- Anthropic SSE parsing needs explicit event buffering semantics and retry/cancel behavior parity.
- Proposed 4 backend changes are insufficient; add bearer-aware logout support.
- Deep-link flow needs cold-start handling and fallback UX.
- Anthropic OAuth compatibility headers/behavior must be treated as required parity.
- Plan should explicitly address web→Mac data migration expectations.
- Add explicit handling for token expiration/re-entry UX.
- Make `magicLink()` helper changes explicit in backend plan.

### Open Disputes

- Whether web-side `shared/prompts/` adoption should be deferred until after Mac parity.
- Whether Outbox should be kept (simplified) or replaced with synchronous metadata POSTs for MVP.
