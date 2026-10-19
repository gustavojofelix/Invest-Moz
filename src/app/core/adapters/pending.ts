import type { PendingTasks } from '@angular/core';

/**
 * Runs an async load as an Angular pending task (so prerendering waits for it)
 * and returns its result.
 */
export function tracked<T>(tasks: PendingTasks, load: () => Promise<T>): Promise<T> {
  const done = tasks.add();
  return load().finally(done);
}
