// Local-only user id until auth is wired.
const USER_ID_KEY = 'lumen_user_id';

export function getOrCreateUserId(): string {
  if (typeof window === 'undefined') {
    return 'server';
  }

  const existing = window.localStorage.getItem(USER_ID_KEY);
  if (existing) return existing;

  const created = crypto.randomUUID();
  window.localStorage.setItem(USER_ID_KEY, created);
  return created;
}
