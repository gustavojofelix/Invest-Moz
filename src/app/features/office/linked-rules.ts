import type { RuleSet } from '@core/domain/rule-set';
import type { LocalizedText, QaAnswer, RefId } from '@core/domain/types';

export type LinkKind = 'step' | 'rule' | 'answer';

export interface LinkedItem {
  kind: LinkKind;
  /** Rule table name (`licences`, `triggers`…) or `qa` for answers. */
  table: string;
  id: string;
  title?: LocalizedText;
}

function isText(v: unknown): v is LocalizedText {
  return !!v && typeof v === 'object' && typeof (v as LocalizedText).en === 'string';
}

/**
 * Which rule-table entries, roadmap steps and answers cite each legal reference.
 * Read-only: computed from the bundled rule tables and the answer bank.
 */
export function linkedRules(
  rules: RuleSet,
  answers: readonly QaAnswer[],
): Map<RefId, LinkedItem[]> {
  const out = new Map<RefId, LinkedItem[]>();
  const seen = new Set<string>();
  const add = (ref: RefId, item: LinkedItem) => {
    const key = `${ref}|${item.table}|${item.id}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.set(ref, [...(out.get(ref) ?? []), item]);
  };

  const walk = (node: unknown, table: string, parentId: string): void => {
    if (Array.isArray(node)) {
      node.forEach((n, i) => walk(n, table, `${parentId}-${i}`));
      return;
    }
    if (!node || typeof node !== 'object') return;
    const obj = node as Record<string, unknown>;
    const id = typeof obj['id'] === 'string' ? obj['id'] : parentId;
    const refs = obj['refs'];
    if (Array.isArray(refs)) {
      const titleSrc = [obj['title'], obj['fact'], obj['text'], obj['label']].find(isText);
      for (const ref of refs) {
        if (typeof ref === 'string')
          add(ref, { kind: table === 'roadmap' ? 'step' : 'rule', table, id, title: titleSrc });
      }
    }
    for (const [k, v] of Object.entries(obj)) {
      if (k !== 'refs' && v && typeof v === 'object') walk(v, table, id);
    }
  };

  for (const [table, value] of Object.entries(rules)) walk(value, table, table);
  for (const a of answers) {
    for (const ref of a.refs)
      add(ref, { kind: 'answer', table: 'qa', id: a.id, title: a.question });
  }
  return out;
}
