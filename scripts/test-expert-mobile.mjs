import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const output = path.resolve('_site');
const origin = 'http://127.0.0.1:4176';
const browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome' });
try {
  for (const width of [320, 360, 390, 430, 480, 600, 601, 768, 820, 821, 900, 1024]) {
    const page = await browser.newPage({ viewport: { width, height: 844 } });
    await page.route(`${origin}/**`, (route) => {
      const filename = path.resolve(output, `.${new URL(route.request().url()).pathname}`);
      if (!filename.startsWith(`${output}${path.sep}`) || !existsSync(filename)) {
        return route.fulfill({ status: 404, body: 'Not found' });
      }
      return route.fulfill({ path: filename });
    });
    await page.goto(`${origin}/expert.html`, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => document.fonts.ready);
    const layout = await page.evaluate(() => {
      const heading = document.querySelector('.expert-hero__copy h1');
      return {
        titleWidth: heading.clientWidth,
        titleScrollWidth: heading.scrollWidth,
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth,
        menuLabel: [...document.querySelectorAll('nav a')].map((link) => link.textContent.trim()).find((text) => text.includes('эксперте')),
      };
    });
    assert.ok(layout.titleScrollWidth <= layout.titleWidth, `${width}px: expert heading overflows ${JSON.stringify(layout)}`);
    assert.ok(layout.documentWidth <= layout.viewportWidth, `${width}px: page overflows ${JSON.stringify(layout)}`);
    assert.equal(layout.menuLabel, 'Об эксперте');
    await page.close();
  }
  console.log('Expert page fits viewports from 320 to 1024px; menu label is correct.');
} finally {
  await browser.close();
}
