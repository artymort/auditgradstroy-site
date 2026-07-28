import { mkdir, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
import YAML from 'yaml';

const quoteYaml = (value) => YAML.stringify(value).trim();

const safeDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? new Date() : date;
};

const entryFrontMatter = (entry) => {
  const attributes = {
    layout: entry.type === 'article' ? 'article' : 'case',
    slug: entry.slug,
    title: entry.title,
    subtitle: entry.subtitle || '',
    date: safeDate(entry.date).toISOString(),
    excerpt_text: entry.excerpt_text || '',
    seo_title: entry.seo_title || '',
    seo_description: entry.seo_description || '',
    image: entry.image || '',
    image_alt: entry.image_alt || '',
    published: entry.published !== false,
  };
  if (entry.type === 'article') {
    attributes.category = entry.category || '';
    attributes.popular = Boolean(entry.featured);
  } else {
    attributes.service = entry.service || '';
    attributes.location = entry.location || '';
    attributes.result = entry.result || '';
    attributes.featured = Boolean(entry.featured);
  }
  return `---\n${quoteYaml(attributes)}\n---\n\n${entry.body || ''}\n`;
};

const clearMarkdown = async (directory) => {
  await mkdir(directory, { recursive: true });
  const files = await readdir(directory);
  await Promise.all(files.filter((file) => file.endsWith('.md')).map((file) => rm(path.join(directory, file), { force: true })));
};

const runBuild = ({ root, env }) => new Promise((resolve, reject) => {
  const child = spawn(process.execPath, [path.join(root, 'scripts', 'build.mjs')], {
    cwd: root,
    env: { ...process.env, ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  let errorOutput = '';
  child.stdout.on('data', (chunk) => { output += chunk; });
  child.stderr.on('data', (chunk) => { errorOutput += chunk; });
  child.on('error', reject);
  child.on('close', (code) => {
    if (code === 0) resolve(output.trim());
    else reject(new Error(errorOutput.trim() || `Сборка завершилась с кодом ${code}`));
  });
});

export class Publisher {
  constructor({ root, database, siteUrl, baseurl }) {
    this.root = root;
    this.database = database;
    this.siteUrl = siteUrl;
    this.baseurl = baseurl;
    this.activeBuild = null;
  }

  async exportContent() {
    for (const page of this.database.listPages()) {
      const current = this.database.getPage(page.key);
      const target = path.join(this.root, '_data', `${page.key}.json`);
      const temporary = `${target}.tmp`;
      await writeFile(temporary, `${JSON.stringify(current.data, null, 2)}\n`, 'utf8');
      await rename(temporary, target);
    }

    const posts = path.join(this.root, '_posts');
    const cases = path.join(this.root, '_cases');
    await clearMarkdown(posts);
    await clearMarkdown(cases);

    for (const type of ['article', 'case']) {
      const directory = type === 'article' ? posts : cases;
      for (const entry of this.database.listEntries(type)) {
        const date = safeDate(entry.date).toISOString().slice(0, 10);
        const filename = `${date}-${entry.slug}.md`;
        await writeFile(path.join(directory, filename), entryFrontMatter(entry), 'utf8');
      }
    }
  }

  async publish(userId = null) {
    if (this.activeBuild) return this.activeBuild;
    this.activeBuild = (async () => {
      await this.exportContent();
      const output = await runBuild({
        root: this.root,
        env: {
          SITE_URL: this.siteUrl,
          BASEURL: this.baseurl,
        },
      });
      const publishedAt = new Date().toISOString();
      this.database.setSetting('last_published_at', publishedAt);
      this.database.log(userId, 'publish', 'site');
      return { publishedAt, output };
    })();
    try {
      return await this.activeBuild;
    } finally {
      this.activeBuild = null;
    }
  }
}
