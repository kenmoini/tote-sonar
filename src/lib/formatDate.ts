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
