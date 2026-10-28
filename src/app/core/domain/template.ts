import { LOCALES, type Locale, type LocalizedText } from './types';

/**
 * Text templating shared by rule tables and the Q&A answer bank.
 *
 * - `{{name.path}}` (lower-case first letter): a variable, replaced from `vars`.
 *   Unknown variables are left untouched so they are easy to spot.
 * - `{{#ctx}}…{{/ctx}}`: kept only when `sections.ctx` is true.
 * - `{{^ctx}}…{{/ctx}}`: kept only when `sections.ctx` is false.
 * - `{{UPPER_SNAKE}}`: a to-confirm placeholder. Left untouched here; the UI
 *   renders it as an "a confirmar" chip. Listed in CONTENT_TO_CONFIRM.md.
 */
export type TemplateVars = Readonly<Record<string, string | number | undefined>>;

const SECTION = /\{\{([#^])(\w+)\}\}([\s\S]*?)\{\{\/\2\}\}/g;
const VARIABLE = /\{\{([a-z][\w.]*)\}\}/g;
const PLACEHOLDER = /\{\{([A-Z][A-Z0-9_]*)\}\}/g;

export function renderTemplate(
  text: string,
  vars: TemplateVars = {},
  sections: Readonly<Record<string, boolean>> = {},
): string {
  const withSections = text.replace(SECTION, (_m, kind: string, name: string, body: string) => {
    const on = sections[name] === true;
    return (kind === '#' ? on : !on) ? body : '';
  });
  return withSections
    .replace(VARIABLE, (m, key: string) => {
      const v = vars[key];
      return v === undefined ? m : String(v);
    })
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Renders every locale of a LocalizedText; `vars` may differ per locale. */
export function renderLocalized(
  text: LocalizedText,
  vars: Partial<Record<Locale, TemplateVars>> | TemplateVars = {},
  sections: Readonly<Record<string, boolean>> = {},
): LocalizedText {
  const perLocale = isPerLocale(vars);
  const out = {} as LocalizedText;
  for (const l of LOCALES) {
    out[l] = renderTemplate(text[l] ?? text.en ?? '', perLocale ? (vars[l] ?? {}) : vars, sections);
  }
  return out;
}

function isPerLocale(
  vars: Partial<Record<Locale, TemplateVars>> | TemplateVars,
): vars is Partial<Record<Locale, TemplateVars>> {
  return LOCALES.some((l) => typeof (vars as Record<string, unknown>)[l] === 'object');
}

/** Lists the to-confirm placeholders used in a string. */
export function findPlaceholders(text: string): string[] {
  return [...text.matchAll(PLACEHOLDER)].map((m) => m[1]);
}
