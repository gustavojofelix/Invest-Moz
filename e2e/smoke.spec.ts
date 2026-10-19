import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

/**
 * Demo smoke flow (PT on a 360px phone, EN on a 1440px desktop):
 * landing → intake (cashew example) → assessment → Q&A with a citation →
 * enquiry → demo login from the landing page → the enquiry is in the inbox.
 */
type Dict = Record<string, unknown>;
const load = (path: string): Dict =>
  JSON.parse(readFileSync(`src/assets/i18n/${path}`, 'utf8')) as Dict;
const get = (dict: Dict, key: string): string =>
  key.split('.').reduce<unknown>((node, k) => (node as Dict)[k], dict) as string;

function strings(lang: string) {
  const global = load(`${lang}.json`);
  const scopes: Record<string, Dict> = {};
  for (const s of ['landing', 'intake', 'assessment', 'qa', 'enquiry', 'inbox'])
    scopes[s] = load(`${s}/${lang}.json`);
  return (key: string) => {
    const [scope, ...rest] = key.split('.');
    return scopes[scope] ? get(scopes[scope], rest.join('.')) : get(global, key);
  };
}

async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

test('demo flow: project → assessment → question → enquiry → inbox', async ({ page }, testInfo) => {
  const lang = (testInfo.project.metadata as { lang: string }).lang;
  const t = strings(lang);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

  // Landing ----------------------------------------------------------------
  await page.goto(`/${lang}`);
  await expect(page.getByRole('heading', { level: 1, name: 'Invest Moz' })).toBeVisible();
  await expect(page.getByText(t('landing.demo.title'))).toBeVisible();
  await expectNoHorizontalScroll(page);
  await page.getByRole('link', { name: t('landing.hero.primary') }).click();

  // Intake: load the cashew example and submit --------------------------------
  await expect(page.getByRole('heading', { level: 1, name: t('intake.title') })).toBeVisible();
  await page.getByRole('button', { name: t('intake.loadExample') }).click();
  await page.getByRole('menuitem').first().click();
  await expect(page.locator('#idea')).toHaveValue(/caju/);
  await page.getByRole('button', { name: t('intake.submit') }).click();
  await expect(page.getByText(t('intake.preparing.title'))).toBeVisible();

  // Assessment ----------------------------------------------------------------
  await page.waitForURL(`**/${lang}/assessment/TA-IM-EX01`);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByText(t('assessment.recommended'), { exact: true })).toBeVisible();
  await expect(page.getByText('Ref. TA-IM-EX01', { exact: true })).toBeVisible();
  await expectNoHorizontalScroll(page);

  // Q&A: flagship dividends question + citation sheet ---------------------------
  await page
    .getByRole('button', { name: t('assessment.actions.ask') })
    .first()
    .click();
  await page.waitForURL(`**/${lang}/questions`);
  await page.goto(`/${lang}/questions/exchange`);
  await page.locator('.suggestion').first().click();
  await expect(page.getByText(t('ui.answer.whenToTalk')).first()).toBeVisible({ timeout: 20_000 });
  await page
    .locator('im-answer-block')
    .getByRole('button', { name: /11\/2009/ })
    .first()
    .click();
  const sheet = page.getByRole('dialog');
  await expect(sheet).toBeVisible();
  await expect(sheet.getByText(t('ui.citation.illustrative'), { exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(sheet).toBeHidden();

  // Enquiry ----------------------------------------------------------------------
  await page
    .getByRole('button', { name: t('ui.answer.talkCta') })
    .first()
    .click();
  await page.waitForURL(`**/${lang}/contact`);
  await page.locator('#name').fill('Priya Raman');
  await page.locator('#company').fill('Coromandel Agro Exports');
  await page.locator('#email').fill('priya@example.com');
  await page.locator('#message').fill('We would like a proposal for the Nampula cashew plant.');
  await page.getByRole('button', { name: t('enquiry.submit') }).click();
  await page.waitForURL(`**/${lang}/contact/sent/**`);
  const ref = (await page.locator('.font-mono.text-xl').innerText()).trim();
  expect(ref).toMatch(/^TA-IM-\d{4}-\d{4}$/);

  // Demo login from the landing page → inbox ----------------------------------------
  await page.goto(`/${lang}`);
  await page.getByRole('button', { name: t('landing.demo.cta') }).click();
  await page.waitForURL(`**/${lang}/inbox`);
  const row = page.getByRole('link', { name: new RegExp(ref) });
  await expect(row).toBeVisible();
  await expect(row.locator('im-section-label', { hasText: t('inbox.newBadge') })).toBeVisible();
  await row.click();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Coromandel Agro Exports' }),
  ).toBeVisible();
  await expectNoHorizontalScroll(page);

  expect(errors).toEqual([]);
});

test('language switch keeps the page', async ({ page }) => {
  await page.goto('/pt/questions/tax');
  await page.locator('im-site-footer').getByRole('link', { name: /EN/ }).click();
  await page.waitForURL('**/en/questions/tax');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en-GB');
});
