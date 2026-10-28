import { expect, test, type Page } from '@playwright/test';

/**
 * Tiva smoke flows (PT on a 360px phone, EN on a 1440px desktop):
 * idea on the landing → chat; example roadmap with nine steps → expert handoff
 * with consent → the lead in the back office. Plus the library, Arabic RTL and a
 * walk through all 23 screens with no console errors and no horizontal scroll.
 */
const REF = 'TA-IM-EX01';

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  return errors;
}

async function expectNoHorizontalScroll(page: Page) {
  // Compare with the configured viewport: mobile emulation zooms out to fit wide
  // content, which would make window.innerWidth grow with the overflow.
  const width = page.viewportSize()?.width ?? 0;
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(scrollWidth).toBeLessThanOrEqual(width);
}

const langOf = (info: { project: { metadata: unknown } }) =>
  (info.project.metadata as { lang: string }).lang;

test('idea → chat → roadmap → expert → back-office lead', async ({ page }, info) => {
  test.setTimeout(120_000);
  const lang = langOf(info);
  const errors = collectErrors(page);

  // 1 · Landing: the idea box opens the chat with the idea as first message.
  await page.goto(`/${lang}`);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expectNoHorizontalScroll(page);
  await page.locator('#idea').fill('Cashew processing plant in Nampula, about USD 2 million');
  await page.locator('#idea').press('Enter');

  // 5 · Chat: Tiva answers with legal sources.
  await page.waitForURL(`**/${lang}/chat**`);
  await expect(page.locator('main')).toContainText(/Lei n\.º|Decreto|APIEX/, { timeout: 20_000 });
  await expectNoHorizontalScroll(page);

  // 6 · Roadmap for the example project: nine steps, tick one off.
  await page.goto(`/${lang}/roadmap/${REF}`);
  await expect(page.locator('[id^="step-"]:not([id^="step-body-"])')).toHaveCount(9);
  await expectNoHorizontalScroll(page);

  // 9 · Talk to an expert, with consent.
  await page.goto(`/${lang}/expert?from=roadmap`);
  await page.locator('#ex-name').fill('Ana Teste');
  await page.locator('#ex-company').fill('Caju Lda');
  await page.locator('#ex-email').fill('ana@example.com');
  await page.getByRole('checkbox').last().check();
  await page.locator('form button[type="submit"]').click();

  // 10 · Call requested.
  await page.waitForURL(`**/${lang}/expert/sent/**`);
  const ref = page.url().split('/').pop() as string;
  await expect(page.locator('main')).toContainText(ref);

  // Back office: sign in with the prefilled demo credentials, the lead is there.
  await page.goto(`/${lang}/login`);
  await page.locator('form button[type="submit"]').click();
  await page.waitForURL(`**/${lang}/office/**`);
  await page.goto(`/${lang}/office/leads`);
  await expect(page.locator('main')).toContainText('Caju Lda');

  expect(errors).toEqual([]);
});

test('library → article', async ({ page }, info) => {
  const lang = langOf(info);
  const errors = collectErrors(page);
  await page.goto(`/${lang}/library`);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.goto(`/${lang}/library/investment-law`);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.locator('main')).toContainText('8/2023');
  await expectNoHorizontalScroll(page);
  expect(errors).toEqual([]);
});

test('Arabic is right-to-left and Chinese renders', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/ar');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
  await expectNoHorizontalScroll(page);
  await page.goto('/zh/library');
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  expect(errors).toEqual([]);
});

test('all 23 screens render', async ({ page }, info) => {
  test.setTimeout(180_000);
  const lang = langOf(info);
  const errors = collectErrors(page);
  const screens = [
    '',
    `roadmap/${REF}/pdf`,
    'welcome',
    'pathfinder',
    'chat',
    `roadmap/${REF}`,
    'map',
    'incentives',
    'expert',
    'library',
    'library/tax',
    'documents?step=apiex',
    'directory',
    'aftercare',
    'alerts',
    'whatsapp',
  ];
  for (const s of screens) {
    await page.goto(`/${lang}/${s}`);
    await expect(page.locator('h1').first()).toBeVisible();
    // The PDF screen is an A4 sheet by design.
    if (!s.endsWith('/pdf')) await expectNoHorizontalScroll(page);
  }
  // Back office (18–23) behind the demo login.
  await page.goto(`/${lang}/login`);
  await page.locator('form button[type="submit"]').click();
  await page.waitForURL(`**/${lang}/office/**`);
  for (const s of [
    'queue',
    'knowledge-base',
    'conversations',
    'leads',
    'intelligence',
    'partners',
  ]) {
    await page.goto(`/${lang}/office/${s}`);
    await expect(page.locator('h1').first()).toBeVisible();
    await expectNoHorizontalScroll(page);
  }
  expect(errors).toEqual([]);
});
