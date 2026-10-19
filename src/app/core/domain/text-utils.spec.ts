import { bestAnswer, chunkPhrases, scoreAnswer } from './qa-matcher';
import { isExampleRef, newProjectRef, nextEnquiryRef } from './refs';
import { inlineRefs, parseInline, parseRich } from './richtext';
import { findPlaceholders, renderLocalized, renderTemplate } from './template';
import { containsPhrase, normalize } from './text';
import type { QaAnswer } from './types';
import answersJson from '../../../assets/data/qa/answers.json';

const ANSWERS = answersJson.answers as QaAnswer[];

describe('template', () => {
  it('replaces variables and leaves unknown ones and placeholders', () => {
    expect(renderTemplate('A {{ctx.x}} {{ctx.y}} {{TO_CONFIRM}}', { 'ctx.x': 1 })).toBe('A 1 {{ctx.y}} {{TO_CONFIRM}}');
  });

  it('keeps or drops sections', () => {
    const t = 'A{{#ctx}} with {{ctx.n}}{{/ctx}}{{^ctx}} without{{/ctx}}.';
    expect(renderTemplate(t, { 'ctx.n': 'X' }, { ctx: true })).toBe('A with X.');
    expect(renderTemplate(t, {}, { ctx: false })).toBe('A without.');
  });

  it('renders all locales with shared or per-locale vars', () => {
    const text = { pt: 'p {{v}}', en: 'e {{v}}', fr: 'f {{v}}' };
    expect(renderLocalized(text, { v: 1 })).toEqual({ pt: 'p 1', en: 'e 1', fr: 'f 1' });
    expect(renderLocalized(text, { pt: { v: 'a' }, en: { v: 'b' } })).toEqual({ pt: 'p a', en: 'e b', fr: 'f {{v}}' });
  });

  it('finds placeholders', () => {
    expect(findPlaceholders('x {{A_B}} {{ctx.c}} {{C1}}')).toEqual(['A_B', 'C1']);
  });
});

describe('richtext', () => {
  it('parses paragraphs, bullets, bold, refs and placeholders', () => {
    const blocks = parseRich('**Sim.** Texto [ref:lei-8-2023].\n\nCondições:\n- um {{X_Y}}\n- dois\n  continua\n\nFim');
    expect(blocks.map((b) => b.type)).toEqual(['p', 'p', 'ul', 'p']);
    expect(blocks[0]).toEqual({
      type: 'p',
      inlines: [
        { t: 'text', v: 'Sim.', bold: true },
        { t: 'text', v: ' Texto ' },
        { t: 'ref', id: 'lei-8-2023' },
        { t: 'text', v: '.' },
      ],
    });
    const list = blocks[2];
    expect(list.type === 'ul' && list.items.length).toBe(2);
    expect(list.type === 'ul' && list.items[0]).toContainEqual({ t: 'confirm', key: 'X_Y' });
    expect(list.type === 'ul' && list.items[1]).toEqual([{ t: 'text', v: 'dois continua' }]);
  });

  it('handles empty input and inline refs', () => {
    expect(parseRich('')).toEqual([]);
    expect(parseInline('')).toEqual([]);
    expect(inlineRefs('a [ref:x-1] b [ref:y]')).toEqual(['x-1', 'y']);
  });
});

describe('text and refs', () => {
  it('normalises and matches phrases with prefixes', () => {
    expect(normalize('Exportação, Câmbios!')).toBe('exportacao cambios');
    expect(containsPhrase('nos exportamos caju', 'export*')).toBe(true);
    expect(containsPhrase('nos exportamos caju', 'exporta')).toBe(false);
    expect(containsPhrase('abc', '')).toBe(false);
  });

  it('generates enquiry references in sequence per year', () => {
    expect(nextEnquiryRef(['TA-IM-2026-0141', 'TA-IM-2026-0139', 'TA-IM-2025-0900', 'bad'], 2026)).toBe('TA-IM-2026-0142');
    expect(nextEnquiryRef([], 2027)).toBe('TA-IM-2027-0001');
  });

  it('generates project references', () => {
    expect(newProjectRef(2026, () => 0)).toBe('TA-IM-P26-2222');
    expect(newProjectRef(2026)).toMatch(/^TA-IM-P26-[A-Z2-9]{4}$/);
    expect(isExampleRef('TA-IM-EX01')).toBe(true);
    expect(isExampleRef('TA-IM-P26-2222')).toBe(false);
  });
});

describe('qa matcher', () => {
  it('matches the flagship dividends question in all three languages', () => {
    expect(bestAnswer('Uma empresa com sócio sul-africano pode repatriar dividendos?', ANSWERS, 'pt').answer?.id).toBe('exchange-1');
    expect(bestAnswer('Can a South African shareholder repatriate dividends?', ANSWERS, 'en').answer?.id).toBe('exchange-1');
    expect(bestAnswer('Un associé sud-africain peut-il rapatrier des dividendes ?', ANSWERS, 'fr').answer?.id).toBe('exchange-1');
  });

  it('matches every canonical question to its own answer', () => {
    for (const a of ANSWERS) {
      for (const l of ['pt', 'en', 'fr'] as const) {
        const hit = bestAnswer(a.question[l], ANSWERS, l).answer?.id;
        expect.soft(hit, `${a.id} [${l}]`).toBe(a.id);
      }
    }
  });

  it('returns no answer for unrelated questions', () => {
    const r = bestAnswer('Qual é a receita de bolo de chocolate?', ANSWERS, 'pt');
    expect(r.answer).toBeNull();
    expect(scoreAnswer('', ANSWERS[0], 'pt')).toBe(0);
  });

  it('chunks text by phrase', () => {
    const chunks = chunkPhrases('Primeira frase longa o suficiente. Segunda frase também longa.\n\n- item');
    expect(chunks.join('')).toBe('Primeira frase longa o suficiente. Segunda frase também longa.\n\n- item');
    expect(chunks.length).toBeGreaterThan(2);
  });
});
