# Memory Schema v0

Date: 2026-01-26
Status: Draft (MVP)

## Goals
- Keep memory simple, high-signal, and future-proof.
- Preserve raw transcripts for re-summarization as models improve.
- Support autonomy-first weekly cadence and coach continuity.

## Storage Model (MVP)
We store three primary objects per user:
- Session transcript (raw, immutable)
- Session summary (short, actionable)
- User profile (minimal, stable)

All data is stored locally in the browser via IndexedDB, encrypted at rest with
WebCrypto AES-GCM + PBKDF2.

## Entities

### 1) UserProfile
Stable, low-noise, updated occasionally.

Fields:
- user_id: string (uuid)
- preferred_name: string | null
- goals: string[] (1–3 concise statements)
- recurring_themes: string[] (1–3 concise statements)
- coach_preferences: string[] (e.g., "challenge me directly", "gentle tone")
- created_at: string (ISO8601)
- updated_at: string (ISO8601)

### 2) SessionTranscript
Raw session content. Immutable once written.

Fields:
- session_id: string (uuid)
- user_id: string (uuid)
- started_at: string (ISO8601)
- ended_at: string (ISO8601 | null)
- timezone: string | null (IANA, e.g., "America/Los_Angeles")
- locale_hint: string | null (e.g., "en-US")
- system_prompt_version: string (e.g., "intake-v0.1")
- messages: array of Message
- encrypted_blob: bytes (ciphertext)
- created_at: string (ISO8601)

Message:
- role: "user" | "assistant" | "system"
- content: string
- created_at: string (ISO8601)
- metadata: object | null (optional, for future tagging)

### 3) SessionSummary
Short, actionable recap for memory and next-session context.

Fields:
- session_id: string (uuid)
- user_id: string (uuid)
- summary_text: string (8–12 lines max)
- recognition_moment: string | null (1–2 lines)
- action_steps: string[] (0–5, concise)
- open_threads: string[] (0–5, things to revisit)
- coach_notes: string | null (internal note for tone/approach)
- created_at: string (ISO8601)
- updated_at: string (ISO8601)

## Relationships
- One UserProfile per user.
- One SessionTranscript per session.
- One SessionSummary per session.
- SessionSummary references its SessionTranscript via session_id.

## Derivation Rules
- SessionSummary is derived from SessionTranscript after session close.
- UserProfile updates are derived from SessionSummary or explicit user edits.

## Minimal Indexing
- By user_id.
- By session_id.
- By started_at (descending for recent-first lists).

## Post-MVP Extensions (Optional)
- Pattern index (loops, dynamics)
- Commitments tracker with outcomes
- Recognition moment index for quick recall
- Retrieval layer (embeddings) for long-horizon context
