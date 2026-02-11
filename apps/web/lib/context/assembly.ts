import { decrypt } from '@/lib/crypto';
import { getLastSession, getRecentSummaries, getSessionNumber } from '@/lib/storage/queries';
import { deserializeMessages } from '@/lib/storage/transcript';
import type { StorageService } from '@/lib/storage';
import { DEFAULT_MODEL_ID, getModelContextBudget } from '@/lib/llm/model-config';
import type { Message } from '@/types/session';
import type { SessionSummary, SessionTranscript } from '@/types/storage';

type BuildSessionContextOptions = {
  maxChars?: number;
  maxTokens?: number;
  totalContextTokens?: number;
  reservedTokens?: number;
  modelId?: string;
  maxTranscripts?: number;
  maxSummaries?: number;
};

type BuildSessionContextParams = {
  storage: StorageService;
  userId: string;
  key: CryptoKey;
  options?: BuildSessionContextOptions;
  now?: Date;
};

const DEFAULT_MAX_TRANSCRIPTS = 10;
const DEFAULT_MAX_SUMMARIES = 3;

// YAML front matter is metadata-only; keep it stable for deterministic tests.
function quoteYaml(value: string): string {
  return JSON.stringify(value);
}

// Render lists in a compact, consistent YAML format to avoid diff churn.
function renderYamlList(key: string, items: string[]): string {
  if (items.length === 0) {
    return `  ${key}: []`;
  }
  const lines = items.map((item) => `    - ${quoteYaml(item)}`);
  return `  ${key}:\n${lines.join('\n')}`;
}

// Use a simple markdown line format to preserve role attribution.
function formatMessageLine(message: Message): string {
  return `**${message.role}:** ${message.content}`;
}

function formatTranscriptHeader(transcript: SessionTranscript): string {
  return `### Session ${transcript.session_id} (${transcript.started_at})`;
}

// Transcript sections prefer raw messages for fidelity; summaries are fallback only.
function formatTranscriptSection(transcript: SessionTranscript, messages: Message[]): string {
  const header = formatTranscriptHeader(transcript);
  const body = messages.map(formatMessageLine).join('\n');
  return [header, body].join('\n');
}

// Summary format keeps actions + open threads explicit for continuity.
function formatSummarySection(summary: SessionSummary): string {
  const header = `### Session ${summary.session_id} (${summary.created_at})`;
  const partingWords = summary.parting_words
    ? `Parting words: ${summary.parting_words}`
    : 'Parting words: None';
  const actionSteps =
    summary.action_steps.length > 0
      ? `Action steps:\n${summary.action_steps.map((step) => `- ${step}`).join('\n')}`
      : 'Action steps: None';
  const openThreads =
    summary.open_threads.length > 0
      ? `Open threads:\n${summary.open_threads.map((thread) => `- ${thread}`).join('\n')}`
      : 'Open threads: None';

  return [header, summary.summary_text, partingWords, actionSteps, openThreads].join('\n');
}

// Load and decrypt transcript chunks in order; keep ordering deterministic.
async function loadTranscriptMessages(
  storage: StorageService,
  key: CryptoKey,
  transcript: SessionTranscript,
): Promise<Message[]> {
  const chunks = await storage.listTranscriptChunks(transcript.session_id);
  const messages: Message[] = [];

  for (const chunk of chunks) {
    const decrypted = await decrypt(chunk.encrypted_blob, key, chunk.encryption_header.iv);
    messages.push(...deserializeMessages(decrypted));
  }

  return messages;
}

// Char budgeting is deterministic and fast; tokenization can be swapped later.
function withinBudget(maxChars: number | undefined, current: number, next: string): boolean {
  if (!maxChars) return true;
  return current + next.length <= maxChars;
}

function tokensToChars(tokens: number): number {
  return tokens * 4;
}

// Resolve a model-aware budget while allowing per-call overrides.
function resolveMaxChars(options: BuildSessionContextOptions | undefined): number {
  const modelId = options?.modelId ?? DEFAULT_MODEL_ID;
  const modelBudget = getModelContextBudget(modelId);

  if (options?.maxTokens !== undefined) {
    return tokensToChars(Math.max(0, options.maxTokens));
  }

  if (options?.maxChars !== undefined) {
    return Math.max(0, options.maxChars);
  }

  const totalTokens = options?.totalContextTokens ?? modelBudget.totalTokens;
  const reservedTokens = options?.reservedTokens ?? modelBudget.reservedTokens;
  const maxTokens = Math.max(0, totalTokens - reservedTokens);
  return tokensToChars(maxTokens);
}

function formatLocalDate(date: Date): string {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  // Use an explicit local timezone to avoid UTC off-by-one dates.
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    ...(timeZone ? { timeZone } : {}),
  }).format(date);
}

// Builds a deterministic, long-term-friendly context preamble for system prompt injection.
export async function buildSessionContext({
  storage,
  userId,
  key,
  options,
  now = new Date(),
}: BuildSessionContextParams): Promise<string> {
  // Pull model-aware budget once so selection is deterministic for the call.
  const maxChars = resolveMaxChars(options);
  const maxTranscripts = options?.maxTranscripts ?? DEFAULT_MAX_TRANSCRIPTS;
  const maxSummaries = options?.maxSummaries ?? DEFAULT_MAX_SUMMARIES;

  const [latestSession, sessionNumber, summaries] = await Promise.all([
    getLastSession(storage, userId),
    getSessionNumber(storage, userId),
    getRecentSummaries(storage, userId, maxSummaries),
  ]);

  const latestSummary = summaries[0] ?? null;
  const actionSteps = latestSummary?.action_steps ?? [];
  const openThreads = latestSummary?.open_threads ?? [];
  const currentDate = formatLocalDate(now);

  let daysSinceLastSession: number | null = null;
  if (latestSession?.ended_at) {
    const endedAt = new Date(latestSession.ended_at);
    const diffMs = now.getTime() - endedAt.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    daysSinceLastSession = Math.max(0, diffDays);
  }

  // Front matter provides metadata for prompt injection without bloating content.
  const frontMatter = [
    '---',
    'session_context:',
    `  session_number: ${sessionNumber}`,
    `  current_date: ${quoteYaml(currentDate)}`,
    `  days_since_last_session: ${daysSinceLastSession === null ? 'null' : daysSinceLastSession}`,
    renderYamlList('last_session_action_steps', actionSteps),
    renderYamlList('last_session_open_threads', openThreads),
    '---',
    '',
  ].join('\n');

  const parts: string[] = [];
  let charCount = 0;
  parts.push(frontMatter);
  charCount += frontMatter.length;

  // Keep spacing context near the top for easy access in the prompt.
  const spacingSection = [
    '# Session Context',
    '## Session Spacing',
    `- session_number: ${sessionNumber}`,
    `- days_since_last_session: ${daysSinceLastSession === null ? 'null' : daysSinceLastSession}`,
    `- current_date: ${currentDate}`,
  ].join('\n');

  if (withinBudget(maxChars, charCount, spacingSection)) {
    parts.push(spacingSection);
    charCount += spacingSection.length;
  }

  // Prefer raw transcripts; fall back to summaries only if nothing fits.
  const transcripts = (await storage.listTranscripts(userId))
    .filter((transcript) => transcript.ended_at !== null)
    .slice(0, maxTranscripts);

  let addedTranscript = false;
  if (transcripts.length > 0) {
    const transcriptSections: string[] = [];
    let transcriptChars = 0;
    const transcriptBaseChars = charCount;

    for (const transcript of transcripts) {
      const header = `\n${formatTranscriptHeader(transcript)}`;
      if (!withinBudget(maxChars, transcriptBaseChars + transcriptChars, header)) {
        break;
      }
      const messages = await loadTranscriptMessages(storage, key, transcript);
      const section = `\n${formatTranscriptSection(transcript, messages)}`;
      if (!withinBudget(maxChars, transcriptBaseChars + transcriptChars, section)) {
        continue;
      }
      transcriptSections.push(section);
      transcriptChars += section.length;
      addedTranscript = true;
    }

    if (addedTranscript) {
      const sectionHeader = '\n## Recent Transcripts';
      if (withinBudget(maxChars, charCount, sectionHeader)) {
        parts.push(sectionHeader);
        charCount += sectionHeader.length;
      }

      for (const section of transcriptSections) {
        if (!withinBudget(maxChars, charCount, section)) {
          break;
        }
        parts.push(section);
        charCount += section.length;
      }
    }
  }

  if (!addedTranscript && summaries.length > 0) {
    const header = '\n## Recent Summaries';
    if (withinBudget(maxChars, charCount, header)) {
      parts.push(header);
      charCount += header.length;
    }

    for (const summary of summaries) {
      const section = `\n${formatSummarySection(summary)}`;
      if (!withinBudget(maxChars, charCount, section)) {
        continue;
      }
      parts.push(section);
      charCount += section.length;
    }
  }

  return parts.join('\n');
}
