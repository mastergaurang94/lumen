/**
 * Dev-only utility for auth bypass during local development.
 * Uses window.location instead of useSearchParams to avoid Suspense requirements.
 */

/**
 * Appends ?dev_auth=1 to a path if we're in development mode with dev_auth enabled.
 * Call this inside useEffect or event handlers (not during render) since it reads window.location.
 */
export function withDevAuth(path: string): string {
  if (process.env.NODE_ENV !== 'development') return path;
  if (typeof window === 'undefined') return path;
  if (!window.location.search.includes('dev_auth=1')) return path;
  return `${path}?dev_auth=1`;
}

/**
 * Checks if dev_auth bypass is active.
 */
export function isDevAuthEnabled(): boolean {
  if (process.env.NODE_ENV !== 'development') return false;
  if (typeof window === 'undefined') return false;
  return window.location.search.includes('dev_auth=1');
}
