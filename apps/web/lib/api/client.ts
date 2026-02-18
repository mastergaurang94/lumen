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

const configuredApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

// Dev fallback: when NEXT_PUBLIC_API_BASE_URL is unset and no Next rewrite is configured,
// target the local Go API directly on :8080 using the current hostname.
const devApiBaseUrl =
  process.env.NODE_ENV === 'development'
    ? typeof window !== 'undefined'
      ? `http://${window.location.hostname}:8080`
      : 'http://localhost:8080'
    : '';

const API_BASE_URL = configuredApiBaseUrl ?? devApiBaseUrl;

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
