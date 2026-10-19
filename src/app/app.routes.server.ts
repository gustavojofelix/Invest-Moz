import { RenderMode, type ServerRoute } from '@angular/ssr';
import { LOCALES, TOPICS } from '@core/domain/types';

/**
 * Static site generation. Only public, content-led pages are prerendered (in
 * every locale); the rest is served by the client-rendered shell
 * (index.csr.html) through the Netlify SPA fallback.
 */
const langs = async () => LOCALES.map((lang) => ({ lang }));

export const serverRoutes: ServerRoute[] = [
  { path: ':lang', renderMode: RenderMode.Prerender, getPrerenderParams: langs },
  { path: ':lang/questions', renderMode: RenderMode.Prerender, getPrerenderParams: langs },
  {
    path: ':lang/questions/:topic',
    renderMode: RenderMode.Prerender,
    getPrerenderParams: async () => LOCALES.flatMap((lang) => TOPICS.map((topic) => ({ lang, topic }))),
  },
  { path: '**', renderMode: RenderMode.Client },
];
