import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const origin = process.env.AUDIT_LOCAL_ORIGIN || 'http://127.0.0.1:4173';
const pages = [
  'index.html', 'services.html', 'express-audit.html', 'full-expertise.html',
  'project-support.html', 'cases.html', 'blog.html', 'expert.html', 'contacts.html',
];
const widths = [320, 360, 390, 430, 600, 768, 820, 900, 1024];
const liveOrigin = process.env.AUDIT_LIVE_ORIGIN || 'https://xn--80aahfbye3bpckmgl.xn--p1ai';
const localCss = await readFile(path.resolve('style.css'), 'utf8');
const liveBlog = await fetch(`${liveOrigin}/blog.html`).then((response) => response.text());
const liveCases = await fetch(`${liveOrigin}/cases.html`).then((response) => response.text());
const livePaths = [...new Set([
  ...[...liveBlog.matchAll(/href="(\/blog\/[^"#]+\.html)"/g)].map((match) => match[1]),
  ...[...liveCases.matchAll(/href="(\/cases\/[^"#]+\.html)"/g)].map((match) => match[1]),
])];
const targets = [...pages.map((page) => `${origin}/${page}`), ...livePaths.map((page) => `${liveOrigin}${page}`)];
const browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome' });
const findings = [];
try {
  for (const url of targets) {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    if (url.startsWith(liveOrigin)) {
      await page.route('**/style.css', (route) => route.fulfill({ contentType: 'text/css', body: localCss }));
    }
    for (const width of widths) {
      await page.setViewportSize({ width, height: 844 });
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      if (url.includes('/blog/')) {
        await page.locator('.article-hero h1').evaluate((heading) => {
          heading.innerHTML = heading.innerHTML.replaceAll(' и ', ' и&nbsp;');
        });
      }
      await page.evaluate(() => document.fonts.ready);
      const problems = await page.evaluate(() => {
        const issues = [];
        if (document.documentElement.scrollWidth > window.innerWidth + 1) {
          issues.push(`page width ${document.documentElement.scrollWidth} > ${window.innerWidth}`);
        }
        for (const heading of document.querySelectorAll('h1,h2,h3')) {
          if (!heading.getClientRects().length || getComputedStyle(heading).visibility !== 'visible') continue;
          const bounds = heading.getBoundingClientRect();
          if (heading.scrollWidth > heading.clientWidth + 1) {
            issues.push(`${heading.tagName} ${heading.textContent.trim().slice(0, 55)}: ${heading.scrollWidth} > ${heading.clientWidth}`);
          }
          if (bounds.right > window.innerWidth + 1) {
            issues.push(`${heading.tagName} ${heading.textContent.trim().slice(0, 55)}: right ${Math.round(bounds.right)}`);
          }
          if (heading.tagName === 'H1' && heading.childNodes.length === 1 && heading.firstChild.nodeType === Node.TEXT_NODE) {
            const node = heading.firstChild;
            const lines = new Map();
            for (let index = 0; index < node.textContent.length; index += 1) {
              const range = document.createRange();
              range.setStart(node, index);
              range.setEnd(node, index + 1);
              const top = Math.round(range.getBoundingClientRect().top);
              lines.set(top, `${lines.get(top) || ''}${node.textContent[index]}`);
            }
            if ([...lines.values()].some((line) => line.trim() === 'и')) {
              issues.push(`${heading.tagName} ${heading.textContent.trim().slice(0, 55)}: orphan и`);
            }
          }
        }
        return issues;
      });
      if (problems.length) findings.push({ page: url, width, problems });
    }
    await page.close();
  }
} finally {
  await browser.close();
}
console.log(JSON.stringify({ pages: targets.length, widths, findings }, null, 2));
if (findings.length) process.exitCode = 1;
