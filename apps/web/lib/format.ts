/**
 * Centralized date and time formatting utilities.
 */

/**
 * Format a date as "Thursday, January 29"
 */
export function formatSessionDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Format relative time until a future date.
 * Returns "3 days", "tomorrow", "5 hours", "1 hour", or "soon"
 */
export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));

  if (diffDays > 1) {
    return `${diffDays} days`;
  } else if (diffDays === 1) {
    return 'tomorrow';
  } else if (diffHours > 1) {
    return `${diffHours} hours`;
  } else if (diffHours === 1) {
    return '1 hour';
  } else {
    return 'soon';
  }
}

/**
 * Format how long ago a date was.
 * Returns "today", "yesterday", "3 days ago", "a week ago", "2 weeks ago"
 */
export function formatDaysAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 14) return 'a week ago';
  return `${Math.floor(diffDays / 7)} weeks ago`;
}

/**
 * Get time-appropriate greeting.
 * Returns "Good morning", "Good afternoon", or "Good evening"
 */
export function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 18) return 'Good afternoon';
  return 'Good evening';
}

/**
 * Format duration in minutes to human-readable string.
 * Returns "45 min", "1 hr 15 min", etc.
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) {
    return `${hours} hr`;
  }
  return `${hours} hr ${mins} min`;
}

/**
 * Format elapsed time since a start date.
 * Returns "Just started", "5 min", "1 hr 30 min"
 */
export function formatElapsedTime(startDate: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - startDate.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffMinutes < 1) {
    return 'Just started';
  }
  return formatDuration(diffMinutes);
}
