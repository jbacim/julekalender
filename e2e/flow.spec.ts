import { expect, test, type Page } from '@playwright/test';

async function noHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, 'vandret sidescroll').toBeLessThanOrEqual(0);
}

async function readRoundWord(page: Page, day: number): Promise<string> {
  return page.evaluate(
    (d) =>
      new Promise<string>((resolve, reject) => {
        const r = indexedDB.open('julekalender');
        r.onsuccess = () => {
          const tx = r.result.transaction('years');
          const all = tx.objectStore('years').getAll();
          all.onsuccess = () => resolve(all.result[0].days[d].round.word.normalized);
          all.onerror = () => reject(all.error);
        };
      }),
    day,
  );
}

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-12-03T10:00:00+01:00'));
});

test('profil, låge, spil og resultat på tablet og mobil', async ({ page }, info) => {
  await page.goto('/');
  await page.getByLabel(/Kaldenavn/).fill('Testnisse');
  await page.getByText('Nem', { exact: true }).click();
  await noHorizontalScroll(page);
  await page.screenshot({ path: `test-results/${info.project.name}-1-profil.png`, fullPage: true });
  await page.getByRole('button', { name: 'Lav profil' }).click();
  await expect(page.getByRole('status', { name: '0 gaver i alt' })).toBeVisible();
  await noHorizontalScroll(page);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `test-results/${info.project.name}-2-hjem.png`, fullPage: true });

  await page.getByRole('button', { name: /^Låge 3, i dag/ }).click();
  await expect(page.getByRole('heading', { name: 'Låge 3' })).toBeVisible();
  const word = await readRoundWord(page, 3);
  const all = 'QWERTYUIOPÅASDFGHJKLÆØZXCVBNM'.split('');
  const wrong = all.filter((l) => !word.includes(l));
  const kb = page.getByRole('group', { name: 'Bogstaver' });
  for (const l of wrong.slice(0, 5)) await kb.getByRole('button', { name: l, exact: true }).click();
  await expect(page.getByRole('button', { name: /Hint/ })).toBeVisible();
  await page.getByRole('button', { name: /Hint/ }).click();
  await noHorizontalScroll(page);
  // Tasterne skal være store nok at ramme
  const box = await kb.getByRole('button', { name: 'A', exact: true }).boundingBox();
  expect(box!.height).toBeGreaterThanOrEqual(44);
  await page.screenshot({ path: `test-results/${info.project.name}-3-spil.png`, fullPage: true });
  for (const l of new Set(word.replace(/[ -]/g, ''))) await kb.getByRole('button', { name: l, exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Godt gået!' })).toBeVisible();
  await noHorizontalScroll(page);
  await page.screenshot({ path: `test-results/${info.project.name}-4-resultat.png`, fullPage: true });
  await page.getByRole('button', { name: 'Se det i din juleverden' }).click();
  await expect(page.getByRole('status', { name: '5 gaver i alt' })).toBeVisible();

  // Genindlæsning bevarer data
  await page.reload();
  await expect(page.getByRole('status', { name: '5 gaver i alt' })).toBeVisible();
  await page.getByRole('button', { name: 'Se mit træ' }).click();
  await expect(page.getByRole('button', { name: 'Drej til venstre' })).toBeVisible({ timeout: 10000 });
  await page.getByRole('button', { name: 'Drej til venstre' }).click();
  await page.waitForTimeout(800);
  await noHorizontalScroll(page);
  await page.screenshot({ path: `test-results/${info.project.name}-5-trae.png` });
});

test('lang finaleord på 320 px giver ingen vandret scroll', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto('/');
  await page.getByLabel(/Kaldenavn/).fill('Smal');
  await page.getByRole('button', { name: 'Lav profil' }).click();
  await page.getByRole('button', { name: /^Låge 1[,:]/ }).click();
  await expect(page.getByRole('group', { name: 'Bogstaver' })).toBeVisible();
  await noHorizontalScroll(page);
});
