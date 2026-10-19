import { FIRM } from '@core/config/site';
import type { Enquiry, Locale } from '@core/domain/types';

/** Plain-text version of an enquiry (copy to clipboard / mailto body). */
export function enquiryText(
  e: Pick<Enquiry, 'name' | 'company' | 'email' | 'phone' | 'message' | 'projectSnapshot'> & {
    areasLabels: string[];
    ref?: string;
  },
  lang: Locale,
  labels: {
    subject: string;
    name: string;
    company: string;
    email: string;
    phone: string;
    areas: string;
    message: string;
    project: string;
  },
): { subject: string; body: string } {
  const lines: (string | null)[] = [
    e.ref ? `Ref. ${e.ref}` : null,
    `${labels.name}: ${e.name}`,
    `${labels.company}: ${e.company}`,
    `${labels.email}: ${e.email}`,
    e.phone ? `${labels.phone}: ${e.phone}` : null,
    `${labels.areas}: ${e.areasLabels.join(', ')}`,
    '',
    `${labels.message}:`,
    e.message,
  ];
  if (e.projectSnapshot) {
    lines.push(
      '',
      `${labels.project} (${e.projectSnapshot.projectRef}):`,
      e.projectSnapshot.summary[lang],
    );
  }
  return {
    subject: `${labels.subject}${e.ref ? ` — ${e.ref}` : ''}`,
    body: lines.filter((l): l is string => l !== null).join('\n'),
  };
}

export function mailtoHref(subject: string, body: string): string {
  return `mailto:${FIRM.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand('copy');
      area.remove();
      return ok;
    } catch {
      return false;
    }
  }
}
