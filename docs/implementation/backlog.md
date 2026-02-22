# Lumen Backlog

Last Updated: 2026-02-22

Items NOT tracked in any active sprint plan. For MVP items, see active `mvpX.md`.

---

## Now

_Tracked in `mvp3.md`._

---

## Soon

### Domain Tracking

- [ ] `[M]` **Visible domain/progress tracking**: Surface the 5 lenses (Calling, Relationships, Vitality, Prosperity, Spirit) as visible UI elements so users can see what's been explored and what threads are active. Could be as simple as a sidebar or dashboard showing domains with recent themes, milestones, and "what opened" items from session closures. Helps with topic compartmentalization — users forget what they talked about last time. Multiple testers requested this (Iman: "mind map, table, staged progression chart"; Howie: domain focus). Also aids topic recall between sessions.

### Tools Library

- [ ] `[M]` **Session return reminders (Lumen tools foundation)**: Send email/notification reminders when it's time to return for the next session. This is the beginning of a tools library — a mechanism for Lumen to take actions beyond conversation (send reminders, play music, create meditations, get the time, etc.). Start with return reminders as the first tool. Implementation could be a cron job, scheduled email via Resend, or calendar integration. The tools architecture should be extensible for future capabilities.

### Onboarding

- [ ] `[M]` **Improve onboarding for non-technical users**: Current flow assumes comfort with email auth + passphrase creation. A 55-year-old first-time AI user needed hand-holding through every step. Consider: simpler language, fewer steps before first chat, guided walkthrough, optional passphrase (defer to Keychain/device-level security on desktop), and gentle hints about how to talk to Lumen (e.g., "it's okay to say 'I don't know'"). Also consider guided vs. open session start — offer choice between guided discovery (Tony Robbins-style intake questions) or bring-your-own-problem mode. See `docs/feedback/2026-02-18-meg-in-person.md`, `docs/feedback/2026-02-20-iman-imessage.md`.
- [ ] `[M]` **Design + atmospheric polish**: Evolve palettes with richer backgrounds and textures, increase base text/icon sizing, add atmospheric elements (subtle gradients, breathing animations), apply Fraunces display typography to key moments. OmmWriter-level atmosphere. Polish pass, not redesign.

### Harness

- [ ] `[M]` **Evaluation harness + prompt versioning**: CLI tool to replay golden transcripts, generate notebook + Arc, and score against rubric (specificity, verbatim quotes, natural flow, pattern depth). Prompt version tags stored alongside session notebooks. 3-5 golden fixtures. Local script, markdown report output. New: `scripts/eval/`.

### Landing Page

- [ ] `[M]` **Product positioning on landing page**: Current landing page is just a sign-up form with no indication of what Lumen is. Repurpose into a product positioning page that explains the value before asking for commitment. Communicate: what Lumen is (companion, not therapist), what makes it different (privacy, continuity, individual mentors), and what to expect from a session. Privacy/encryption messaging belongs here too — explain what "stored locally" means in concrete terms. Feedback from Howie ("I'm not sure where this is going"), Iman ("no indication of what it is"), and others consistently flagged this gap.

---

## Later

Longer term features to keep in mind.

### Security

- [ ] `[M]` **System prompt protection**: Move system prompt to env/secrets, strip from client-visible payloads, add prompt-level deflection instruction. On desktop: prompt bundled in app binary. Not urgent while open-source — revisit before public Mac app distribution.

### Observability

- [ ] `[L]` **Iterative self-improvement feedback**: In-conversation feedback mechanism (e.g., 0-3 rating at random points) so users can signal how Lumen is doing. Challenge: conversations are encrypted client-side, so server-side analysis isn't possible. Needs a privacy-preserving approach — possibly aggregate scalar signals only.
- [ ] `[M]` **Think about observability and analytics**

### CLI

- [ ] `[M]` **CLI entry point**: Terminal-based interface for Lumen conversations. Enables power users and developers to interact with Lumen from the command line.

### Monetization & Sync

- [ ] `[L]` **Provider auth + billing**: Hosted token broker with scoped, short-lived API tokens. Server holds provider key, enforces billing/quotas. BYOK as power-user alternative. Free tier (limited sessions/month), paid tier (unlimited + managed sync). Open-source local app first — revisit when monetization makes sense.
- [ ] `[M]` **First session free / delayed email requirement**: Don't require email sign-up before the first session. Let users try Lumen immediately and ask for email after they've experienced value. Natural conversion point: after first session closure, prompt to create an account to save their data. Reduces friction for new users and improves conversion. See Iman's feedback: "You require an email too early in the flow."
- [ ] `[L]` **Folder-based encrypted sync**: Sync vault to user-chosen folder (iCloud Drive, Dropbox, NAS, USB). Encrypted SQLite file copied after each session. Last-write-wins conflict resolution. Natural paid-tier feature. _Depends on: SQLite migration._
- [ ] `[L]` **Managed encrypted sync (server)**: Go API stores encrypted SQLite blobs (zero plaintext). Push/pull with offline resilience. Paid tier boundary: folder sync = free, managed sync = paid. _Depends on: SQLite migration, folder sync._

---

## Notes

- **Dependencies** are noted inline with _Depends on:_ markers.
- Items may move between tiers as priorities shift.
- **Completion tracking**:
  - Items done directly from backlog → Log in `done/backlog.md`, remove from this file.
  - Items that grow into full sprints → Create a new `mvp*.md` plan, archive in `done/` when complete.
  - Items moved into MVP plans → Remove from this file (MVP plan is the source of truth).
