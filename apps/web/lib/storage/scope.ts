import { setActiveDbScope } from '@/lib/db';

function normalizeScopeValue(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '-');
}

export function setStorageScopeForUser(userId: string) {
  const normalized = normalizeScopeValue(userId);
  if (!normalized) {
    throw new Error('Missing user scope for storage.');
  }
  setActiveDbScope(`user-${normalized}`);
}
