/**
 * Parser for the small Markdown subset used in answers and rule texts:
 * paragraphs (blank-line separated), "- " bullets, **bold**, inline legal
 * references `[ref:<id>]` and to-confirm placeholders `{{UPPER_SNAKE}}`.
 *
 * Rendering happens in Angular templates (no innerHTML), so references can be
 * real buttons that open the citation sheet.
 */
export type Inline =
  | { t: 'text'; v: string; bold?: boolean }
  | { t: 'ref'; id: string }
  | { t: 'confirm'; key: string };

export type Block = { type: 'p'; inlines: Inline[] } | { type: 'ul'; items: Inline[][] };

const TOKEN = /(\*\*[^*]+\*\*|\[ref:[a-z0-9-]+\]|\{\{[A-Z][A-Z0-9_]*\}\})/g;

export function parseInline(text: string): Inline[] {
  const out: Inline[] = [];
  for (const part of text.split(TOKEN)) {
    if (!part) continue;
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      out.push({ t: 'text', v: part.slice(2, -2), bold: true });
    } else if (part.startsWith('[ref:')) {
      out.push({ t: 'ref', id: part.slice(5, -1) });
    } else if (part.startsWith('{{')) {
      out.push({ t: 'confirm', key: part.slice(2, -2) });
    } else {
      out.push({ t: 'text', v: part });
    }
  }
  return out;
}

export function parseRich(text: string): Block[] {
  const blocks: Block[] = [];
  const chunks = text
    .replace(/\r\n/g, '\n')
    .split(/\n\s*\n/)
    .map((c) => c.trim())
    .filter(Boolean);
  for (const chunk of chunks) {
    const lines = chunk.split('\n');
    let para: string[] = [];
    let items: string[] = [];
    const flushPara = () => {
      if (para.length) blocks.push({ type: 'p', inlines: parseInline(para.join(' ')) });
      para = [];
    };
    const flushList = () => {
      if (items.length) blocks.push({ type: 'ul', items: items.map(parseInline) });
      items = [];
    };
    for (const raw of lines) {
      const line = raw.trim();
      if (/^[-•]\s+/.test(line)) {
        flushPara();
        items.push(line.replace(/^[-•]\s+/, ''));
      } else if (items.length && line) {
        // continuation of the previous bullet
        items[items.length - 1] += ' ' + line;
      } else {
        flushList();
        para.push(line);
      }
    }
    flushPara();
    flushList();
  }
  return blocks;
}

/** All reference ids used inline. */
export function inlineRefs(text: string): string[] {
  return [...text.matchAll(/\[ref:([a-z0-9-]+)\]/g)].map((m) => m[1]);
}
