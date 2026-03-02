/**
 * Formats a date string (UTC) into a human-readable format.
 * Used across tote and item detail sub-components.
 */
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'Z');
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Formats a date string (UTC) into a date-only format (no time component).
 * Used on list pages where time is not needed.
 */
export function formatDateShort(dateStr: string): string {
  const date = new Date(dateStr + 'Z');
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
