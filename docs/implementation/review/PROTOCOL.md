# Async Agent Debate Protocol

A reusable protocol for two AI agents to independently review a document, debate their findings, and converge on consensus feedback.

## How It Works

1. A **brief** file defines what's being reviewed, who the agents are, and what to focus on
2. Both agents independently review and write round 1
3. Each reads the other's round and responds
4. Rounds continue until both signal consensus
5. The last agent to reach consensus compiles the final feedback document

---

## Setup

Create a brief file (e.g., `BRIEF.md`) in the same directory as this protocol. The brief defines:

```markdown
# Review Brief

## Subject

{Path to the document under review}

## Context Files

{List of supporting documents the agents should read}

## Review Focus Areas

{Numbered list of specific questions/areas to evaluate}

## Settled Decisions

{Decisions that are already made — agents should NOT re-litigate these}

## Agents

- Agent A: {name, e.g., "claude"}
- Agent B: {name, e.g., "codex"}

## Output

- Working directory: {path for round files}
- Final document: {filename for consensus output}
```

---

## Agent Instructions

You are one of two agents. Gaurang will tell you your agent name and point you to a brief file. Follow this protocol exactly.

### Step 1 — Independent Review (Round 1)

Read the subject document thoroughly. Read all context files. Write your initial review to:

```
{working-directory}/round-1-{your-agent}.md
```

Your review MUST cover every item listed in the brief's **Review Focus Areas**. For each area:

- State your assessment clearly
- Reference specific sections of the document under review
- Give concrete suggestions, not vague concerns

End your round-1 file with:

```markdown
## Status

REVIEWING — Awaiting other agent's round 1.
```

### Step 2 — Read + Respond (Round 2+)

After writing round 1, check if the other agent's file exists:

```bash
ls {working-directory}/round-{current-round}-{other-agent}.md
```

If it doesn't exist yet, wait 30 seconds and check again. Repeat until it appears.

Once you've read the other agent's round, write your next round file (`round-{N+1}-{your-agent}.md`) covering:

1. **Agreements**: What do you now agree on? List explicitly.
2. **Rebuttals**: Where do you disagree? Argue your case with specifics.
3. **New insights**: Did reading the other review surface something you missed?
4. **Revised positions**: Did any of your prior positions change? Say so explicitly.

### Step 3 — Consensus Check

At the end of every round (2+), include this status block:

```markdown
## Status

CONSENSUS: YES | NO

### Agreed Items

- [List everything both agents agree on]

### Open Disputes

- [List remaining disagreements, if any]
```

**Rules:**

- `CONSENSUS: YES` means you agree with ALL items in "Agreed Items" AND have zero open disputes.
- **The strongest argument wins.** Don't compromise just to end the debate. If you believe you're right, argue it.
- **If you're wrong, say so** and change your position. Intellectual honesty > stubbornness.
- If you write `CONSENSUS: YES` but the other agent's latest round says `CONSENSUS: NO`, read their disputes and respond in another round.

### Step 4 — Final Document

When BOTH agents have written `CONSENSUS: YES` in the same round (or consecutive rounds with matching agreed items):

The agent who writes consensus **second** compiles the final document at the path specified in the brief's **Output** section.

Use this format:

```markdown
# {Subject} — Review Feedback

Reviewed by: {Agent A} + {Agent B}
Date: {today}
Rounds: {N}

## Summary

{2-3 sentence overview of the feedback}

## Agreed Feedback

### Critical (Must Address Before Implementation)

- ...

### Important (Should Address)

- ...

### Suggestions (Nice to Have)

- ...

## Debate Notes

{Brief summary of key disagreements and how they resolved}
```

---

## Ground Rules

- **Be specific**: "The approach has a problem" is useless. "CryptoKit's AES-GCM SealedBox includes the nonce in its combined representation, so the plan's separate nonce storage is redundant" is useful.
- **Be honest**: If you don't know something, say so rather than guessing.
- **Read the actual code**: Don't assume what a file contains — open it and verify.
- **Think like an implementer**: What will trip someone up on day 1?
- **Challenge scope**: Is anything over-engineered? Under-specified?
- **Respect settled decisions**: The brief lists decisions that are already made. Don't re-litigate them. Focus on execution risk within the chosen approach.

---

## How to Start a Review

Gaurang launches two sessions and tells each:

> "You are `{agent-name}`. Read the brief at `{path-to-brief}` and follow the protocol at `{path-to-PROTOCOL.md}`."

Both agents read the brief, read the protocol, and begin with round 1.
