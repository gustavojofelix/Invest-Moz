import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  resource,
  signal,
} from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { LOCALES, type Locale } from '@core/domain/types';
import { ImDatePipe } from '@core/i18n/format';
import { LocaleService } from '@core/i18n/locale.service';
import type { DirectoryListing } from '@features/directory/directory.types';
import { Icon } from '@shared/ui/icon';
import { OfficeData, type PartnerContractSeed } from './office-data';

type Filter = 'all' | 'public' | 'sponsored' | 'providers' | 'attention';
type Renewal = 'free' | 'ok' | 'due' | 'expired';
type Standing = 'public' | 'sponsored' | 'partner' | 'verified' | 'pending' | 'expired';

interface PartnerRow {
  l: DirectoryListing;
  c?: PartnerContractSeed;
  standing: Standing;
  renewal: Renewal;
  translated: Locale[];
  attention: boolean;
}

const DUE_DAYS = 90;

/** Locales a listing's own text (description and services) is translated into. */
function translatedLocales(l: DirectoryListing): Locale[] {
  return LOCALES.filter((loc) => !!l.description[loc]?.trim() && !!l.services[loc]?.trim());
}

/** 23 · Partners and directory: listings, sponsor placement, verification, renewal, languages. */
@Component({
  selector: 'im-partners-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoDirective, ImDatePipe, Icon],
  styleUrl: './office.css',
  template: `
    <div *transloco="let t" class="office-page">
      <header class="flex flex-wrap items-end justify-between gap-4">
        <div class="flex flex-col gap-1.5">
          <h1 class="font-serif text-3xl font-medium sm:text-[2rem]">
            {{ t('office.partners.title') }}
          </h1>
          <p class="text-[0.9375rem] text-muted">{{ t('office.partners.intro') }}</p>
        </div>
        <button
          type="button"
          class="btn btn-primary btn-sm"
          disabled
          [attr.aria-describedby]="'add-hint'"
        >
          <svg imIcon="plus" [size]="16" aria-hidden="true"></svg>{{ t('office.partners.add') }}
        </button>
        <span id="add-hint" class="sr-only">{{ t('office.partners.addHint') }}</span>
      </header>

      <div
        class="flex flex-wrap gap-2"
        role="group"
        [attr.aria-label]="t('office.partners.filterLabel')"
      >
        @for (f of filters; track f) {
          <button
            type="button"
            class="pill"
            [attr.aria-pressed]="filter() === f"
            (click)="filter.set(f)"
          >
            {{ t('office.partners.filter.' + f) }} · {{ counts()[f] }}
          </button>
        }
      </div>

      <div class="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22.5rem]">
        <div class="card overflow-hidden">
          <div
            class="table-wrap"
            tabindex="0"
            role="region"
            [attr.aria-label]="t('office.partners.tableCaption')"
          >
            <table class="office-table panel-table">
              <caption class="text-start">
                <span class="text-sm text-muted">
                  {{ t('office.partners.tableCaption') }} ·
                  {{ t('office.partners.count', { n: rows().length }) }}
                </span>
              </caption>
              <thead>
                <tr>
                  <th scope="col">{{ t('office.partners.col.name') }}</th>
                  <th scope="col">{{ t('office.partners.col.type') }}</th>
                  <th scope="col">{{ t('office.partners.col.status') }}</th>
                  <th scope="col">{{ t('office.partners.col.verified') }}</th>
                  <th scope="col">{{ t('office.partners.col.languages') }}</th>
                  <th scope="col">{{ t('office.partners.col.renewal') }}</th>
                </tr>
              </thead>
              <tbody>
                @for (r of rows(); track r.l.id) {
                  <tr>
                    <th scope="row">
                      <strong>{{ r.l.name }}</strong>
                      @if (r.c?.contractRef) {
                        <span class="block font-mono text-xs font-normal text-muted">{{
                          r.c!.contractRef
                        }}</span>
                      }
                    </th>
                    <td>
                      {{ t('office.partners.type.' + r.l.type) }}
                      @if (r.c) {
                        <span class="block text-xs text-muted">{{
                          t('office.partners.contract.' + r.c.contract)
                        }}</span>
                      }
                    </td>
                    <td>
                      <span class="tag" [class]="standingClass(r.standing)">{{
                        t('office.partners.standing.' + r.standing)
                      }}</span>
                    </td>
                    <td class="whitespace-nowrap">
                      @if (r.l.verified && r.l.verifiedAt) {
                        <span class="inline-flex items-center gap-1">
                          <svg
                            imIcon="badge-check"
                            [size]="16"
                            class="text-brand"
                            aria-hidden="true"
                          ></svg>
                          {{ r.l.verifiedAt | imDate: lang() : 'medium' }}
                        </span>
                      } @else {
                        <span class="text-muted">{{ t('office.partners.notVerified') }}</span>
                      }
                    </td>
                    <td>
                      <span class="font-bold">{{
                        t('office.partners.ofEight', {
                          n: r.translated.length,
                          total: locales.length,
                        })
                      }}</span>
                      <span
                        class="mt-1 flex flex-wrap gap-1"
                        role="list"
                        [attr.aria-label]="t('office.partners.translatedInto')"
                      >
                        @for (loc of locales; track loc) {
                          <span
                            role="listitem"
                            class="loc"
                            [class.loc--on]="r.translated.includes(loc)"
                            [attr.aria-label]="
                              loc.toUpperCase() +
                              ': ' +
                              (r.translated.includes(loc)
                                ? t('office.partners.yes')
                                : t('office.partners.no'))
                            "
                            >{{ loc.toUpperCase() }}</span
                          >
                        }
                      </span>
                    </td>
                    <td class="whitespace-nowrap">
                      @if (r.l.renewal) {
                        {{ r.l.renewal | imDate: lang() : 'medium' }}
                        <span class="tag mt-1 block w-fit" [class]="renewalClass(r.renewal)">{{
                          t('office.partners.renewal.' + r.renewal)
                        }}</span>
                      } @else {
                        <span class="text-muted">{{ t('office.partners.renewal.free') }}</span>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>

        <aside class="flex flex-col gap-6">
          <section class="card flex flex-col gap-3 p-5" aria-labelledby="placement-title">
            <h2 id="placement-title" class="text-base font-bold">
              {{ t('office.partners.placementTitle') }}
            </h2>
            @for (r of sponsored(); track r.l.id) {
              <div class="surface-deep flex flex-col gap-1.5 rounded-md p-4">
                <span class="tag tag-warn self-start">{{
                  t('office.partners.standing.sponsored')
                }}</span>
                <strong class="text-[0.9375rem] text-on-deep">
                  {{ r.l.name }} ·
                  {{ t('office.partners.contract.' + (r.c?.contract ?? 'sponsor')) }}
                </strong>
                <span class="text-[0.8125rem] text-on-deep-muted">
                  {{ t('office.partners.shownOn') }}:
                  @for (p of r.c?.placements ?? []; track p; let last = $last) {
                    {{ t('office.partners.placement.' + p) }}{{ last ? '' : ', ' }}
                  }
                </span>
              </div>
            }
            <h3 class="label-caps mt-2 text-muted">{{ t('office.partners.rulesTitle') }}</h3>
            <ul role="list" class="flex flex-col gap-2 text-[0.84375rem]">
              @for (rule of ruleChecks(); track rule.key) {
                <li class="flex items-start gap-2">
                  <svg
                    [imIcon]="rule.ok ? 'circle-check' : 'triangle-alert'"
                    [size]="18"
                    [class.text-brand]="rule.ok"
                    [class.text-bad-ink]="!rule.ok"
                    aria-hidden="true"
                  ></svg>
                  <span>
                    {{ t('office.partners.rule.' + rule.key, { n: maxSponsored() }) }}
                    <span class="sr-only"
                      >·
                      {{
                        rule.ok ? t('office.partners.ruleOk') : t('office.partners.ruleBroken')
                      }}</span
                    >
                  </span>
                </li>
              }
            </ul>
          </section>
          <p class="text-xs text-muted">{{ t('office.partners.dataNote') }}</p>
        </aside>
      </div>
    </div>
  `,
  styles: `
    .loc {
      display: inline-block;
      min-width: 1.75rem;
      padding: 0 0.25rem;
      border: 1px solid var(--rule);
      border-radius: 4px;
      font-size: 0.6875rem;
      font-weight: 700;
      text-align: center;
      color: var(--muted);
      text-decoration: line-through;
    }
    .loc--on {
      background: var(--ok-bg);
      border-color: transparent;
      color: var(--ok-ink);
      text-decoration: none;
    }
  `,
})
export class PartnersPage {
  private readonly data = inject(OfficeData);
  protected readonly lang = inject(LocaleService).lang;
  protected readonly locales = LOCALES;
  protected readonly filters: Filter[] = ['all', 'public', 'sponsored', 'providers', 'attention'];
  protected readonly filter = signal<Filter>('all');

  private readonly seed = resource({
    loader: async () => {
      const [dir, partners] = await Promise.all([this.data.directory(), this.data.partners()]);
      return { dir, partners };
    },
  });

  protected readonly maxSponsored = computed(
    () => this.seed.value()?.partners.rules.maxSponsoredPerCategory ?? 1,
  );

  private readonly all = computed<PartnerRow[]>(() => {
    const s = this.seed.value();
    if (!s) return [];
    const today = new Date().toISOString().slice(0, 10);
    const soon = new Date(Date.now() + DUE_DAYS * 86_400_000).toISOString().slice(0, 10);
    const rows = s.dir.listings.map((l): PartnerRow => {
      const c = s.partners.contracts.find((x) => x.listingId === l.id);
      const renewal: Renewal = !l.renewal
        ? 'free'
        : l.renewal < today
          ? 'expired'
          : l.renewal <= soon
            ? 'due'
            : 'ok';
      const standing: Standing =
        l.type === 'public'
          ? 'public'
          : c?.docs === 'expired'
            ? 'expired'
            : !l.verified || c?.docs === 'pending'
              ? 'pending'
              : l.sponsored
                ? 'sponsored'
                : l.partner || c?.contract === 'partner'
                  ? 'partner'
                  : 'verified';
      return {
        l,
        c,
        standing,
        renewal,
        translated: translatedLocales(l),
        attention:
          standing === 'pending' ||
          standing === 'expired' ||
          renewal === 'due' ||
          renewal === 'expired',
      };
    });
    // Same order as the public directory: public bodies first, then sponsored, then the rest.
    const rank = (r: PartnerRow) => (r.l.type === 'public' ? 0 : r.l.sponsored ? 1 : 2);
    return rows.sort((a, b) => rank(a) - rank(b));
  });

  protected readonly counts = computed(() => {
    const all = this.all();
    return Object.fromEntries(
      this.filters.map((f) => [f, all.filter((r) => this.matches(r, f)).length]),
    ) as Record<Filter, number>;
  });

  protected readonly rows = computed(() =>
    this.all().filter((r) => this.matches(r, this.filter())),
  );
  protected readonly sponsored = computed(() => this.all().filter((r) => r.l.sponsored));

  protected readonly ruleChecks = computed(() => {
    const all = this.all();
    const max = this.maxSponsored();
    const perType = new Map<string, number>();
    for (const r of all) if (r.l.sponsored) perType.set(r.l.type, (perType.get(r.l.type) ?? 0) + 1);
    const firstNonPublic = all.findIndex((r) => r.l.type !== 'public');
    const lastPublic = all.map((r) => r.l.type).lastIndexOf('public');
    return [
      {
        key: 'publicFree',
        ok: all.filter((r) => r.l.type === 'public').every((r) => !r.l.sponsored && !r.l.renewal),
      },
      { key: 'publicFirst', ok: firstNonPublic === -1 || lastPublic < firstNonPublic },
      { key: 'maxPerCategory', ok: [...perType.values()].every((n) => n <= max) },
      { key: 'labelVisible', ok: true },
      { key: 'notInAnswers', ok: true },
    ];
  });

  private matches(r: PartnerRow, f: Filter): boolean {
    switch (f) {
      case 'all':
        return true;
      case 'public':
        return r.l.type === 'public';
      case 'sponsored':
        return r.l.sponsored;
      case 'providers':
        return r.l.type !== 'public';
      case 'attention':
        return r.attention;
    }
  }

  protected standingClass(s: Standing): string {
    return {
      public: 'tag tag-neutral',
      sponsored: 'tag tag-warn',
      partner: 'tag tag-ok',
      verified: 'tag tag-ok',
      pending: 'tag tag-warn',
      expired: 'tag tag-bad',
    }[s];
  }

  protected renewalClass(r: Renewal): string {
    return {
      free: 'tag tag-neutral',
      ok: 'tag tag-ok',
      due: 'tag tag-warn',
      expired: 'tag tag-bad',
    }[r];
  }
}
