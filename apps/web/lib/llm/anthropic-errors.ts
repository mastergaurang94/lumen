const DEFAULT_PROVIDER_ERROR_MESSAGE = 'Provider request failed.';

export async function parseAnthropicErrorDetails(response: Response): Promise<string | null> {
  const contentType = response.headers.get('content-type') ?? '';
  try {
    if (contentType.includes('application/json')) {
      const payload = (await response.json()) as { error?: { message?: string } };
      return payload?.error?.message ?? null;
    }
    const text = await response.text();
    return text.trim() || null;
  } catch {
    return null;
  }
}

export function formatProviderErrorMessage(
  baseMessage: string,
  details: string | null,
  isDev: boolean,
): string {
  if (!isDev || !details) {
    return baseMessage;
  }
  return `${baseMessage} (${details})`;
}

export { DEFAULT_PROVIDER_ERROR_MESSAGE };
