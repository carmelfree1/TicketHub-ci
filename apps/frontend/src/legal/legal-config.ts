/**
 * Identity of the company that operates the service, filled in at build time from VITE_LEGAL_* variables.
 * The legal pages print these values; nothing here is invented. A release build refuses to run while any required value
 * is missing (see build/legal-guard.ts), so an unfinished notice cannot reach production by accident.
 */
export interface LegalConfig {
  companyName: string;
  legalForm: string;
  shareCapital: string;
  registrationNumber: string;
  taxNumber: string;
  address: string;
  contactEmail: string;
  contactPhone: string;
  publicationDirector: string;
  hostName: string;
  hostAddress: string;
  hostingCountry: string;
  dataProtectionEmail: string;
  artciReference: string;
  siteUrl: string;
}

const env = import.meta.env as unknown as Record<string, string | undefined>;
const read = (name: string): string => (env[name] ?? '').trim();

export const legal: LegalConfig = {
  companyName: read('VITE_LEGAL_COMPANY_NAME'),
  legalForm: read('VITE_LEGAL_FORM'),
  shareCapital: read('VITE_LEGAL_SHARE_CAPITAL'),
  registrationNumber: read('VITE_LEGAL_REGISTRATION_NUMBER'),
  taxNumber: read('VITE_LEGAL_TAX_NUMBER'),
  address: read('VITE_LEGAL_ADDRESS'),
  contactEmail: read('VITE_LEGAL_CONTACT_EMAIL'),
  contactPhone: read('VITE_LEGAL_CONTACT_PHONE'),
  publicationDirector: read('VITE_LEGAL_PUBLICATION_DIRECTOR'),
  hostName: read('VITE_LEGAL_HOST_NAME'),
  hostAddress: read('VITE_LEGAL_HOST_ADDRESS'),
  hostingCountry: read('VITE_LEGAL_HOSTING_COUNTRY'),
  dataProtectionEmail: read('VITE_LEGAL_DATA_PROTECTION_EMAIL') || read('VITE_LEGAL_CONTACT_EMAIL'),
  artciReference: read('VITE_LEGAL_ARTCI_REFERENCE'),
  siteUrl: read('VITE_SITE_URL').replace(/\/$/, ''),
};

/** Values the notice cannot do without. Share capital, tax number and the ARTCI reference are optional. */
export const REQUIRED_LEGAL_FIELDS = [
  'VITE_LEGAL_COMPANY_NAME',
  'VITE_LEGAL_FORM',
  'VITE_LEGAL_REGISTRATION_NUMBER',
  'VITE_LEGAL_ADDRESS',
  'VITE_LEGAL_CONTACT_EMAIL',
  'VITE_LEGAL_CONTACT_PHONE',
  'VITE_LEGAL_PUBLICATION_DIRECTOR',
  'VITE_LEGAL_HOST_NAME',
  'VITE_LEGAL_HOST_ADDRESS',
  'VITE_LEGAL_HOSTING_COUNTRY',
  'VITE_SITE_URL',
] as const;

export function missingLegalFields(values: Record<string, string | undefined> = env): string[] {
  return REQUIRED_LEGAL_FIELDS.filter((name) => !(values[name] ?? '').trim());
}

export const legalIsComplete = missingLegalFields().length === 0;
