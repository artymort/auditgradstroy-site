import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Liquid } from 'liquidjs';
import { marked } from 'marked';
import YAML from 'yaml';
import { richTextHtml } from '../cms/lib/rich-text.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.resolve(root, process.env.OUTPUT_DIR || '_site');
const baseurl = (process.env.BASEURL || '').replace(/\/$/, '');
const siteUrl = (process.env.SITE_URL || 'https://artymort.github.io').replace(/\/$/, '');

const clearDirectoryContents = async (directory) => {
  await mkdir(directory, { recursive: true });
  const entries = await readdir(directory);
  await Promise.all(entries.map((entry) => rm(path.join(directory, entry), {
    recursive: true,
    force: true,
  })));
};

const readJson = async (file) => JSON.parse(await readFile(path.join(root, '_data', file), 'utf8'));

const stripFrontMatter = (source) => source.replace(
  /^---[^\S\r\n]*\r?\n(?:[\s\S]*?\r?\n)?---[^\S\r\n]*\r?\n/,
  '',
);

const parseFrontMatter = (source) => {
  const match = String(source).match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n([\s\S]*)$/);
  if (!match) return null;
  return {
    attributes: YAML.parse(match[1]) || {},
    body: match[2].trim(),
  };
};

const renderMarkdown = (source) => {
  const richHtml = richTextHtml(source);
  if (richHtml !== null) return richHtml;
  const renderer = new marked.Renderer();
  renderer.html = () => '';
  return marked.parse(source, {
    renderer,
    gfm: true,
    breaks: true,
    walkTokens(token) {
      if ((token.type === 'link' || token.type === 'image') && token.href) {
        const href = String(token.href).trim();
        if (!/^(?:https?:|mailto:|tel:|\/|#)/i.test(href)) token.href = '#';
      }
    },
  });
};

const safeSlug = (value) => String(value || '')
  .toLowerCase()
  .replace(/[^a-z0-9а-яё_-]+/giu, '-')
  .replace(/^-+|-+$/g, '');

const readCollection = async ({ directory, type }) => {
  const collectionDirectory = path.join(root, directory);
  const files = await readdir(collectionDirectory).catch(() => []);
  const items = [];
  for (const filename of files.filter((name) => name.endsWith('.md'))) {
    const parsed = parseFrontMatter(await readFile(path.join(collectionDirectory, filename), 'utf8'));
    if (!parsed) continue;
    const attributes = parsed.attributes;
    if (attributes.published === false) continue;
    const slug = safeSlug(attributes.slug || filename.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/\.md$/, ''));
    if (!slug) continue;
    const url = type === 'article' ? `blog/${slug}.html` : `cases/${slug}.html`;
    items.push({
      ...attributes,
      type,
      slug,
      url,
      date: attributes.date ? new Date(attributes.date) : new Date(),
      content: renderMarkdown(parsed.body),
    });
  }
  return items.sort((left, right) => right.date.valueOf() - left.date.valueOf());
};

const site = {
  baseurl,
  url: siteUrl,
  data: {
    site: await readJson('site.json'),
    home: await readJson('home.json'),
    services: await readJson('services.json'),
    blog: await readJson('blog.json'),
    cases: await readJson('cases.json'),
    expert: await readJson('expert.json'),
    contacts: await readJson('contacts.json'),
  },
  posts: await readCollection({ directory: '_posts', type: 'article' }),
  cases: await readCollection({ directory: '_cases', type: 'case' }),
};

const engine = new Liquid({
  root: [path.join(root, '_includes'), root],
  extname: '.html',
  cache: false,
  dynamicPartials: false,
});

const escapeHtml = (value) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

engine.registerFilter('escape', (value) => richTextHtml(value) ?? escapeHtml(value));

const relativeUrl = (value) => {
  if (!value) return '';
  if (/^(?:https?:)?\/\//.test(value) || String(value).startsWith('data:')) return value;
  const clean = String(value).replace(/^\//, '');
  return `${baseurl}/${clean}` || `/${clean}`;
};

engine.registerFilter('relative_url', relativeUrl);
engine.registerFilter('absolute_url', (value) => {
  if (!value) return siteUrl;
  if (/^(?:https?:)?\/\//.test(value)) return value;
  return `${siteUrl}${relativeUrl(value)}`;
});
engine.registerFilter('date', (value, format) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.valueOf())) return '';
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  if (format === '%Y-%m-%d') return `${year}-${month}-${day}`;
  if (format === '%d.%m.%Y') return `${day}.${month}.${year}`;
  return date.toISOString();
});

await clearDirectoryContents(output);

for (const pageName of ['index.html', 'services.html', 'cases.html', 'blog.html', 'expert.html', 'contacts.html']) {
  const template = stripFrontMatter(await readFile(path.join(root, pageName), 'utf8'));
  const html = await engine.parseAndRender(template, { site });
  await writeFile(path.join(output, pageName), html, 'utf8');
}

for (const item of [...site.posts, ...site.cases]) {
  const layoutName = item.type === 'article' ? 'article.html' : 'case.html';
  const layout = stripFrontMatter(await readFile(path.join(root, '_layouts', layoutName), 'utf8'));
  const html = await engine.parseAndRender(layout, {
    site,
    page: item,
    content: item.content,
  });
  const target = path.join(output, item.url);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, html, 'utf8');
}

const previewDirectory = path.join(root, 'data', 'cms-previews');
await rm(previewDirectory, { recursive: true, force: true });
await mkdir(previewDirectory, { recursive: true });
const previews = [
  {
    type: 'article',
    filename: 'article.html',
    page: {
      preview: true,
      title: 'Заголовок будущей статьи',
      subtitle: 'Краткий подзаголовок объясняет пользу материала и помогает читателю понять, о чём будет статья.',
      category: 'Градостроительство',
      date: new Date(),
      image: 'photo4.png',
      image_alt: 'Пример обложки статьи',
      excerpt_text: 'Короткое описание будущей статьи.',
      url: '/cms/preview/article',
    },
    body: `## Вводная часть

Здесь будет основной текст статьи. Первый абзац кратко раскрывает проблему и объясняет, почему тема важна владельцу или покупателю земельного участка.

## Что важно проверить

- градостроительные ограничения и охранные зоны;
- разрешённое использование земельного участка;
- документы, карты и сведения из официальных источников.

## Вывод

В заключении читатель получает понятный итог и следующий шаг. Заголовки, списки, ссылки и изображения добавляются прямо из редактора админ-панели.`,
  },
  {
    type: 'case',
    filename: 'case.html',
    page: {
      preview: true,
      title: 'Название реализованного кейса',
      subtitle: 'Краткое описание задачи клиента и особенностей земельного участка.',
      service: 'Градостроительная экспертиза',
      location: 'Москва и Московская область',
      result: 'Здесь будет кратко указан главный результат работы: выявленный риск, сохранённые средства или принятое безопасное решение.',
      image: 'photo1.png',
      image_alt: 'Пример обложки кейса',
      excerpt_text: 'Короткое описание будущего кейса.',
      url: '/cms/preview/case',
    },
    body: `## Задача

В этом разделе описывается исходная ситуация клиента: какой участок рассматривался, какую цель планировали реализовать и что требовалось проверить.

## Что было обнаружено

Здесь последовательно раскрываются найденные ограничения, документы и факты. При необходимости между абзацами можно добавлять фотографии, карты и схемы.

## Решение и результат

Финальная часть показывает выполненную работу и практический результат для клиента.`,
  },
];
for (const preview of previews) {
  const layout = stripFrontMatter(await readFile(path.join(root, '_layouts', `${preview.type}.html`), 'utf8'));
  const html = await engine.parseAndRender(layout, {
    site,
    page: preview.page,
    content: renderMarkdown(preview.body),
  });
  await writeFile(path.join(previewDirectory, preview.filename), html, 'utf8');
}

for (const asset of [
  'style.css',
  'analytics.js',
  'logo svg.svg',
  'logo2.svg',
  'logo3.svg',
  'alexandr.png',
  'background1.png',
  'background2.png',
  'ChatGPT Image 23 мая 2026 г., 11_57_55.png',
  'photo1.png',
  'photo2.png',
  'photo3.png',
  'photo4.png',
]) {
  await cp(path.join(root, asset), path.join(output, asset));
}

await cp(path.join(root, 'media'), path.join(output, 'media'), { recursive: true, force: true }).catch((error) => {
  if (error.code !== 'ENOENT') throw error;
});

console.log(`Built ${output}: ${site.posts.length} articles, ${site.cases.length} cases`);
