import { evaluate, matches, selectAll, selectFirst } from './conditions';
import type { Condition } from './types';

const facts = { a: 5, b: 'x', c: true };
const c = (field: string, op: Condition['op'], value: unknown): Condition => ({ field, op, value });

describe('conditions', () => {
  it('eq', () => {
    expect(evaluate(c('b', 'eq', 'x'), facts)).toBe(true);
    expect(evaluate(c('c', 'eq', false), facts)).toBe(false);
  });

  it('in', () => {
    expect(evaluate(c('b', 'in', ['x', 'y']), facts)).toBe(true);
    expect(evaluate(c('b', 'in', ['y']), facts)).toBe(false);
    expect(evaluate(c('b', 'in', 'x'), facts)).toBe(false);
  });

  it('gte and lt', () => {
    expect(evaluate(c('a', 'gte', 5), facts)).toBe(true);
    expect(evaluate(c('a', 'gte', 6), facts)).toBe(false);
    expect(evaluate(c('a', 'lt', 6), facts)).toBe(true);
    expect(evaluate(c('a', 'lt', 5), facts)).toBe(false);
    expect(evaluate(c('b', 'gte', 1), facts)).toBe(false);
    expect(evaluate(c('b', 'lt', 1), facts)).toBe(false);
  });

  it('between is inclusive', () => {
    expect(evaluate(c('a', 'between', [5, 10]), facts)).toBe(true);
    expect(evaluate(c('a', 'between', [1, 5]), facts)).toBe(true);
    expect(evaluate(c('a', 'between', [6, 10]), facts)).toBe(false);
    expect(evaluate(c('a', 'between', [1]), facts)).toBe(false);
    expect(evaluate(c('a', 'between', ['1', 10]), facts)).toBe(false);
    expect(evaluate(c('b', 'between', [1, 10]), facts)).toBe(false);
  });

  it('fails closed on unknown facts and operators', () => {
    expect(evaluate(c('missing', 'eq', undefined), facts)).toBe(false);
    expect(evaluate({ field: 'a', op: 'nope' as Condition['op'], value: 5 }, facts)).toBe(false);
  });

  it('combines conditions with AND and selects rules', () => {
    const rules = [
      { id: 'r1', when: [c('a', 'gte', 10)], then: 1 },
      { id: 'r2', when: [c('a', 'gte', 1), c('c', 'eq', true)], then: 2 },
      { id: 'r3', when: [], then: 3 },
    ];
    expect(matches(rules[2], facts)).toBe(true);
    expect(selectFirst(rules, facts)?.id).toBe('r2');
    expect(selectAll(rules, facts).map((r) => r.id)).toEqual(['r2', 'r3']);
    expect(selectFirst([rules[0]], facts)).toBeUndefined();
  });
});
