type ApiErrorPayload = {
  error?: {
    code?: string;
    message?: string;
    request_id?: string;
  };
};

export class ApiError extends Error {
  status: number;
  code?: string;
  requestId?: string;

  constructor(message: string, details: { status: number; code?: string; requestId?: string }) {
    super(message);
    this.name = 'ApiError';
    this.status = details.status;
    this.code = details.code;
    this.requestId = details.requestId;
  }
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';

/**
 * apiFetch wraps fetch with JSON parsing, error envelopes, and cookie credentials.
 */
export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  const contentType = response.headers.get('content-type') ?? '';
  const isJson = contentType.includes('application/json');
  const payload = isJson ? ((await response.json()) as ApiErrorPayload | T) : null;

  if (!response.ok) {
    const errorPayload = payload as ApiErrorPayload | null;
    const message = errorPayload?.error?.message ?? 'Something went wrong.';
    throw new ApiError(message, {
      status: response.status,
      code: errorPayload?.error?.code,
      requestId: errorPayload?.error?.request_id,
    });
  }

  return (payload ?? (null as T)) as T;
}
