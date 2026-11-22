import { expect, test } from '@playwright/test';

test('juleaftensfinale i 3D: stjerne, 240 gaver og roterbart træ', async ({ page }, info) => {
  // "Gem som app?" vises én gang på enheder, der kan installere – luk den, når den dukker op
  await page.addLocatorHandler(page.getByRole('dialog', { name: 'Gem Julekalender som app?' }), async (d) => {
    await d.getByRole('button', { name: /OK|Ikke nu/ }).click();
  });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.clock.setFixedTime(new Date('2026-12-24T15:00:00+01:00'));
  await page.goto('/');
  await page.getByLabel(/Kaldenavn/).fill('Juleaften');
  await page.getByRole('button', { name: 'Lav profil' }).click();
  await page.getByRole('button', { name: /^Låge 24, i dag/ }).click();
  await expect(page.getByRole('heading', { name: 'Juleaften – finalen' })).toBeVisible();
  const word = await page.evaluate(
    () =>
      new Promise<string>((resolve) => {
        const r = indexedDB.open('julekalender');
        r.onsuccess = () => {
          const all = r.result.transaction('years').objectStore('years').getAll();
          all.onsuccess = () => resolve(all.result[0].finale.round.word.normalized);
        };
      }),
  );
  const kb = page.getByRole('group', { name: 'Bogstaver' });
  for (const l of new Set(word.replace(/[ -]/g, ''))) await kb.getByRole('button', { name: l, exact: true }).click();
  await page.getByRole('button', { name: 'Se nissen aflevere gaverne' }).click();
  await expect(page.getByRole('heading', { name: 'Nissen kommer med gaverne' })).toBeVisible();
  // Finalen varer ca. 30 sekunder – tag billeder undervejs
  const start = Date.now();
  for (const [at, name] of [[1.5, 'a-hytte'], [6, 'b-gaar'], [14, 'c-gaver'], [21, 'd-stjerne'], [25, 'e-lys']] as const) {
    await page.waitForTimeout(Math.max(0, start + at * 1000 - Date.now()));
    await page.screenshot({ path: `test-results/${info.project.name}-finale-${name}.png` });
    if (name === 'c-gaver') await expect(page.getByText('Alle gaverne flyver tilbage under træet!')).toBeVisible();
  }
  await expect(page.getByRole('heading', { name: 'Alle 240 gaver er tilbage!' })).toBeVisible({ timeout: 45000 });
  await expect(page.getByRole('status', { name: '240 gaver i alt' })).toBeVisible();
  // Interaktivt træ: drej med mus og knapper
  const canvas = page.locator('canvas.world3d-canvas');
  if (await canvas.count()) {
    const b = (await canvas.boundingBox())!;
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await page.mouse.down();
    await page.mouse.move(b.x + b.width / 2 + 150, b.y + b.height / 2 + 200, { steps: 10 });
    await page.mouse.up();
  }
  await page.getByRole('button', { name: 'Drej til højre' }).click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: `test-results/${info.project.name}-finale-slut.png` });
  // Genindlæsning: stadig vundet, kan ses igen uden nye belønninger
  await page.reload();
  await page.getByRole('button', { name: /^Låge 24, i dag: vundet/ }).click();
  await expect(page.getByRole('button', { name: 'Se finalen igen' })).toBeVisible();
  await expect(page.getByRole('status', { name: '240 gaver i alt' })).toBeVisible();
  expect(errors.filter((e) => !/favicon/.test(e))).toEqual([]);
});
