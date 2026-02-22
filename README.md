# Lumen

A personal reflection companion — conversations that help you remember who you truly are.

Inspired by _The Greatest Miracle in the World_ by Og Mandino, where a ragpicker helps people see they are "part of the living dead" and guides them back to the world of the living. Lumen doesn't teach you something new. It helps you _remember_.

## What it does

Lumen is an AI conversation partner for personal reflection. Not a coach, not a therapist — a wise companion who's fully present and remembers your story across sessions.

- **Freeform sessions** — no timers, no enforced cadence, just conversation
- **Persistent memory** — an evolving "Arc" captures your journey across sessions
- **Privacy-first** — all data encrypted client-side and stored locally, never on a server

## Privacy architecture

This is the core design constraint, not an afterthought:

- **Client-side encryption**: PBKDF2 + AES-GCM via WebCrypto — your passphrase never leaves your browser
- **Local storage**: All transcripts, notebooks, and memory stored in IndexedDB
- **Server stores nothing sensitive**: Only auth tokens and session timestamps (no transcripts, no summaries)
- **No training**: Your conversations are never used for model training

## Tech stack

| Layer    | Stack                                                                      |
| -------- | -------------------------------------------------------------------------- |
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS v4, Radix UI, Framer Motion |
| Backend  | Go (chi/v5) — auth, session metadata, LLM proxy                            |
| Storage  | IndexedDB via Dexie (encrypted), SQLite on server (metadata only)          |
| LLM      | Anthropic Claude (Opus) via SSE streaming                                  |

## Getting started

### Prerequisites

- Node.js 20+
- pnpm 9+
- Go 1.21+

### Setup

```bash
# Install dependencies
pnpm install

# Copy environment examples
cp apps/web/.env.example apps/web/.env.local
cp apps/api/.env.example apps/api/.env

# Start the frontend
pnpm --filter web dev

# Start the backend (in another terminal)
cd apps/api && go run ./cmd/api
```

The web app runs at `http://localhost:3000`. You'll need an Anthropic API key in your `.env.local` to use the LLM features.

### Tests

```bash
# Frontend unit tests
pnpm --filter web test -- --run

# Go tests
cd apps/api && go test ./...

# Lint + format
pnpm lint
pnpm format:check
```

## License

[MIT](LICENSE)
