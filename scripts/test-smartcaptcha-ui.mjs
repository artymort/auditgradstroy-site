import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const port = 4175;
const output = path.resolve('_site');

let browser;
try {
  browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome' });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  let submissions = 0;
  let submittedLead;

  await page.route(`http://127.0.0.1:${port}/**`, (route) => {
    const pathname = new URL(route.request().url()).pathname;
    const file = path.resolve(output, `.${pathname}`);
    if (!file.startsWith(`${output}${path.sep}`) || !existsSync(file)) {
      return route.fulfill({ status: 404, body: 'Not found' });
    }
    return route.fulfill({ path: file });
  });
  await page.route('**/api/captcha/config', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ enabled: true, siteKey: 'test-client-key' }),
  }));
  await page.route('https://smartcaptcha.cloud.yandex.ru/captcha.js?**', (route) => route.fulfill({
    status: 200,
    contentType: 'application/javascript',
    body: `window.smartCaptcha = {
      render(container, options) {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = 'Пройти тестовый слайдер';
        button.addEventListener('click', () => options.callback('test-token'));
        container.append(button);
        return 1;
      },
      subscribe() { return () => {}; },
      destroy() {},
    };
    window.__gradstroySmartCaptchaReady();`,
  }));
  await page.route('**/api/leads', (route) => {
    submissions += 1;
    submittedLead = route.request().postDataJSON();
    return route.fulfill({
      status: 202,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true }),
    });
  });

  await page.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: 'domcontentloaded' });
  await page.locator('#hero-form input[name="phone"]').fill('+7 999 123-45-67');
  await page.locator('#hero-form button[type="submit"]').click();
  const dialog = page.locator('.lead-captcha-dialog');
  await dialog.waitFor({ state: 'visible' });
  assert.equal(submissions, 0, 'the lead must wait for CAPTCHA');
  await dialog.getByRole('button', { name: 'Пройти тестовый слайдер' }).click();
  await page.waitForFunction(() => document.querySelector('#hero-form .form-status')?.dataset.state === 'success');
  assert.equal(submissions, 1);
  assert.equal(submittedLead.captchaToken, 'test-token');

  await page.locator('#hero-form input[name="phone"]').fill('+7 999 123-45-67');
  await page.locator('#hero-form button[type="submit"]').click();
  await dialog.waitFor({ state: 'visible' });
  await dialog.getByRole('button', { name: 'Закрыть проверку' }).click();
  await dialog.waitFor({ state: 'detached' });
  assert.equal(submissions, 1, 'closing CAPTCHA must not submit another lead');

  console.log('SmartCaptcha form flow passed: mobile dialog, verified submit, cancel.');
} finally {
  if (browser) await browser.close();
}
