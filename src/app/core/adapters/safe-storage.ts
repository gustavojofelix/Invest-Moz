import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * localStorage wrapper that never throws. Falls back to an in-memory map when
 * storage is unavailable (SSR/prerender, private mode, blocked storage, quota).
 */
@Injectable({ providedIn: 'root' })
export class SafeStorage {
  static readonly PREFIX = 'investmoz.';
  private readonly memory = new Map<string, string>();
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));

  get<T>(key: string, fallback: T): T {
    const raw = this.read(SafeStorage.PREFIX + key);
    if (raw === null) return fallback;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }

  set(key: string, value: unknown): void {
    const raw = JSON.stringify(value);
    this.memory.set(SafeStorage.PREFIX + key, raw);
    if (!this.browser) return;
    try {
      localStorage.setItem(SafeStorage.PREFIX + key, raw);
    } catch {
      /* in-memory copy is kept */
    }
  }

  remove(key: string): void {
    this.memory.delete(SafeStorage.PREFIX + key);
    if (!this.browser) return;
    try {
      localStorage.removeItem(SafeStorage.PREFIX + key);
    } catch {
      /* ignore */
    }
  }

  /** Removes every Invest Moz key, optionally keeping some (e.g. language, theme). */
  clearAll(keep: string[] = []): void {
    const kept = new Set(keep.map((k) => SafeStorage.PREFIX + k));
    for (const k of [...this.memory.keys()]) if (!kept.has(k)) this.memory.delete(k);
    if (!this.browser) return;
    try {
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k?.startsWith(SafeStorage.PREFIX) && !kept.has(k)) keys.push(k);
      }
      keys.forEach((k) => localStorage.removeItem(k));
    } catch {
      /* ignore */
    }
  }

  private read(fullKey: string): string | null {
    if (this.browser) {
      try {
        const v = localStorage.getItem(fullKey);
        if (v !== null) return v;
      } catch {
        /* fall through to memory */
      }
    }
    return this.memory.get(fullKey) ?? null;
  }
}
