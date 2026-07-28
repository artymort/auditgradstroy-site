import { cp, mkdir, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { backup, DatabaseSync } from 'node:sqlite';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const databaseFile = path.resolve(root, process.env.CMS_DB_PATH || 'data/cms.sqlite');
const mediaDirectory = path.resolve(root, process.env.CMS_MEDIA_DIR || 'media/uploads');
const backupRoot = path.resolve(root, process.env.CMS_BACKUP_DIR || 'backups');
const keep = Math.max(3, Number(process.env.CMS_BACKUP_KEEP || 14));
const timestamp = new Date().toISOString().replaceAll(':', '-').replace(/\.\d{3}Z$/, 'Z');
const destination = path.join(backupRoot, timestamp);

await mkdir(destination, { recursive: true });
const source = new DatabaseSync(databaseFile, { readOnly: true });
await backup(source, path.join(destination, 'cms.sqlite'));
source.close();
await cp(mediaDirectory, path.join(destination, 'uploads'), { recursive: true, force: true }).catch((error) => {
  if (error.code !== 'ENOENT') throw error;
});

const directories = (await readdir(backupRoot, { withFileTypes: true }))
  .filter((item) => item.isDirectory())
  .map((item) => item.name)
  .sort()
  .reverse();
for (const oldBackup of directories.slice(keep)) {
  const target = path.resolve(backupRoot, oldBackup);
  if (path.dirname(target) !== backupRoot) throw new Error('Некорректный путь резервной копии.');
  await rm(target, { recursive: true, force: true });
}

console.log(`Backup created: ${destination}`);
