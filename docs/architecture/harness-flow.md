# Conversational Harness Flow

Date: 2026-02-15
Status: Active
Evolves: v0 (2026-01-26)

## Goals

- Keep context tight and high-signal.
- Preserve privacy and autonomy constraints.
- Support consistent conversational quality across sessions.
- Be deterministic and testable for product-critical reliability.

## High-Level Flow

1. Load user state (Arc + session notebooks + raw transcripts).
2. Assemble context for this session (budget-aware).
3. Run the Lumen prompt.
4. Detect session completion.
5. Generate Session Notebook + update the Arc.

## Context Assembly

Assembly priority (loaded in this order, each within budget):

```
1. YAML front matter              session_number, current_date, days_since_last_session
2. The Arc                        ~3.5K tokens [always, if exists]
3. All session notebooks          ~1.3K each   [always, newest first]
4. Last 2-3 raw transcripts       ~12K each    [always if budget allows]
5. Random older transcripts       ~12K each    [fill remaining budget]
```

Budget adapts to model context window. With 200K (current), the above works
comfortably for 50+ sessions. Larger windows load more transcripts automatically.

See `docs/mentoring/notebook-and-arc-prompts.md` for full context assembly reference.

Code ref: `apps/web/lib/context/assembly.ts` — `buildSessionContext()`

### Budget Rules

- Default context window: 200K tokens (model-aware, configurable per model).
- Reserve ~60K tokens for system prompt + model response.
- Fill remaining budget with Arc → notebooks → transcripts.
- Random selection of older transcripts uses Fisher-Yates shuffle (mimics human
  memory — serendipitous recall rather than strict recency).

## Session Closure (Memory Writes)

After each session, two LLM calls produce the continuity documents:

1. **Session Notebook** — markdown reflection on the conversation (~1K-1.5K tokens).
   Written as the mentor's private notes. Sections: What Happened, Their Words,
   What Opened, What Moved, Mentor's Notebook, Parting Words.

2. **The Arc** — rewritten understanding of the person (~2K tokens). Not appended,
   rewritten. Sections: Who You Are, Your Current Chapter, What's Aligned, What's
   Unfinished, Patterns I've Noticed, Your Words, Our Journey.

Additionally stored (unchanged from v0):

- Full transcript (raw, immutable, encrypted)
- Session metadata sent to server (timestamps, transcript hash)

See `docs/mentoring/notebook-and-arc-prompts.md` for prompt details and design notes.

Code refs:

- `apps/web/lib/session/summary.ts` — `NOTEBOOK_PROMPT`
- `apps/web/lib/session/arc.ts` — `ARC_CREATION_PROMPT`, `ARC_UPDATE_PROMPT`
- `apps/web/app/chat/page.tsx` — `generateNotebookAndArc()`

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

- On user end, generate Session Notebook → update Arc → display Parting Words on closure screen.

## Harness Quality

- Prompt versioning tied to notebooks and transcript metadata.
- Minimal evaluation harness:
  - Notebook quality checks (specificity, verbatim quotes, natural flow).
  - Arc coherence checks (thread lifecycle, pattern depth).
  - Deterministic context assembly replay tests.
