# Memory Architecture

How Lumen maintains continuity across sessions — making every conversation feel like the mentor remembers everything that matters.

## The Two-Document System

**Session Notebook** — written after each session. The mentor's private reflection on what just happened. ~1,000-1,500 tokens. Stored in `notebooks/`.

**The Arc** — one per person, updated after each session. The mentor's living understanding of who you are. ~2,000-3,500 tokens. Stored as `arc.md`.

Both are markdown. Both are created automatically during `/project:wrap-up`.

## Session Notebook

The notebook captures what happened in a single conversation. It's written as the mentor's private notes — honest, precise, reflective.

### Sections

- **What Happened**: The emotional arc — how the conversation moved, not just what topics were covered. 8-12 lines.
- **Their Words**: 3-6 exact quotes that revealed something true, each with a one-line note about why it matters.
- **What Opened**: New threads, questions, things to explore. Only what actually emerged — never manufactured.
- **What Moved**: Threads from previous sessions that shifted. Cross-references earlier sessions.
- **Mentor's Notebook**: Private reflections — patterns forming, things being avoided, emotional undercurrents, what to listen for next time. 6-10 lines.
- **Parting Words**: The truest, most specific thing about who they are right now. Not a summary. Not advice. 2-3 sentences.

### Design Principles

- **Markdown, not JSON**: Notebooks load directly into future context. Markdown reads naturally in a prompt.
- **"Their Words" is the highest-signal section**: Verbatim quotes carry more weight than any summarization. The mentor attending to exact language across sessions creates the feeling of being deeply heard.
- **"Mentor's Notebook" is the differentiator**: Captures what a great mentor notices but holds — patterns, avoidances, undercurrents. Feeds the Arc's "Patterns I've Noticed" section.
- **Explicit fallback language**: "Nothing new" / "First conversation" prevents the LLM from fabricating content to fill sections.

## The Arc

The Arc is the mentor's living understanding of who you are. It's updated (not rewritten) after every session.

### Sections

- **Who You Are**: Identity, values, what matters. Distinguishes direct statements from inferences.
- **Your Current Chapter**: Where you are in life. What's at stake. What's in motion.
- **What's Aligned**: Sources of energy, meaning, momentum, satisfaction.
- **What's Unfinished**: Open threads tagged by session number. The things carried forward.
- **Patterns I've Noticed**: The most important section. Cross-session patterns, avoidances, growth. Compounds over time.
- **Your Words**: Exact quotes preserved across sessions. Only retired after many sessions when no longer central.
- **Our Journey**: Narrative arc of the relationship — not a session log, but the shape of growth.

### Update Philosophy

> "Update, not rewrite." A single conversation changes ~20% of the Arc.

- Only remove what was explicitly resolved or contradicted
- Silence on a topic is NOT resolution
- Thread lifecycle: open → shift → resolve → gone (resolved threads removed, not archived)
- Quotes preserved exactly — a person's own language is the most powerful thing you can reflect back
- The Arc grows denser over time rather than staying artificially compressed
- Notebooks are the source of truth; the Arc is the orientation

### Research Basis

The consolidation-layer approach (notebooks as episodic memory, Arc as semantic memory) is informed by:
- **SimpleMem** (Jan 2026): Demonstrated that consolidation layers should preserve, not rebuild
- **MAGMA** (Jan 2026): Showed value of structured memory update over full rewrite

## Context Assembly

When starting a session, context loads in this order:

```
1. The Arc                                  ~3.5K tokens   [always, if exists]
2. All session notebooks (newest first)     ~1.3K each     [always]
3. Same-mentor raw transcripts (newest)     ~12K each      [up to 5]
4. Cross-domain raw transcripts (newest)    ~12K each      [up to 3]
```

### Budget Rules

- Load in priority order with hard ceilings per category (see table above)
- Stop adding transcripts if context is getting large
- Works comfortably for 50+ sessions

## Session Closure Flow

After the mentor's in-character closing:

1. **Generate Session Notebook** (~1K-1.5K tokens, Opus, max_tokens 4096)
2. **Update the Arc** (~2K tokens, Opus, max_tokens 4096)
   - First session: Create initial Arc from transcript + notebook
   - Subsequent sessions: Update existing Arc with transcript + notebook
3. **Append summary block** to transcript file
4. **Offer detailed notes** (`_notes.md`) if the user wants deeper reflection
