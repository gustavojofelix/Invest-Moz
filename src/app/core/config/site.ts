/**
 * Site-wide constants.
 *
 * `SITE_ORIGIN_TOKEN` is written into prerendered HTML (canonical and hreflang
 * links) and replaced after the build by `scripts/postbuild.mjs` with the
 * Netlify `URL` environment variable. In the browser the real origin is used.
 */
export const SITE_ORIGIN_TOKEN = 'https://__SITE_ORIGIN__';

export const FIRM = {
  name: 'Tax Advisory',
  legalName: 'Tax Advisory — Sociedade Unipessoal, Lda',
  email: 'info@taxadvisorymoz.com',
  technology: 'Law Technology Solutions',
} as const;
