/**
 * DEMO CREDENTIALS — NOT REAL SECURITY.
 *
 * This proof of concept has no backend. The "login" only compares these
 * public values in the browser and stores a flag in localStorage. Anyone can
 * read this file. They are shown on the landing page on purpose so the client
 * can open the firm inbox during the presentation.
 *
 * Real authentication arrives with the backend (see README → Future backend).
 */
export const DEMO_CREDENTIALS = {
  email: 'demo@taxadvisorymoz.com',
  password: 'InvestMoz2026',
  displayName: 'Tax Advisory',
} as const;
