export const DEFAULT_CURRENCY = 'XOF' as const;

/** Normalize an Ivorian national number to E.164, or return null for invalid input. */
export function normalizeCiPhone(value: string): string | null {
  const digits = value.replace(/\D/g, '');
  const national = digits.startsWith('225') ? digits.slice(3) : digits;
  return /^0[0-9]{9}$/.test(national) ? `+225${national}` : null;
}

/** Format an XOF amount without fractional digits for shared UI and reports. */
export function formatXof(amount: number): string {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(amount);
}

/**
 * Version of the terms of use and privacy policy shown to people when they create an account. Change it whenever either
 * text changes in substance: the API refuses sign-ups that accepted another version, so nobody agrees to an old text.
 */
export const TERMS_VERSION = '2026-10-04';
