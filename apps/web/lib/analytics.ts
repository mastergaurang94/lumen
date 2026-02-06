type AnalyticsEvent = {
  name: string;
  timestamp: string;
  data?: Record<string, unknown>;
};

const STORAGE_KEY = 'lumen.analytics';
const MAX_EVENTS = 200;

function safeParseEvents(raw: string | null): AnalyticsEvent[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as AnalyticsEvent[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function trackEvent(name: string, data?: Record<string, unknown>) {
  if (typeof window === 'undefined') return;

  const entry: AnalyticsEvent = {
    name,
    timestamp: new Date().toISOString(),
    data,
  };

  try {
    const existing = safeParseEvents(window.localStorage.getItem(STORAGE_KEY));
    const next = [...existing, entry].slice(-MAX_EVENTS);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Ignore localStorage errors (private mode / quota).
  }

  // Lightweight signal for debugging without a backend.
  console.info('[analytics]', entry);
}
