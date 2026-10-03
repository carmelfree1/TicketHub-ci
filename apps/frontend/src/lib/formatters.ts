export { formatXof } from '@tickethub/shared';

export function formatDateTime(value: string | Date, timeZone = 'Africa/Abidjan'): string {
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short', timeZone }).format(new Date(value));
}
