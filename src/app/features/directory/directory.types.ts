import type { Locale, LocalizedText, ProvinceCode } from '@core/domain/types';

/**
 * Shape of `src/assets/data/directory/listings.json` — the ecosystem directory
 * (screen 14). The back office "Partners and directory" screen (23) reads the
 * same file, read-only.
 *
 * Rules the data follows:
 * - Public bodies are always listed and free: `sponsored: false`, `renewal: null`.
 * - Unnamed sponsors and providers use bracketed placeholders: "[Bank]".
 * - Contacts are public knowledge or null (never invented).
 * - `sponsored` listings are always labelled "Sponsored" and never placed above
 *   public bodies; `verified` means registration and licences were checked.
 */
export const LISTING_TYPES = [
  'public',
  'association',
  'law_firm',
  'tax',
  'bank',
  'accounting',
  'logistics',
  'consulting',
] as const;
export type ListingType = (typeof LISTING_TYPES)[number];

export interface DirectoryListing {
  id: string;
  type: ListingType;
  /** Display name: the acronym or the brand ("APIEX", "[Bank]"). */
  name: string;
  /** Official full name, in Portuguese for Mozambican bodies. */
  fullName?: string;
  description: LocalizedText;
  /** Short services line: "Project registration · investment certificate". */
  services: LocalizedText;
  /** `national` or the provinces covered. */
  coverage: 'national' | ProvinceCode[];
  website: string | null;
  email: string | null;
  phone: string | null;
  /** Languages the provider can work in. */
  languages: Locale[];
  verified: boolean;
  /** ISO date of the last verification; null when not verified yet. */
  verifiedAt: string | null;
  sponsored: boolean;
  /** Sponsor tier shown in the back office; null when not sponsored. */
  sponsorTier: 'founding' | 'standard' | null;
  /** Listing renewal date (ISO); null for public bodies (free, no renewal). */
  renewal: string | null;
  /** Tiva's expert partner (handoff from "Talk to an expert"). */
  partner?: boolean;
}

export interface DirectoryData {
  updated: string;
  status: 'illustrative' | 'verified';
  listings: DirectoryListing[];
}
