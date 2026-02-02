import { ApiError, apiFetch } from '@/lib/api/client';

type RequestLinkResponse = {
  status: 'ok';
  magic_link?: string;
};

type VerifyResponse = {
  status: 'ok';
};

type SessionStatusResponse = {
  status: 'ok';
};

/**
 * Requests a magic link for the provided email address.
 */
export function requestMagicLink(email: string) {
  return apiFetch<RequestLinkResponse>('/v1/auth/request-link', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

/**
 * Exchanges a magic-link token for a session cookie.
 */
export function verifyMagicLink(token: string) {
  return apiFetch<VerifyResponse>('/v1/auth/verify', {
    method: 'POST',
    body: JSON.stringify({ token }),
  });
}

/**
 * Checks whether the current browser session is authenticated.
 */
export async function getAuthSession(): Promise<boolean> {
  try {
    await apiFetch<SessionStatusResponse>('/v1/auth/session');
    return true;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return false;
    }
    throw error;
  }
}
