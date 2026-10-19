import type { Condition, Rule } from './types';

/**
 * Condition operators (documented; the Python engine implements the same set):
 *
 * | op        | value              | true when                                   |
 * |-----------|--------------------|---------------------------------------------|
 * | `eq`      | any scalar         | fact === value                              |
 * | `in`      | array              | value includes fact                         |
 * | `gte`     | number             | fact >= value                               |
 * | `lt`      | number             | fact < value                                |
 * | `between` | [min, max] numbers | min <= fact <= max (both inclusive)         |
 *
 * Unknown facts or operators never match (fail closed).
 */
export type Facts = Readonly<Record<string, unknown>>;

export function evaluate(condition: Condition, facts: Facts): boolean {
  const fact = facts[condition.field];
  if (fact === undefined) return false;
  const { value } = condition;
  switch (condition.op) {
    case 'eq':
      return fact === value;
    case 'in':
      return Array.isArray(value) && value.includes(fact);
    case 'gte':
      return typeof fact === 'number' && typeof value === 'number' && fact >= value;
    case 'lt':
      return typeof fact === 'number' && typeof value === 'number' && fact < value;
    case 'between':
      return (
        typeof fact === 'number' &&
        Array.isArray(value) &&
        value.length === 2 &&
        typeof value[0] === 'number' &&
        typeof value[1] === 'number' &&
        fact >= value[0] &&
        fact <= value[1]
      );
    default:
      return false;
  }
}

export function matches(rule: Pick<Rule<unknown>, 'when'>, facts: Facts): boolean {
  return rule.when.every((c) => evaluate(c, facts));
}

/** All rules whose conditions hold, in file order. */
export function selectAll<T>(rules: readonly Rule<T>[], facts: Facts): Rule<T>[] {
  return rules.filter((r) => matches(r, facts));
}

/** The first rule whose conditions hold, or undefined. */
export function selectFirst<T>(rules: readonly Rule<T>[], facts: Facts): Rule<T> | undefined {
  return rules.find((r) => matches(r, facts));
}
