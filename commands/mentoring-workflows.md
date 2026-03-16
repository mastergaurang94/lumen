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
- Scan `transcripts/` for `{prefix}_*_*.md` (exclude `_notes.md`) and legacy `.txt`
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

5. Load context (respect budget)
- `arc.md` first
- All `notebooks/` newest first
- Last 2-3 related raw transcripts
- If budget allows, 1-2 cross-domain transcripts
- Do not load all raw transcripts

6. Load mentor prompt(s)
- Single: `mentoring-prompts/{mentor}.md`
- Council: `mentoring-prompts/council.md` plus all individual mentor files
- Coalition: each participating mentor file

7. Replace prompt template variables
- `[NAME]` -> the user's name (ask on first session if not known; remember for future sessions)
- `[XTH]` -> ordinal session number
- `[DATE + TIME]` -> current date and time

8. Append rendered prompt to transcript
- Save exact rendered prompt text to transcript
- Add separator:

```text
----------------------------------------
```

9. Enter character and begin
- Stay fully in mentor character until explicitly asked to step out or `wrap-up` is called
- For council/coalition, prefix each mentor line with `**Mentor**:`

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

7. Ask about notes
- Ask: `Want me to generate a detailed _notes.md for this session?`
- If yes, create: `transcripts/{prefix}_{number}_{date}_notes.md`

8. Confirm closure
- List updated/created files
- Confirm session is closed
- Remind top commitment for the week ahead
