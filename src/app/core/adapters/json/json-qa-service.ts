import { Injectable, PendingTasks, inject } from '@angular/core';
import { tracked } from '../pending';
import { Observable } from 'rxjs';
import { bestAnswer, chunkPhrases } from '../../domain/qa-matcher';
import type { Locale, QaAnswer, QaTopic, TopicId } from '../../domain/types';
import { QaService, type QaMatch } from '../../ports';

/** Answer bank in JSON, keyword matching, and simulated phrase-by-phrase streaming. */
@Injectable()
export class JsonQaService extends QaService {
  private readonly tasks = inject(PendingTasks);
  private topicsP?: Promise<QaTopic[]>;
  private answersP?: Promise<QaAnswer[]>;

  topics(): Promise<QaTopic[]> {
    this.topicsP ??= tracked(this.tasks, () =>
      import('../../../../assets/data/qa/topics.json').then((m) => m.default.topics as QaTopic[]),
    );
    return this.topicsP;
  }

  async answers(topic?: TopicId): Promise<QaAnswer[]> {
    this.answersP ??= tracked(this.tasks, () =>
      import('../../../../assets/data/qa/answers.json').then((m) => m.default.answers as QaAnswer[]),
    );
    const all = await this.answersP;
    return topic ? all.filter((a) => a.topic === topic) : all;
  }

  async match(question: string, lang: Locale): Promise<QaMatch> {
    return bestAnswer(question, await this.answers(), lang);
  }

  stream(text: string, opts: { instant?: boolean } = {}): Observable<string> {
    return new Observable<string>((sub) => {
      if (opts.instant) {
        sub.next(text);
        sub.complete();
        return;
      }
      const chunks = chunkPhrases(text);
      let i = 0;
      let timer: ReturnType<typeof setTimeout>;
      const tick = () => {
        if (i >= chunks.length) {
          sub.complete();
          return;
        }
        sub.next(chunks[i++]);
        timer = setTimeout(tick, 70 + Math.min(160, chunks[i - 1].length * 2));
      };
      // "a analisar…" pause before the first phrase
      timer = setTimeout(tick, 650);
      return () => clearTimeout(timer);
    });
  }
}
