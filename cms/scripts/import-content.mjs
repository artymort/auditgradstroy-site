import { DatabaseSync } from 'node:sqlite';
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PAGE_KEYS } from '../lib/database.mjs';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDirectory, '../..');
const databaseFile = path.resolve(root, process.env.CMS_DB_PATH || 'data/cms.sqlite');
const requestedKeys = process.argv.slice(2).filter((value) => !value.startsWith('-'));
const keys = requestedKeys.length ? requestedKeys : PAGE_KEYS;
const unknownKeys = keys.filter((key) => !PAGE_KEYS.includes(key));

if (unknownKeys.length) {
  throw new Error(`Неизвестные разделы: ${unknownKeys.join(', ')}`);
}

await access(databaseFile).catch(() => {
  throw new Error(`База CMS не найдена: ${databaseFile}`);
});

const pages = [];
for (const key of keys) {
  const filename = path.join(root, '_data', `${key}.json`);
  const source = await readFile(filename, 'utf8');
  const parsed = JSON.parse(source);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`Некорректный файл данных: ${filename}`);
  }
  pages.push({ key, source: `${JSON.stringify(parsed, null, 2)}\n` });
}

const database = new DatabaseSync(databaseFile);
database.exec('PRAGMA foreign_keys = ON; BEGIN IMMEDIATE;');

try {
  const upsert = database.prepare(`
    INSERT INTO content_pages (key, data_json, updated_at, updated_by)
    VALUES (?, ?, ?, NULL)
    ON CONFLICT(key) DO UPDATE SET
      data_json=excluded.data_json,
      updated_at=excluded.updated_at,
      updated_by=NULL
  `);
  const now = new Date().toISOString();
  for (const page of pages) {
    upsert.run(page.key, page.source, now);
  }
  database.exec('COMMIT;');
} catch (error) {
  database.exec('ROLLBACK;');
  throw error;
} finally {
  database.close();
}

console.log(`Контент GitHub перенесён в CMS: ${keys.join(', ')}`);
console.log('Пользователи, статистика, изображения, публикации и настройки не изменялись.');
