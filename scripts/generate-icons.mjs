// Genererer app-ikoner (PNG) fra public/icons/icon.svg med Playwrights Chromium.
// Kør: node scripts/generate-icons.mjs
import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';

const svg = readFileSync(new URL('../public/icons/icon.svg', import.meta.url), 'utf8');
const targets = [
  { file: 'icon-192.png', size: 192, pad: 0 },
  { file: 'icon-512.png', size: 512, pad: 0 },
  // Maskable: motivet holdes inden for den sikre zone (ca. 80 %)
  { file: 'maskable-512.png', size: 512, pad: 0.12 },
  { file: 'apple-touch-icon.png', size: 180, pad: 0 },
];
const browser = await chromium.launch();
const page = await browser.newPage();
for (const t of targets) {
  await page.setViewportSize({ width: t.size, height: t.size });
  const inner = Math.round(t.size * (1 - 2 * t.pad));
  await page.setContent(
    `<html><body style="margin:0;background:#141b3d;display:flex;align-items:center;justify-content:center;width:${t.size}px;height:${t.size}px">
     <div style="width:${inner}px;height:${inner}px">${svg.replace('<svg ', '<svg width="100%" height="100%" ')}</div></body></html>`,
  );
  await page.screenshot({ path: new URL(`../public/icons/${t.file}`, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1') });
  console.log('skrev', t.file);
}
await browser.close();
