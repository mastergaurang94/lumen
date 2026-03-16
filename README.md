# Lumen

A personal reflection companion for [Claude Code](https://docs.anthropic.com/en/docs/claude-code). Conversations that help you remember who you truly are.

Inspired by Simon the ragpicker from Og Mandino's *The Greatest Miracle in the World* — a wise companion who sees the person you've forgotten you are and walks you back to remembering.

## What This Is

Lumen is a set of AI mentor prompts and a session management workflow that runs inside Claude Code. It gives you:

- **Six mentors** across life domains — each with their own voice, expertise, and perspective
- **Persistent memory** — a two-document system (Arc + Notebooks) that makes every session feel like the mentor remembers everything that matters
- **Session management** — start and close sessions with simple commands; transcripts, notebooks, and the Arc are created automatically

This is **mentoring, not coaching**. No goals, no accountability frameworks, no homework. Recognition, not prescriptions. A companion who notices patterns across conversations and reflects them back with honesty and warmth.

## Quick Start

```bash
git clone https://github.com/mastergaurang94/lumen.git
cd lumen
```

Then in Claude Code:

```
/project:begin lumen          # Start with the Lumen companion
/project:begin contribution   # Start with the Contribution mentor
/project:begin council        # All six mentors together
/project:wrap-up              # Close the session
```

That's it. Your first session creates the initial Arc. Each subsequent session builds on the last.

## The Mentors

| Mentor | Domain | What They Bring |
|--------|--------|-----------------|
| **Lumen** | Personal companion | Simon-inspired. Helps you remember who you truly are. The flagship. |
| **Contribution** | Career, purpose, calling | 40+ years building companies. Navigates purpose vs. busyness. |
| **Relationships** | Love, connection | Deep expertise in intimacy, boundaries, self-relationship. |
| **Vitality** | Body, energy, health | Body intelligence, burnout recovery, sustainable wellness. |
| **Spirit** | Inner life, identity | Shadow work, dark nights, wholeness vs. achievement. |
| **Prosperity** | Money, alignment | Emotional roots of financial behavior, mature money relationship. |

**Council**: All six together for whole-person integration.
**Coalition**: Any 2-5 mentors for topics spanning domains (e.g., `/project:begin contribution vitality`).

## How Memory Works

```
Session 1 ──► Notebook 1 ──► Arc (created)
Session 2 ──► Notebook 2 ──► Arc (updated ~20%)
Session 3 ──► Notebook 3 ──► Arc (updated ~20%)
   ...           ...            ...
Session N ──► Notebook N ──► Arc (living understanding)
```

**The Arc** (`arc.md`) — The mentor's living understanding of who you are. Updated after every session. ~2,500 words. Always loaded into context. Tracks patterns, exact quotes, open threads, and the narrative of your growth.

**Session Notebooks** (`notebooks/`) — One per session. The mentor's private reflection. Captures what happened, your exact words, what opened, what moved, and parting words.

**Transcripts** (`transcripts/`) — Immutable records of every conversation. The Arc and notebooks carry continuity; transcripts fill remaining context budget.

The key principle: **"Update, not rewrite."** A single conversation changes ~20% of the Arc. Silence on a topic is not resolution. The Arc grows denser over time. See [docs/architecture.md](docs/architecture.md) for the full design.

## Your Data

Your personal data (`arc.md`, `notebooks/`, `transcripts/`) is gitignored by default. It lives on your machine, never committed to the repo. You own it completely.

## Customization

**Create your own mentor:**
1. Copy any file in `mentoring-prompts/` as a starting point
2. Write the mentor's identity, expertise, and voice
3. Include `[XTH]` and `[DATE + TIME]` placeholders for session context
4. Use the filename (without `.md`) as the mentor name: `/project:begin yourmentor`

**Adjust the workflow:**
Edit `commands/mentoring-workflows.md` — it's the single source of truth for how sessions start and close.

## Requirements

- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) (Anthropic's CLI)
- An Anthropic API key or Claude Code subscription

## Philosophy

> The old ragpicker... had a way of seeing past the rags to the miracle underneath.

This isn't therapy. This isn't life coaching. This isn't a productivity tool.

It's a companion for the inner conversation — the one where you figure out what you actually think, what you're avoiding, and what you already know but haven't said out loud yet. The mentors don't give answers. They notice patterns, hold your words, and reflect back what they see with the honesty of someone who genuinely cares.

## License

MIT
