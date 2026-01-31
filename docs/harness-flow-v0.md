# Conversational Harness Flow v0

Date: 2026-01-26
Status: Draft (MVP)

## Goals

- Keep context tight and high-signal.
- Preserve privacy and autonomy constraints.
- Support consistent coaching quality across sessions.
- Be deterministic and testable for product-critical reliability.

## High-Level Flow

1. Load user state (profile + last session summary + open threads).
2. Select context for this session.
3. Run the coaching prompt.
4. Detect session completion.
5. Generate and store session summary + updates.

## Context Selection

Inputs:

- UserProfile (minimal)
- Last N session summaries (default N=3)
- Open threads from most recent summary
- Current time/seasonal context
- Session spacing context:
  - `days_since_last_session: number | null` (null if first session)
  - `last_session_action_steps: string[]` (for follow-up)
  - `session_number: number` (1 = intake, 2+ = ongoing)

Rules:

- Prefer summaries over raw transcripts unless within budget.
- Use raw transcripts for the last 2–3 sessions if budget allows.
- Include only what directly informs the next move.
- If the session number is 1, do not include prior sessions.

Token budget (MVP heuristic):

- Reserve room for system prompt and model response.
- Target ~70–75% of the context window for input.
- If raw transcripts exceed budget, fall back to summaries.

Determinism (MVP):

- Deterministic context assembly for a given input state and budget.
- Log context selection decisions for replay in tests.

## Memory Hygiene

- After each session, write:
  - Full transcript (raw, immutable)
  - Summary (short, actionable)
  - Update to UserProfile (only if new stable info emerges)
- Avoid overfitting the profile; keep it sparse and stable.

## Safety & Governance

- Session spacing enforced conversationally via system prompt (not server-blocked).
- Do not use user data for training.
- Store data locally (encrypted).
- Maintain a clear user-facing privacy line in the UI.

## Session Completion Detection

Signals:

- Explicit user closure via End Session UI.
- Assistant may offer a closure suggestion, but the user decides.

Action:

- On user end, conclude with summary, closing words, and action steps (if any).

## Harness Quality

- Prompt versioning tied to summaries and transcript metadata.
- Minimal evaluation harness:
  - Summary quality checks (brevity, action steps present when applicable).
  - Closure checks (summary + closing words + action steps format).
  - Deterministic context assembly replay tests.
