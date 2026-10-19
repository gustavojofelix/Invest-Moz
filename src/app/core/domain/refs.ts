/** Reference generators: TA-IM-2026-0142 (enquiries), TA-IM-P26-7K3Q (projects). */

const ENQUIRY = /^TA-IM-(\d{4})-(\d{4})$/;

export function nextEnquiryRef(existing: readonly string[], year: number): string {
  let max = 0;
  for (const ref of existing) {
    const m = ENQUIRY.exec(ref);
    if (m && Number(m[1]) === year) max = Math.max(max, Number(m[2]));
  }
  return `TA-IM-${year}-${String(max + 1).padStart(4, '0')}`;
}

const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

/** `random` is injectable for tests; returns values in [0, 1). */
export function newProjectRef(year: number, random: () => number = Math.random): string {
  let code = '';
  for (let i = 0; i < 4; i++) code += ALPHABET[Math.floor(random() * ALPHABET.length)];
  return `TA-IM-P${String(year).slice(-2)}-${code}`;
}

export function isExampleRef(ref: string): boolean {
  return /^TA-IM-EX\d{2}$/.test(ref);
}
