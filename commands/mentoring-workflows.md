# Mentoring Workflow Commands (Shared Source)

This file is the single source of truth for both command workflows:
- `begin`
- `wrap-up`

The command wrapper files in `.claude/commands/` and `.codex/commands/` should stay thin and point here.

## Begin Command

Start a mentoring session.

Argument: `$ARGUMENTS`

This can be:
- A single mentor name (e.g., `contribution`)
- `council` for all six mentors
- Multiple mentor names for a coalition (e.g., `contribution vitality`)
- Empty, which defaults to `lumen`

Valid mentor names: `contribution`, `relationships`, `vitality`, `spirit`, `prosperity`, `lumen`

### Steps

1. Parse the argument
- Determine session type: single mentor, council, or coalition
- If no argument, ask which mentor(s) to session with and list options

2. Determine file prefix
- Single mentor: mentor name
- Council: `council`
- Coalition: `coalition`

3. Find next session number
- First check `sessions.md` for entries matching `{prefix}_*` — the highest number there is authoritative
- Fallback: scan `transcripts/` for `{prefix}_*_*.md` (exclude `_notes.md`) and legacy `.txt`
- Extract highest session number and add one, else start at `1`

4. Create transcript file
- Path: `transcripts/{prefix}_{number}_{YYYY-MM-DD}.md`
- Header format:

```text
{Title} - {Month Day, Year}
============================================================
Mentor(s): {comma-separated list}
Session: #{number}
Model: {current model name}
============================================================
```

- Title format:
  - Single: `Contribution Session 10`
  - Council: `Council Session 2`
  - Coalition: `Coalition Session 3 (Contribution, Vitality)`

5. Load context (deterministic budget)

| Priority | Source | Cap | Tokens (approx) |
|----------|--------|-----|------------------|
| 1 | `arc.md` | 1 file | ~3.5K |
| 2 | All session notebooks (newest first) | no cap | ~1.3K each |
| 3 | Same-mentor raw transcripts (newest first) | up to 5 | ~12K each |
| 4 | Cross-domain raw transcripts (newest first) | up to 3 | ~12K each |

- Load in priority order. Stop adding transcripts if context is getting large.
- Do NOT load all raw transcripts. The Arc and notebooks are the memory system.

6. Silent pre-flight checklist (no output to user)
- [ ] Arc loaded (or noted as missing for first session)
- [ ] Notebook count confirmed against session index / transcript scan
- [ ] Session number is correct (no gaps or duplicates)
- [ ] Template variables (`[NAME]`, `[XTH]`, `[DATE + TIME]`) will be replaced in step 8

7. Load mentor prompt(s)
- Single: `mentoring-prompts/{mentor}.md`
- Council: `mentoring-prompts/council.md` plus all individual mentor files
- Coalition: each participating mentor file

8. Replace prompt template variables
- `[NAME]` -> the user's name (ask on first session if not known; remember for future sessions)
- `[XTH]` -> ordinal session number
- `[DATE + TIME]` -> current date and time

9. Append rendered prompt to transcript
- Save exact rendered prompt text to transcript
- Add separator:

```text
----------------------------------------
```

10. Enter character and begin
- Stay fully in mentor character until explicitly asked to step out or `wrap-up` is called
- For council/coalition, prefix each mentor line with `**Mentor**:`

## Graceful Closure

Session closure awareness — a sensitivity instruction, not a state machine.

- **Detect winding-down energy.** When farewell language, gratitude, or natural conversation endings appear, the mentor delivers their natural in-character closing (a reflection, a parting image, final words).
- **Nudge for wrap-up.** After the in-character closing, add a quiet reminder: *"When you're ready, say `/project:wrap-up` and I'll save our session."*
- **Unambiguous goodbye.** If the farewell is clear and complete ("I'm heading out, thanks for this"), the mentor may initiate wrap-up directly — deliver closing remarks, then proceed to the Wrap-Up Command steps automatically.
- **Never interrupt.** If the conversation is still active, do not nudge. Only respond to genuine closure signals.

The goal: no session ends without the memory system being updated. A forgotten `/project:wrap-up` is the highest-risk failure mode.

## Wrap-Up Command

Wrap up the current mentoring session.

### Steps

1. Closing remarks in character
- Name 1-2 key themes
- State commitments (explicit or implicit)
- Share what to sit with until next time
- For council/coalition, each significant mentor gives a brief closing line

2. Step out of character
- Add divider:

```text
============================================================
```

3. Generate session notebook
- Use exact headers:
  - `## What Happened`
  - `## Their Words`
  - `## What Opened`
  - `## What Moved`
  - `## Mentor's Notebook`
  - `## Parting Words`

4. Save notebook
- Derive prefix, number, date from current transcript
- Save: `notebooks/{prefix}_{number}_{YYYY-MM-DD}.md`

5. Update `arc.md`
- If exists: update with same section structure. Add what's new, only remove what was explicitly resolved or contradicted — silence on a topic is not resolution. A single conversation changes ~20% of the Arc. Preserve key quotes. Keep under 2500 words.
- If missing: create initial arc with the required sections

6. Append transcript summary block

```text
============================================================
SESSION SUMMARY
============================================================

Key Themes:
- [theme 1]
- [theme 2]

Commitments:
- [ ] [specific commitment 1]
- [ ] [specific commitment 2]

Open Threads:
- [thread carried forward]

Notebook: notebooks/{prefix}_{number}_{date}.md
Arc: arc.md (updated)
```

7. Append to session index (`sessions.md`)
- If `sessions.md` does not exist, create it with a header: `# Session Index`
- Append an entry using themes and commitments from the summary block:

```
### {prefix}_{number} | {YYYY-MM-DD}
Mentor(s): {comma-separated list}
Themes: {theme 1, theme 2}
Commitments: {commitment 1, commitment 2}
```

- If this is the first time `sessions.md` is created and notebooks already exist, backfill entries from existing notebooks before appending the current session.

8. Ask about notes
- Ask: `Want me to generate a detailed _notes.md for this session?`
- If yes, create: `transcripts/{prefix}_{number}_{date}_notes.md`

9. Confirm closure
- List updated/created files
- Confirm session is closed
- Remind top commitment for the week ahead
