import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Liquid } from 'liquidjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, '_site');
const baseurl = (process.env.BASEURL || '').replace(/\/$/, '');

const readJson = async (file) => JSON.parse(await readFile(path.join(root, '_data', file), 'utf8'));

const site = {
  baseurl,
  data: {
    site: await readJson('site.json'),
    home: await readJson('home.json'),
    services: await readJson('services.json'),
  },
};

const engine = new Liquid({
  root: [path.join(root, '_includes'), root],
  extname: '.html',
  cache: false,
  dynamicPartials: false,
});

engine.registerFilter('relative_url', (value) => {
  if (!value) return '';
  if (/^(?:https?:)?\/\//.test(value) || value.startsWith('data:')) return value;
  const clean = String(value).replace(/^\//, '');
  return `${baseurl}/${clean}` || `/${clean}`;
});

const stripFrontMatter = (source) => source.replace(/^---\s*\r?\n[\s\S]*?\r?\n---\s*\r?\n/, '');

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

for (const page of ['index.html', 'services.html']) {
  const template = stripFrontMatter(await readFile(path.join(root, page), 'utf8'));
  const html = await engine.parseAndRender(template, { site });
  await writeFile(path.join(output, page), html, 'utf8');
}

for (const asset of [
  'style.css',
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

console.log(`Built ${output}`);
