import { DatabaseSync } from 'node:sqlite';
import { readdirSync, statSync } from 'node:fs';
import { mkdir, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import YAML from 'yaml';
import { hashPassword } from './auth.mjs';

const PAGE_KEYS = ['site', 'home', 'services', 'blog', 'cases', 'expert', 'contacts', 'legal'];
const ANALYTICS_TIME_ZONE = process.env.CMS_ANALYTICS_TIME_ZONE || 'Europe/Moscow';

const analyticsDay = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: ANALYTICS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
};

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.svg']);

const imageMimeType = (extension) => ({
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
}[extension] || 'application/octet-stream');

const parseFrontMatter = (source) => {
  const match = String(source).match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n([\s\S]*)$/);
  if (!match) return null;
  return { attributes: YAML.parse(match[1]) || {}, body: match[2].trim() };
};

const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

const collectChangedPaths = (before, after, prefix = '', changes = []) => {
  if (Object.is(before, after)) return changes;
  if (Array.isArray(before) && Array.isArray(after)) {
    if (before.length !== after.length && prefix) changes.push(prefix);
    const length = Math.max(before.length, after.length);
    for (let index = 0; index < length; index += 1) {
      collectChangedPaths(before[index], after[index], prefix ? `${prefix}.${index}` : String(index), changes);
    }
    return changes;
  }
  if (isRecord(before) && isRecord(after)) {
    const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
    for (const key of keys) {
      collectChangedPaths(before[key], after[key], prefix ? `${prefix}.${key}` : key, changes);
    }
    return changes;
  }
  if (prefix) changes.push(prefix);
  return changes;
};

const activityTarget = (value) => JSON.stringify(value);

export class CmsDatabase {
  constructor({ root, filename }) {
    this.root = root;
    this.filename = filename;
    this.db = null;
  }

  async init() {
    await mkdir(path.dirname(this.filename), { recursive: true });
    this.db = new DatabaseSync(this.filename);
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE COLLATE NOCASE,
        name TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'editor',
        active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS content_pages (
        key TEXT PRIMARY KEY,
        data_json TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        updated_by INTEGER,
        FOREIGN KEY(updated_by) REFERENCES users(id)
      );
      CREATE TABLE IF NOT EXISTS entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL CHECK(type IN ('article', 'case')),
        slug TEXT NOT NULL,
        title TEXT NOT NULL,
        subtitle TEXT NOT NULL DEFAULT '',
        date TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT '',
        service TEXT NOT NULL DEFAULT '',
        location TEXT NOT NULL DEFAULT '',
        result TEXT NOT NULL DEFAULT '',
        excerpt_text TEXT NOT NULL DEFAULT '',
        seo_title TEXT NOT NULL DEFAULT '',
        seo_description TEXT NOT NULL DEFAULT '',
        image TEXT NOT NULL DEFAULT '',
        image_alt TEXT NOT NULL DEFAULT '',
        featured INTEGER NOT NULL DEFAULT 0,
        published INTEGER NOT NULL DEFAULT 1,
        body TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        updated_by INTEGER,
        UNIQUE(type, slug),
        FOREIGN KEY(updated_by) REFERENCES users(id)
      );
      CREATE TABLE IF NOT EXISTS media (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT NOT NULL UNIQUE,
        original_name TEXT NOT NULL,
        mime_type TEXT NOT NULL,
        size INTEGER NOT NULL,
        url TEXT NOT NULL,
        created_at TEXT NOT NULL,
        uploaded_by INTEGER,
        FOREIGN KEY(uploaded_by) REFERENCES users(id)
      );
      CREATE TABLE IF NOT EXISTS activity (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        action TEXT NOT NULL,
        target TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY(user_id) REFERENCES users(id)
      );
      CREATE TABLE IF NOT EXISTS leads (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL DEFAULT '',
        phone TEXT NOT NULL,
        cadastral TEXT NOT NULL DEFAULT '',
        message TEXT NOT NULL DEFAULT '',
        form_name TEXT NOT NULL DEFAULT '',
        page_path TEXT NOT NULL DEFAULT '',
        page_title TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'new'
          CHECK(status IN ('new', 'queued', 'failed', 'handled')),
        delivery_error TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL,
        sent_at TEXT NOT NULL DEFAULT '',
        handled_at TEXT NOT NULL DEFAULT ''
      );
      CREATE INDEX IF NOT EXISTS leads_status_idx ON leads(status);
      CREATE INDEX IF NOT EXISTS leads_created_idx ON leads(created_at);
      CREATE TABLE IF NOT EXISTS analytics_pageviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        visitor_id TEXT NOT NULL,
        path TEXT NOT NULL,
        title TEXT NOT NULL DEFAULT '',
        referrer TEXT NOT NULL DEFAULT '',
        day TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS analytics_pageviews_day_idx ON analytics_pageviews(day);
      CREATE INDEX IF NOT EXISTS analytics_pageviews_path_idx ON analytics_pageviews(path);
      CREATE INDEX IF NOT EXISTS analytics_pageviews_visitor_idx ON analytics_pageviews(visitor_id);
      CREATE TABLE IF NOT EXISTS analytics_sessions (
        visitor_id TEXT PRIMARY KEY,
        current_path TEXT NOT NULL,
        title TEXT NOT NULL DEFAULT '',
        started_at TEXT NOT NULL,
        last_seen TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS analytics_sessions_seen_idx ON analytics_sessions(last_seen);
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);
    await this.seedPages();
    await this.seedEntries();
  }

  now() {
    return new Date().toISOString();
  }

  async seedPages() {
    const insert = this.db.prepare('INSERT OR IGNORE INTO content_pages (key, data_json, updated_at) VALUES (?, ?, ?)');
    for (const key of PAGE_KEYS) {
      const data = await readFile(path.join(this.root, '_data', `${key}.json`), 'utf8');
      insert.run(key, data, this.now());
    }

    const sitePage = this.db.prepare('SELECT data_json FROM content_pages WHERE key = ?').get('site');
    if (sitePage) {
      const siteData = JSON.parse(sitePage.data_json);
      let changed = false;
      for (const obsoleteKey of ['privacy_label', 'privacy_url', 'agreement_label', 'agreement_url']) {
        if (Object.hasOwn(siteData.contacts || {}, obsoleteKey)) {
          delete siteData.contacts[obsoleteKey];
          changed = true;
        }
      }
      if (changed) {
        this.db.prepare('UPDATE content_pages SET data_json = ?, updated_at = ? WHERE key = ?')
          .run(JSON.stringify(siteData), this.now(), 'site');
      }
    }
  }

  async seedEntries() {
    const count = this.db.prepare('SELECT COUNT(*) AS count FROM entries').get().count;
    if (count > 0) return;
    const configs = [
      { type: 'article', directory: '_posts' },
      { type: 'case', directory: '_cases' },
    ];
    const insert = this.db.prepare(`
      INSERT OR IGNORE INTO entries (
        type, slug, title, subtitle, date, category, service, location, result,
        excerpt_text, seo_title, seo_description, image, image_alt, featured,
        published, body, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const config of configs) {
      const directory = path.join(this.root, config.directory);
      const files = await readdir(directory).catch(() => []);
      for (const file of files.filter((name) => name.endsWith('.md'))) {
        const parsed = parseFrontMatter(await readFile(path.join(directory, file), 'utf8'));
        if (!parsed) continue;
        const item = parsed.attributes;
        const fallbackSlug = file.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/\.md$/, '');
        const now = this.now();
        insert.run(
          config.type,
          item.slug || fallbackSlug,
          item.title || 'Без названия',
          item.subtitle || '',
          item.date ? new Date(item.date).toISOString() : now,
          item.category || '',
          item.service || '',
          item.location || '',
          item.result || '',
          item.excerpt_text || '',
          item.seo_title || '',
          item.seo_description || '',
          item.image || '',
          item.image_alt || '',
          item.popular || item.featured ? 1 : 0,
          item.published === false ? 0 : 1,
          parsed.body,
          now,
          now,
        );
      }
    }
  }

  ensureInitialAdmin({ email, password, name = 'Администратор' }) {
    const count = this.db.prepare('SELECT COUNT(*) AS count FROM users').get().count;
    if (count > 0) return false;
    const now = this.now();
    this.db.prepare(`
      INSERT INTO users (email, name, password_hash, role, active, created_at, updated_at)
      VALUES (?, ?, ?, 'admin', 1, ?, ?)
    `).run(email.toLowerCase(), name, hashPassword(password), now, now);
    return true;
  }

  getUserByEmail(email) {
    return this.db.prepare('SELECT * FROM users WHERE email = ? COLLATE NOCASE').get(email);
  }

  getUserById(id) {
    return this.db.prepare('SELECT id, email, name, role, active, created_at, updated_at FROM users WHERE id = ?').get(id);
  }

  listUsers() {
    return this.db.prepare('SELECT id, email, name, role, active, created_at, updated_at FROM users ORDER BY name').all();
  }

  createUser({ email, name, password, role = 'editor' }) {
    const now = this.now();
    const result = this.db.prepare(`
      INSERT INTO users (email, name, password_hash, role, active, created_at, updated_at)
      VALUES (?, ?, ?, ?, 1, ?, ?)
    `).run(email.toLowerCase(), name, hashPassword(password), role === 'admin' ? 'admin' : 'editor', now, now);
    return this.getUserById(Number(result.lastInsertRowid));
  }

  updateUser(id, changes) {
    const current = this.getUserById(id);
    if (!current) return null;
    const role = changes.role === 'admin' ? 'admin' : 'editor';
    const active = changes.active === false ? 0 : 1;
    const now = this.now();
    if (changes.password) {
      this.db.prepare('UPDATE users SET name=?, email=?, role=?, active=?, password_hash=?, updated_at=? WHERE id=?')
        .run(changes.name, changes.email.toLowerCase(), role, active, hashPassword(changes.password), now, id);
    } else {
      this.db.prepare('UPDATE users SET name=?, email=?, role=?, active=?, updated_at=? WHERE id=?')
        .run(changes.name, changes.email.toLowerCase(), role, active, now, id);
    }
    return this.getUserById(id);
  }

  listPages() {
    return this.db.prepare('SELECT key, updated_at FROM content_pages ORDER BY key').all();
  }

  getPage(key) {
    const row = this.db.prepare('SELECT * FROM content_pages WHERE key = ?').get(key);
    if (!row) return null;
    return { key: row.key, data: JSON.parse(row.data_json), updated_at: row.updated_at };
  }

  savePage(key, data, userId) {
    const previous = this.getPage(key)?.data || {};
    const changedPaths = [...new Set(collectChangedPaths(previous, data))];
    const now = this.now();
    this.db.prepare(`
      INSERT INTO content_pages (key, data_json, updated_at, updated_by)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET data_json=excluded.data_json, updated_at=excluded.updated_at, updated_by=excluded.updated_by
    `).run(key, JSON.stringify(data, null, 2), now, userId);
    this.log(userId, 'save_page', activityTarget({
      kind: 'page',
      key,
      paths: changedPaths.slice(0, 20),
      count: changedPaths.length,
    }));
    return this.getPage(key);
  }

  listEntries(type) {
    return this.db.prepare(`
      SELECT * FROM entries WHERE type = ? ORDER BY date DESC, id DESC
    `).all(type).map(this.normalizeEntry);
  }

  getEntry(id) {
    const row = this.db.prepare('SELECT * FROM entries WHERE id = ?').get(id);
    return row ? this.normalizeEntry(row) : null;
  }

  saveEntry(item, userId) {
    const previous = item.id ? this.getEntry(Number(item.id)) : null;
    const now = this.now();
    const values = [
      item.type,
      item.slug,
      item.title,
      item.subtitle || '',
      item.date || now,
      item.category || '',
      item.service || '',
      item.location || '',
      item.result || '',
      item.excerpt_text || '',
      item.seo_title || '',
      item.seo_description || '',
      item.image || '',
      item.image_alt || '',
      item.featured ? 1 : 0,
      item.published === false ? 0 : 1,
      item.body || '',
      now,
      userId,
    ];
    let id = Number(item.id || 0);
    if (id) {
      this.db.prepare(`
        UPDATE entries SET type=?, slug=?, title=?, subtitle=?, date=?, category=?, service=?, location=?, result=?,
          excerpt_text=?, seo_title=?, seo_description=?, image=?, image_alt=?, featured=?, published=?, body=?,
          updated_at=?, updated_by=? WHERE id=?
      `).run(...values, id);
    } else {
      const result = this.db.prepare(`
        INSERT INTO entries (
          type, slug, title, subtitle, date, category, service, location, result, excerpt_text,
          seo_title, seo_description, image, image_alt, featured, published, body, created_at, updated_at, updated_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(...values.slice(0, 17), now, now, userId);
      id = Number(result.lastInsertRowid);
    }
    const changedFields = previous
      ? Object.keys(item).filter((key) => key !== 'id' && !Object.is(previous[key], item[key]))
      : [];
    this.log(userId, item.id ? 'update_entry' : 'create_entry', activityTarget({
      kind: 'entry',
      type: item.type,
      id,
      title: item.title,
      fields: changedFields,
      count: changedFields.length,
    }));
    return this.getEntry(id);
  }

  deleteEntry(id, userId) {
    const current = this.getEntry(id);
    if (!current) return false;
    this.db.prepare('DELETE FROM entries WHERE id = ?').run(id);
    this.log(userId, 'delete_entry', activityTarget({
      kind: 'entry',
      type: current.type,
      id,
      title: current.title,
    }));
    return true;
  }

  normalizeEntry(row) {
    return {
      ...row,
      featured: Boolean(row.featured),
      published: Boolean(row.published),
    };
  }

  addMedia(item, userId) {
    const now = this.now();
    const result = this.db.prepare(`
      INSERT INTO media (filename, original_name, mime_type, size, url, created_at, uploaded_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(item.filename, item.originalName, item.mimeType, item.size, item.url, now, userId);
    this.log(userId, 'upload_media', activityTarget({
      kind: 'media',
      name: item.originalName,
    }));
    return this.db.prepare('SELECT * FROM media WHERE id = ?').get(Number(result.lastInsertRowid));
  }

  listMedia() {
    const uploaded = this.db.prepare('SELECT * FROM media ORDER BY created_at DESC').all()
      .map((item) => ({ ...item, system: false }));
    const system = [];
    const addDirectory = (directory, urlPrefix, recursive = false) => {
      for (const entry of readdirSync(directory, { withFileTypes: true })) {
        if (entry.isDirectory()) {
          if (recursive && entry.name !== 'uploads') {
            addDirectory(path.join(directory, entry.name), `${urlPrefix}/${entry.name}`, true);
          }
          continue;
        }
        const extension = path.extname(entry.name).toLowerCase();
        if (!IMAGE_EXTENSIONS.has(extension)) continue;
        const filename = path.join(directory, entry.name);
        system.push({
          id: `system:${urlPrefix}/${entry.name}`,
          filename: entry.name,
          original_name: entry.name,
          mime_type: imageMimeType(extension),
          size: statSync(filename).size,
          url: `${urlPrefix}/${entry.name}`.replace(/^\.\//, ''),
          created_at: '',
          uploaded_by: null,
          system: true,
        });
      }
    };
    addDirectory(this.root, '.', false);
    const mediaRoot = path.join(this.root, 'media');
    try {
      addDirectory(mediaRoot, 'media', true);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    return [...uploaded, ...system.sort((left, right) => left.original_name.localeCompare(right.original_name, 'ru'))];
  }

  getMedia(id) {
    return this.db.prepare('SELECT * FROM media WHERE id = ?').get(id);
  }

  deleteMedia(id, userId) {
    const item = this.getMedia(id);
    if (!item) return null;
    this.db.prepare('DELETE FROM media WHERE id = ?').run(id);
    this.log(userId, 'delete_media', activityTarget({
      kind: 'media',
      name: item.original_name,
    }));
    return item;
  }

  createLead(item) {
    const now = this.now();
    const result = this.db.prepare(`
      INSERT INTO leads (
        name, phone, cadastral, message, form_name, page_path, page_title,
        status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'new', ?)
    `).run(
      item.name || '',
      item.phone,
      item.cadastral || '',
      item.message || '',
      item.form || '',
      item.page || '',
      item.pageTitle || '',
      now,
    );
    return this.getLead(Number(result.lastInsertRowid));
  }

  getLead(id) {
    return this.db.prepare('SELECT * FROM leads WHERE id = ?').get(id);
  }

  listLeads(limit = 200) {
    const safeLimit = Math.min(500, Math.max(1, Number(limit) || 200));
    return this.db.prepare('SELECT * FROM leads ORDER BY id DESC LIMIT ?').all(safeLimit);
  }

  markLeadDelivery(id, { status, error = '', sentAt = '' }) {
    this.db.prepare(`
      UPDATE leads
      SET status = ?, delivery_error = ?, sent_at = ?
      WHERE id = ?
    `).run(status, String(error || '').slice(0, 1_000), sentAt, id);
    return this.getLead(id);
  }

  markLeadHandled(id, userId) {
    const lead = this.getLead(id);
    if (!lead) return null;
    const handled = lead.status === 'handled';
    const status = handled ? (lead.sent_at ? 'queued' : 'new') : 'handled';
    const handledAt = handled ? '' : this.now();
    this.db.prepare('UPDATE leads SET status = ?, handled_at = ? WHERE id = ?')
      .run(status, handledAt, id);
    this.log(userId, handled ? 'reopen_lead' : 'handle_lead', activityTarget({
      kind: 'lead',
      id,
      phone: lead.phone,
    }));
    return this.getLead(id);
  }

  deleteLead(id, userId) {
    const lead = this.getLead(id);
    if (!lead) return null;
    this.db.prepare('DELETE FROM leads WHERE id = ?').run(id);
    this.log(userId, 'delete_lead', activityTarget({
      kind: 'lead',
      id,
      phone: lead.phone,
    }));
    return lead;
  }

  setSetting(key, value) {
    this.db.prepare(`
      INSERT INTO settings (key, value) VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value=excluded.value
    `).run(key, String(value));
  }

  getSetting(key, fallback = '') {
    return this.db.prepare('SELECT value FROM settings WHERE key = ?').get(key)?.value || fallback;
  }

  recordVisit({ visitorId, pagePath, title = '', referrer = '', pageview = false }) {
    const now = this.now();
    const cleanPath = String(pagePath || '/').split('?')[0].split('#')[0].slice(0, 300) || '/';
    const cleanTitle = String(title || '').slice(0, 200);
    if (pageview) {
      const result = this.db.prepare(`
        INSERT INTO analytics_pageviews (visitor_id, path, title, referrer, day, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(visitorId, cleanPath, cleanTitle, String(referrer || '').slice(0, 500), analyticsDay(), now);
      if (Number(result.lastInsertRowid) % 250 === 0) {
        this.db.prepare("DELETE FROM analytics_pageviews WHERE created_at < datetime('now', '-400 days')").run();
        this.db.prepare("DELETE FROM analytics_sessions WHERE last_seen < datetime('now', '-2 days')").run();
      }
    }
    this.db.prepare(`
      INSERT INTO analytics_sessions (visitor_id, current_path, title, started_at, last_seen)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(visitor_id) DO UPDATE SET
        current_path=excluded.current_path,
        title=excluded.title,
        last_seen=excluded.last_seen
    `).run(visitorId, cleanPath, cleanTitle, now, now);
  }

  getAnalytics(days = 30) {
    const today = analyticsDay();
    const yesterday = analyticsDay(new Date(Date.now() - 24 * 60 * 60 * 1000));
    const dayList = Array.from({ length: days }, (_, index) => (
      analyticsDay(new Date(Date.now() - (days - index - 1) * 24 * 60 * 60 * 1000))
    ));
    const firstDay = dayList[0];
    const weekStart = dayList[Math.max(0, dayList.length - 7)];
    const onlineSince = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const dailyRows = this.db.prepare(`
      SELECT day, COUNT(*) AS views, COUNT(DISTINCT visitor_id) AS visitors
      FROM analytics_pageviews
      WHERE day >= ?
      GROUP BY day
      ORDER BY day
    `).all(firstDay);
    const daily = new Map(dailyRows.map((row) => [row.day, row]));
    const period = (startDay, endDay = today) => this.db.prepare(`
      SELECT COUNT(*) AS views, COUNT(DISTINCT visitor_id) AS visitors
      FROM analytics_pageviews
      WHERE day >= ? AND day <= ?
    `).get(startDay, endDay);
    return {
      today: period(today),
      yesterday: period(yesterday, yesterday),
      week: period(weekStart),
      month: period(firstDay),
      online: this.db.prepare('SELECT COUNT(*) AS count FROM analytics_sessions WHERE last_seen >= ?').get(onlineSince).count,
      series: dayList.map((day) => ({
        day,
        views: daily.get(day)?.views || 0,
        visitors: daily.get(day)?.visitors || 0,
      })),
      popular: this.db.prepare(`
        SELECT path, MAX(title) AS title, COUNT(*) AS views, COUNT(DISTINCT visitor_id) AS visitors
        FROM analytics_pageviews
        WHERE day >= ?
        GROUP BY path
        ORDER BY views DESC, path
        LIMIT 8
      `).all(firstDay),
    };
  }

  getDashboard() {
    return {
      articles: this.db.prepare("SELECT COUNT(*) AS count FROM entries WHERE type='article'").get().count,
      cases: this.db.prepare("SELECT COUNT(*) AS count FROM entries WHERE type='case'").get().count,
      media: this.listMedia().length,
      users: this.db.prepare('SELECT COUNT(*) AS count FROM users WHERE active=1').get().count,
      leads: this.db.prepare('SELECT COUNT(*) AS count FROM leads').get().count,
      newLeads: this.db.prepare("SELECT COUNT(*) AS count FROM leads WHERE status != 'handled'").get().count,
      analytics: this.getAnalytics(),
      lastPublishedAt: this.getSetting('last_published_at', ''),
      recent: this.db.prepare(`
        SELECT activity.*, users.name AS user_name FROM activity
        LEFT JOIN users ON users.id = activity.user_id
        WHERE activity.action NOT IN ('publish', 'login')
        ORDER BY activity.id DESC LIMIT 8
      `).all(),
    };
  }

  log(userId, action, target) {
    this.db.prepare('INSERT INTO activity (user_id, action, target, created_at) VALUES (?, ?, ?, ?)')
      .run(userId || null, action, target, this.now());
  }
}

export { PAGE_KEYS };
