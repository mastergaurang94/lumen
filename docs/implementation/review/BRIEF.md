# Review Brief — Swift Mac App Plan

Protocol: [`PROTOCOL.md`](PROTOCOL.md)

## Subject

`docs/implementation/swift-mac-app.md`

## Context Files

Read these to understand the project and constraints:

- `CLAUDE.md` — Project conventions, monorepo structure, engineering approach
- `docs/implementation/mvp3.md` — MVP 3 overview, north star, remaining tiers
- `docs/architecture/overview.md` — Current system architecture and data flow
- `docs/architecture/harness-flow.md` — Context assembly + session closure flow
- `docs/product/spec.md` — Product requirements (locked)
- `docs/mentoring/system-prompts-v2.md` — Active system prompt (~4000 words)
- `docs/mentoring/notebook-and-arc-prompts.md` — Notebook + Arc prompt design

Also read the actual web source code to validate porting assumptions:

- `apps/web/lib/crypto.ts` — Encryption implementation
- `apps/web/lib/storage/index.ts` — StorageService interface
- `apps/web/lib/storage/dexie-storage.ts` — Encrypted storage implementation
- `apps/web/lib/llm/client.ts` — LLM streaming client
- `apps/web/app/api/llm/anthropic/route.ts` — Anthropic API proxy (headers, body format)
- `apps/web/lib/llm/prompts.ts` — System prompt builder
- `apps/web/lib/context/assembly.ts` — Context assembly + budget
- `apps/web/lib/session/summary.ts` — Notebook prompt + parsing
- `apps/web/lib/session/arc.ts` — Arc prompts + message builders
- `apps/web/app/chat/page.tsx` — Chat orchestration (683 lines, carefully crafted)
- `apps/web/lib/hooks/use-llm-conversation.ts` — Streaming + message management
- `apps/web/lib/hooks/use-session-lifecycle.ts` — Session init + chunk flush
- `apps/web/components/chat/session-closure.tsx` — Closure UI choreography
- `apps/api/internal/handlers/auth.go` — Go backend auth handlers
- `apps/api/internal/middleware/auth.go` — Auth middleware

## Review Focus Areas

1. **Architecture**: Is the MVVM + `@Observable` + Swift actors + GRDB + CryptoKit stack sound? Alternatives worth considering?
2. **Phasing**: Are the 6 phases ordered correctly? Are dependencies right? Anything that should move earlier/later?
3. **Risk**: What are the highest-risk items? What could block progress or require rework?
4. **Gaps**: What's missing from the plan? What will the implementer hit that isn't addressed?
5. **Scope**: Is anything over-engineered for a single-user personal tool? Anything under-specified?
6. **Go backend changes**: Are the 4 proposed backend changes correct and sufficient?
7. **Shared prompts**: Is the `shared/prompts/` extraction approach sound?
8. **Crypto**: Is the PBKDF2 (CommonCrypto) + AES-GCM (CryptoKit) approach correct? Any pitfalls porting from WebCrypto?
9. **Streaming**: Will `URLSession.bytes` + `AsyncThrowingStream` handle Anthropic's SSE format reliably?
10. **Auth flow**: Is the `lumen://` deep link approach for magic link auth complete? Any edge cases?

## Settled Decisions

These are final. Do NOT re-litigate them:

- SwiftUI native (not WKWebView, not React)
- macOS only (no iOS)
- GRDB.swift for SQLite (not Core Data, not raw SQLite)
- Own encryption format (not web-compatible)
- Anthropic OAuth tokens (`sk-ant-oat-*`) via BYOK
- Keep Go backend for auth + session metadata
- Morning (teal) palette as default
- `apps/apple/` in monorepo alongside `apps/web/`

## Agents

- Agent A: `claude`
- Agent B: `codex`

## Output

- Working directory: `docs/implementation/review/`
- Final document: `docs/implementation/review/swift-mac-app-feedback.md`
