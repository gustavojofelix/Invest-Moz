import { Pipe, type PipeTransform } from '@angular/core';
import type { Locale, LocalizedText } from '../domain/types';
import { INTL_LOCALE, pickText } from './locales';

export type DateStyle = 'long' | 'medium' | 'short' | 'weekday' | 'datetime' | 'day' | 'monthYear';

export function formatNumber(value: number, lang: Locale, opts?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(INTL_LOCALE[lang], opts).format(value);
}

export function formatMoney(value: number, currency: 'USD' | 'MZN', lang: Locale): string {
  return new Intl.NumberFormat(INTL_LOCALE[lang], {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

/** Dates are ISO `YYYY-MM-DD` (calendar dates, no timezone) or full ISO timestamps. */
export function formatDate(iso: string, lang: Locale, style: DateStyle = 'medium'): string {
  const isCalendarDate = /^\d{4}-\d{2}-\d{2}$/.test(iso);
  const date = isCalendarDate ? new Date(`${iso}T12:00:00Z`) : new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const tz = isCalendarDate ? 'UTC' : 'Africa/Maputo';
  if (style === 'monthYear') {
    // Composed from parts: some locales (pt) collapse month + year to "11/2026".
    const month = new Intl.DateTimeFormat(INTL_LOCALE[lang], {
      month: 'short',
      timeZone: tz,
    }).format(date);
    return `${month} ${new Intl.DateTimeFormat(INTL_LOCALE[lang], { year: 'numeric', timeZone: tz }).format(date)}`;
  }
  const options: Record<DateStyle, Intl.DateTimeFormatOptions> = {
    day: { day: 'numeric' },
    monthYear: { month: 'short', year: 'numeric' },
    long: { day: 'numeric', month: 'long', year: 'numeric' },
    medium: { day: 'numeric', month: 'short', year: 'numeric' },
    short: { day: '2-digit', month: '2-digit', year: 'numeric' },
    weekday: { weekday: 'long' },
    datetime: {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    },
  };
  return new Intl.DateTimeFormat(INTL_LOCALE[lang], { ...options[style], timeZone: tz }).format(
    date,
  );
}

/** `{{ text | loc: lang() }}` picks a LocalizedText entry. */
@Pipe({ name: 'loc' })
export class LocPipe implements PipeTransform {
  transform(value: LocalizedText | null | undefined, lang: Locale): string {
    return pickText(value, lang);
  }
}

@Pipe({ name: 'money' })
export class MoneyPipe implements PipeTransform {
  transform(value: number | null | undefined, currency: 'USD' | 'MZN', lang: Locale): string {
    return value == null ? '' : formatMoney(value, currency, lang);
  }
}

@Pipe({ name: 'num' })
export class NumberPipe implements PipeTransform {
  transform(
    value: number | null | undefined,
    lang: Locale,
    opts?: Intl.NumberFormatOptions,
  ): string {
    return value == null ? '' : formatNumber(value, lang, opts);
  }
}

@Pipe({ name: 'imDate' })
export class ImDatePipe implements PipeTransform {
  transform(value: string | null | undefined, lang: Locale, style: DateStyle = 'medium'): string {
    return value ? formatDate(value, lang, style) : '';
  }
}
