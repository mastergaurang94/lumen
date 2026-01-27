# Lumen Backlog (Notes)

Date: 2026-01-27

## Post-MVP: Platform
- Desktop wrapper to enable native filesystem access.
- Export/import for recovery.
- Resolve multi-device edits (merge strategy, last-write-wins vs CRDT, user prompts).

## Post-MVP: Memory
- Pattern index (loops, dynamics).
- Commitments tracker with outcomes.
- Recognition moment index for quick recall.
- Retrieval layer (embeddings) for long-horizon context.
- Fallback provider abstraction.

## Post-MVP: Harness
- Context compaction and recap rewriting.
- Summary compaction for long histories (rolling recap).
- Tool-call trimming and irrelevant metadata removal.
- Summarize long pasted inputs (code/docs) before storage.
- Topic-based retrieval or thread pinning for long-horizon continuity.
- Priority weighting (commitments, recurring themes, recognition moments).
- Session boundary validation to avoid accidental carryover.
- Hallucination guards for memory (cite source session for recalled facts).

## Harness Evaluation
- Define evaluation flow and rubric (summary quality, closure quality, context assembly).
- Decide where evals run (local vs CI) and how results are stored.
- Add deterministic replay fixtures and golden outputs.

## Trust & Safety
- Define coaching boundaries and non-therapeutic positioning.
- Add crisis UX with immediate resources and escalation guidance.
- Add user reporting and content flagging.
- Add safety policy references in system prompts.
- Add governance checks for high-risk content.
