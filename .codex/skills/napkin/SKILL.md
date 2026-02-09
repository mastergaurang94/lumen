---
name: napkin
description: Persistent per-repo scratchpad for preferences, pitfalls, conventions, and decisions that should carry across sessions. Use when the user gives task-specific preferences, when you notice recurring mistakes, or when repo-specific guidance should be recorded for future work.
---

# Napkin

## Overview

Keep a lightweight, high-signal scratchpad in `.claude/napkin.md` at the repo root to
persist preferences, pitfalls, and conventions across sessions.

## What Goes In The Napkin

- User preferences for how to work (tone, tools, testing expectations).
- Repo-specific conventions, commands, and workflows.
- Known pitfalls and recurring gotchas.
- Decisions that should be remembered next time.

## When To Update

- The user corrects you or adds a preference.
- You repeat a mistake or learn a new constraint.
- A workflow or command needs to be reused across sessions.

## How To Write

- Keep it short and high-signal.
- Prefer single-level bullets.
- One rule per line.
- Avoid long prose.
- Prune stale or redundant notes.

## File Location

- Create or update `.claude/napkin.md` at the repo root.
