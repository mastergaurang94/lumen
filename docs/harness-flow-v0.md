# Conversational Harness Flow v0

Date: 2026-01-26
Status: Draft (MVP)

## Goals
- Keep context tight and high-signal.
- Preserve privacy and autonomy constraints.
- Support consistent coaching quality across sessions.

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

Rules:
- Prefer summaries over raw transcripts.
- Include only what directly informs the next move.
- If the session number is 1, do not include prior sessions.

## Memory Hygiene
- After each session, write:
  - Full transcript (raw, immutable)
  - Summary (short, actionable)
  - Update to UserProfile (only if new stable info emerges)
- Avoid overfitting the profile; keep it sparse and stable.

## Safety & Governance
- Enforce 7-day session spacing gate server-side.
- Do not use user data for training.
- Store data locally (encrypted).
- Maintain a clear user-facing privacy line in the UI.

## Session Completion Detection
Signals:
- Explicit user closure (e.g., "I'm done", "that's it for today")
- Implicit closure (energy drops, decision reached, repeated sign-off)

Action:
- Conclude with summary, closing words, and action steps (if any).

## Post-MVP (Planned)
- Embeddings for long-horizon recall if needed.
- User-held-key backups and export/import.
- Desktop wrapper for native filesystem access.
