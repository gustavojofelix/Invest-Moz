import type { EnquiryStatus } from '@core/domain/types';

/** Pipeline stages, from first contact to mandate. */
export const STATUSES: EnquiryStatus[] = ['new', 'in_review', 'quoted', 'won'];
