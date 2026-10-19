import { DOCUMENT, Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { SafeStorage } from '../adapters/safe-storage';

export type Theme = 'light' | 'dark';

/** Light by default (the product reads like a printed memo); dark is opt-in. */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly storage = inject(SafeStorage);
  private readonly document = inject(DOCUMENT);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  readonly theme = signal<Theme>('light');

  init(): void {
    if (!this.browser) return;
    const stored = this.storage.get<Theme>('theme', 'light');
    this.apply(stored === 'dark' ? 'dark' : 'light');
  }

  toggle(): void {
    this.apply(this.theme() === 'dark' ? 'light' : 'dark');
  }

  apply(theme: Theme): void {
    this.theme.set(theme);
    this.document.documentElement.dataset['theme'] = theme;
    this.storage.set('theme', theme);
  }
}
