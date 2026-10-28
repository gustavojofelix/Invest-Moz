import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import type { Locale } from '@core/domain/types';

/** Recognition language per locale (BCP 47 tags the Web Speech API knows). */
const SPEECH_LANG: Record<Locale, string> = {
  pt: 'pt-PT',
  en: 'en-GB',
  fr: 'fr-FR',
  zh: 'zh-CN',
  ar: 'ar-EG',
  hi: 'hi-IN',
  sw: 'sw-TZ',
  af: 'af-ZA',
};

interface RecognitionResultEvent {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean } & ArrayLike<{ transcript: string }>>;
}

interface Recognition {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onresult: ((e: RecognitionResultEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

type RecognitionCtor = new () => Recognition;

/**
 * Voice input through the browser's Web Speech API (`SpeechRecognition`).
 * `supported` stays false on the server and in browsers without the API, so
 * call `detect()` after the first render (keeps hydration stable).
 */
@Injectable({ providedIn: 'root' })
export class SpeechInput {
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private recognition: Recognition | null = null;
  readonly supported = signal(false);
  readonly listening = signal(false);
  readonly error = signal<string | null>(null);

  detect(): void {
    this.supported.set(!!this.ctor());
  }

  /** Starts listening; `onText` receives the running transcript. */
  start(lang: Locale, onText: (text: string, final: boolean) => void): void {
    const Ctor = this.ctor();
    if (!Ctor || this.listening()) return;
    const r = new Ctor();
    r.lang = SPEECH_LANG[lang];
    r.interimResults = true;
    r.continuous = false;
    r.maxAlternatives = 1;
    r.onresult = (e) => {
      let text = '';
      let final = false;
      for (const result of Array.from(e.results)) {
        text += result[0]?.transcript ?? '';
        final = result.isFinal;
      }
      onText(text.trim(), final);
    };
    r.onerror = (e) => this.error.set(e.error);
    r.onend = () => {
      this.listening.set(false);
      this.recognition = null;
    };
    this.error.set(null);
    try {
      r.start();
      this.recognition = r;
      this.listening.set(true);
    } catch {
      this.error.set('start');
    }
  }

  stop(): void {
    this.recognition?.stop();
  }

  private ctor(): RecognitionCtor | null {
    if (!this.browser) return null;
    const w = window as unknown as {
      SpeechRecognition?: RecognitionCtor;
      webkitSpeechRecognition?: RecognitionCtor;
    };
    return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
  }
}
