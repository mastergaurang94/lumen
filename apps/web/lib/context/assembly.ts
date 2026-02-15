import { decrypt } from '@/lib/crypto';
import { getSessionNumber } from '@/lib/storage/queries';
import { deserializeMessages } from '@/lib/storage/transcript';
import type { StorageService } from '@/lib/storage';
import { DEFAULT_MODEL_ID, getModelContextBudget } from '@/lib/llm/model-config';
import type { Message } from '@/types/session';
import type { SessionNotebook, SessionTranscript } from '@/types/storage';

type BuildSessionContextOptions = {
  maxChars?: number;
  maxTokens?: number;
  totalContextTokens?: number;
  reservedTokens?: number;
  modelId?: string;
};

type BuildSessionContextParams = {
  storage: StorageService;
  userId: string;
  key: CryptoKey;
  options?: BuildSessionContextOptions;
  now?: Date;
};

const CHARS_PER_TOKEN = 4;
// Always try to include the last N raw transcripts for recency.
const RECENT_TRANSCRIPT_COUNT = 3;

function formatMessageLine(message: Message): string {
  return `**${message.role}:** ${message.content}`;
}

function formatTranscriptSection(transcript: SessionTranscript, messages: Message[]): string {
  const header = `### Session (${transcript.started_at})`;
  const body = messages.map(formatMessageLine).join('\n');
  return [header, body].join('\n');
}

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

function withinBudget(maxChars: number, current: number, next: string): boolean {
  return current + next.length <= maxChars;
}

function tokensToChars(tokens: number): number {
  return tokens * CHARS_PER_TOKEN;
}

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
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    ...(timeZone ? { timeZone } : {}),
  }).format(date);
}

function formatNotebookSection(notebook: SessionNotebook): string {
  return `### Session #${notebook.session_number} (${notebook.created_at})\n\n${notebook.markdown}`;
}

/**
 * Shuffle an array using Fisher-Yates. Returns a new array.
 */
function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Builds session context injected into the system prompt.
 *
 * Assembly priority:
 * 1. YAML front matter (session number, date, spacing)
 * 2. The Arc (mentor's evolving understanding — always loaded)
 * 3. All session notebooks (newest first — always loaded until budget tight)
 * 4. Recent raw transcripts (last 2-3 always, then random selection up to budget)
 */
export async function buildSessionContext({
  storage,
  userId,
  key,
  options,
  now = new Date(),
}: BuildSessionContextParams): Promise<string> {
  const maxChars = resolveMaxChars(options);
  const sessionNumber = await getSessionNumber(storage, userId);

  // Load the latest completed session for spacing metadata.
  const allTranscripts = await storage.listTranscripts(userId);
  const completedTranscripts = allTranscripts.filter((t) => t.ended_at !== null);
  const latestCompleted = completedTranscripts[0] ?? null;

  let daysSinceLastSession: number | null = null;
  if (latestCompleted?.ended_at) {
    const endedAt = new Date(latestCompleted.ended_at);
    const diffMs = now.getTime() - endedAt.getTime();
    daysSinceLastSession = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  }

  const currentDate = formatLocalDate(now);

  // YAML front matter — lightweight metadata for the system prompt.
  const frontMatter = [
    '---',
    'session_context:',
    `  session_number: ${sessionNumber}`,
    `  current_date: "${currentDate}"`,
    `  days_since_last_session: ${daysSinceLastSession === null ? 'null' : daysSinceLastSession}`,
    '---',
    '',
  ].join('\n');

  const parts: string[] = [];
  let charCount = 0;

  parts.push(frontMatter);
  charCount += frontMatter.length;

  // 1. The Arc — mentor's living understanding. Always loaded if it exists.
  const arc = await storage.getArc(userId);
  if (arc) {
    const arcSection = `## Your Understanding of This Person\n\n${arc.arc_markdown}`;
    if (withinBudget(maxChars, charCount, arcSection)) {
      parts.push(arcSection);
      charCount += arcSection.length;
    }
  }

  // 2. All session notebooks, newest first.
  const notebooks = await storage.listNotebooks(userId);
  if (notebooks.length > 0) {
    const notebookHeader = '\n## Session Notebooks';
    if (withinBudget(maxChars, charCount, notebookHeader)) {
      parts.push(notebookHeader);
      charCount += notebookHeader.length;

      for (const notebook of notebooks) {
        const section = `\n${formatNotebookSection(notebook)}`;
        if (!withinBudget(maxChars, charCount, section)) break;
        parts.push(section);
        charCount += section.length;
      }
    }
  }

  // 3. Raw transcripts — recent first, then random selection up to budget.
  if (completedTranscripts.length > 0) {
    const recentTranscripts = completedTranscripts.slice(0, RECENT_TRANSCRIPT_COUNT);
    const olderTranscripts = completedTranscripts.slice(RECENT_TRANSCRIPT_COUNT);
    const randomOlder = shuffle(olderTranscripts);
    const transcriptQueue = [...recentTranscripts, ...randomOlder];

    const transcriptSections: string[] = [];
    let transcriptChars = 0;

    for (const transcript of transcriptQueue) {
      const messages = await loadTranscriptMessages(storage, key, transcript);
      const section = `\n${formatTranscriptSection(transcript, messages)}`;
      if (!withinBudget(maxChars, charCount + transcriptChars, section)) continue;
      transcriptSections.push(section);
      transcriptChars += section.length;
    }

    if (transcriptSections.length > 0) {
      const header = '\n## Past Conversations';
      if (withinBudget(maxChars, charCount, header)) {
        parts.push(header);
        charCount += header.length;
        for (const section of transcriptSections) {
          if (!withinBudget(maxChars, charCount, section)) break;
          parts.push(section);
          charCount += section.length;
        }
      }
    }
  }

  return parts.join('\n');
}
