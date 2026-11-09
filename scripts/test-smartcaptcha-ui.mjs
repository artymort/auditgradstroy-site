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

  await page.goto(`http://127.0.0.1:${port}/index.html?utm_source=yandex&utm_medium=cpc&utm_campaign=autumn&yclid=test-click`, { waitUntil: 'domcontentloaded' });
  await page.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: 'domcontentloaded' });
  for (const invalidPhone of ['7777777', '8922535353', '8 499 711 22 88 abc']) {
    await page.locator('#hero-form input[name="phone"]').fill(invalidPhone);
    await page.locator('#hero-form button[type="submit"]').click();
    assert.equal(await page.locator('#hero-form .form-status').getAttribute('data-state'), 'error');
    assert.equal(submissions, 0, 'invalid phone must not submit a lead');
    assert.equal(await page.locator('.lead-captcha-dialog').count(), 0, 'invalid phone must not trigger CAPTCHA');
  }
  await page.locator('#hero-form input[name="phone"]').fill('+7 999 123-45-67');
  await page.locator('#hero-form button[type="submit"]').click();
  const dialog = page.locator('.lead-captcha-dialog');
  await dialog.waitFor({ state: 'visible' });
  assert.equal(submissions, 0, 'the lead must wait for CAPTCHA');
  await dialog.getByRole('button', { name: 'Пройти тестовый слайдер' }).click();
  await page.waitForFunction(() => document.querySelector('#hero-form .form-status')?.dataset.state === 'success');
  assert.equal(submissions, 1);
  assert.equal(submittedLead.captchaToken, 'test-token');
  assert.equal(submittedLead.attribution.utm_source, 'yandex');
  assert.equal(submittedLead.attribution.utm_campaign, 'autumn');
  assert.equal(submittedLead.attribution.yclid, 'test-click');
  assert.equal(submittedLead.attribution.landingPage, '/index.html');

  await page.locator('#hero-form input[name="phone"]').fill('8 (3532) 90-90-90');
  await page.locator('#hero-form button[type="submit"]').click();
  await dialog.waitFor({ state: 'visible' });
  await dialog.getByRole('button', { name: 'Пройти тестовый слайдер' }).click();
  await page.waitForFunction(() => document.querySelector('#hero-form .form-status')?.dataset.state === 'success');
  assert.equal(submissions, 2);
  assert.equal(submittedLead.phone, '8 (3532) 90-90-90');

  await page.locator('#hero-form input[name="phone"]').fill('89225353533');
  await page.locator('#hero-form button[type="submit"]').click();
  await dialog.waitFor({ state: 'visible' });
  await dialog.getByRole('button', { name: 'Закрыть проверку' }).click();
  await dialog.waitFor({ state: 'detached' });
  assert.equal(submissions, 2, 'closing CAPTCHA must not submit another lead');

  console.log('SmartCaptcha, attribution and phone validation passed: invalid numbers, mobile and landline submissions, cancel.');
} finally {
  if (browser) await browser.close();
}
