import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const origin = 'http://127.0.0.1:4177';
const css = await readFile(path.resolve('style.css'), 'utf8');
const html = `<!doctype html><html lang="ru"><head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
  <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/style.css">
  </head><body><main class="content-page article-page"><header class="article-hero">
  <div class="container article-hero__grid"><div>
  <a class="article-back" href="/blog.html">← Все материалы</a>
  <div class="article-meta"><span>Аспекты градостроительства</span><time>28.07.2026</time></div>
  <h1>Правовые аспекты градостроительства и&nbsp;землепользования</h1>
  <p class="article-hero__subtitle">Законодательство, судебная практика и снижение проектных рисков</p>
  </div><figure><img src="/article.jpg" alt=""></figure></div></header></main></body></html>`;

const browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome' });
try {
  for (const width of [320, 360, 375, 390, 430, 480, 600, 601, 768, 820, 821, 900, 1024]) {
    const page = await browser.newPage({ viewport: { width, height: 844 } });
    await page.route(`${origin}/**`, (route) => {
      const pathname = new URL(route.request().url()).pathname;
      if (pathname === '/style.css') return route.fulfill({ contentType: 'text/css', body: css });
      if (pathname === '/article.html') return route.fulfill({ contentType: 'text/html', body: html });
      return route.fulfill({ status: 404, body: '' });
    });
    await page.goto(`${origin}/article.html`, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => document.fonts.ready);
    const layout = await page.evaluate(() => {
      const heading = document.querySelector('.article-hero h1');
      const node = heading.firstChild;
      const lines = new Map();
      for (let index = 0; index < node.textContent.length; index += 1) {
        const range = document.createRange();
        range.setStart(node, index);
        range.setEnd(node, index + 1);
        const rect = range.getBoundingClientRect();
        const top = Math.round(rect.top);
        const line = lines.get(top) || { text: '', right: 0 };
        line.text += node.textContent[index];
        line.right = Math.max(line.right, rect.right);
        lines.set(top, line);
      }
      return {
        headingRight: heading.getBoundingClientRect().right,
        pageWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth,
        lines: [...lines.values()],
      };
    });
    assert.ok(layout.pageWidth <= width, `${width}px: page scrolls horizontally: ${JSON.stringify(layout)}`);
    assert.ok(layout.lines.every((line) => line.right <= layout.headingRight + 1), `${width}px: title crosses the card: ${JSON.stringify(layout)}`);
    assert.ok(layout.lines.every((line) => line.text.trim() !== 'и'), `${width}px: orphan conjunction: ${JSON.stringify(layout)}`);
    await page.close();
  }
  console.log('Article heading stays inside the card without an orphan conjunction at 320–1024px.');
} finally {
  await browser.close();
}
