import crypto from 'node:crypto';
import { mkdir, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import multer from 'multer';
import { marked } from 'marked';
import { CmsDatabase, PAGE_KEYS } from './lib/database.mjs';
import {
  clearSessionCookie,
  createSessionToken,
  parseCookies,
  readSessionToken,
  sessionCookie,
  verifyPassword,
} from './lib/auth.mjs';
import { Publisher } from './lib/publisher.mjs';
import {
  richTextHtml,
  sanitizeRichTree,
  sanitizeStoredRichText,
} from './lib/rich-text.mjs';

const cmsDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(cmsDir, '..');
const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || '127.0.0.1';
const production = process.env.NODE_ENV === 'production';
const secureCookie = process.env.CMS_SECURE_COOKIE === '1' || production;
const siteUrl = (process.env.SITE_URL || `http://${host}:${port}`).replace(/\/$/, '');
const baseurl = (process.env.BASEURL || '').replace(/\/$/, '');
const databaseFile = path.resolve(root, process.env.CMS_DB_PATH || 'data/cms.sqlite');
const mediaDirectory = path.resolve(root, process.env.CMS_MEDIA_DIR || 'media/uploads');
const sessionSecret = process.env.CMS_SESSION_SECRET || (production ? '' : crypto.randomBytes(32).toString('hex'));

if (!sessionSecret || sessionSecret.length < 32) {
  throw new Error('CMS_SESSION_SECRET должен содержать не менее 32 символов.');
}

await mkdir(mediaDirectory, { recursive: true });
if (process.env.CMS_RESET_DATABASE === '1' && !production) {
  await Promise.all([
    databaseFile,
    `${databaseFile}-shm`,
    `${databaseFile}-wal`,
  ].map((filename) => rm(filename, { force: true })));
}

const database = new CmsDatabase({ root, filename: databaseFile });
await database.init();

const initialEmail = process.env.CMS_ADMIN_EMAIL || (production ? '' : 'admin@gradstroy.local');
const initialPassword = process.env.CMS_ADMIN_PASSWORD || (production ? '' : 'admin12345');
if (!initialEmail || !initialPassword || initialPassword.length < 8) {
  throw new Error('Укажите CMS_ADMIN_EMAIL и CMS_ADMIN_PASSWORD (не короче 8 символов).');
}
const adminCreated = database.ensureInitialAdmin({ email: initialEmail, password: initialPassword });
if (adminCreated && !production) {
  console.log(`Локальный вход: ${initialEmail} / ${initialPassword}`);
}

const publisher = new Publisher({ root, database, siteUrl, baseurl });
const app = express();
if (process.env.CMS_TRUST_PROXY === '1') app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use((request, response, next) => {
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('X-Frame-Options', 'DENY');
  response.setHeader('Referrer-Policy', 'same-origin');
  response.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.setHeader('Content-Security-Policy', [
    "default-src 'self'",
    "img-src 'self' data:",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "script-src 'self'",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; '));
  next();
});
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: false, limit: '2mb' }));

const containsDamagedEncoding = (value) => {
  if (typeof value === 'string') {
    const questionMarks = (value.match(/\?/g) || []).length;
    const visibleCharacters = value.replace(/\s/g, '').length;
    return questionMarks >= 6 && questionMarks / Math.max(visibleCharacters, 1) >= 0.25;
  }
  if (Array.isArray(value)) return value.some(containsDamagedEncoding);
  if (value && typeof value === 'object') return Object.values(value).some(containsDamagedEncoding);
  return false;
};

const rejectDamagedEncoding = (value) => {
  if (!containsDamagedEncoding(value)) return;
  const error = new Error('Текст не сохранён: обнаружено повреждение кодировки. Обновите страницу и повторите ввод.');
  error.status = 400;
  throw error;
};

const loginAttempts = new Map();
const analyticsAttempts = new Map();

const analyticsLimited = (ip) => {
  const now = Date.now();
  const current = analyticsAttempts.get(ip);
  if (!current || now - current.startedAt > 60_000) {
    analyticsAttempts.set(ip, { count: 1, startedAt: now });
    return false;
  }
  current.count += 1;
  return current.count > 180;
};

const loginLimited = (ip) => {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry || now - entry.startedAt > 15 * 60 * 1000) {
    loginAttempts.set(ip, { count: 0, startedAt: now });
    return false;
  }
  return entry.count >= 10;
};

const registerFailedLogin = (ip) => {
  const current = loginAttempts.get(ip) || { count: 0, startedAt: Date.now() };
  current.count += 1;
  loginAttempts.set(ip, current);
};

const requireUser = (request, response, next) => {
  const token = parseCookies(request.headers.cookie).cms_session;
  const session = readSessionToken(token, sessionSecret);
  const user = session ? database.getUserById(session.sub) : null;
  if (!user || !user.active) {
    response.status(401).json({ error: 'Требуется вход в систему.' });
    return;
  }
  request.user = user;
  next();
};

const requireAdmin = (request, response, next) => {
  if (request.user.role !== 'admin') {
    response.status(403).json({ error: 'Это действие доступно только администратору.' });
    return;
  }
  next();
};

const validateSameOrigin = (request, response, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return next();
  const origin = request.headers.origin;
  if (!origin) return next();
  try {
    if (new URL(origin).host !== request.headers.host) {
      response.status(403).json({ error: 'Запрос отклонён.' });
      return;
    }
  } catch {
    response.status(403).json({ error: 'Запрос отклонён.' });
    return;
  }
  next();
};
app.use(validateSameOrigin);

app.post('/api/auth/login', (request, response) => {
  if (loginLimited(request.ip)) {
    response.status(429).json({ error: 'Слишком много попыток. Повторите вход через 15 минут.' });
    return;
  }
  const email = String(request.body.email || '').trim().toLowerCase();
  const password = String(request.body.password || '');
  const user = database.getUserByEmail(email);
  if (!user || !user.active || !verifyPassword(password, user.password_hash)) {
    registerFailedLogin(request.ip);
    response.status(401).json({ error: 'Неверная электронная почта или пароль.' });
    return;
  }
  loginAttempts.delete(request.ip);
  response.setHeader('Set-Cookie', sessionCookie(createSessionToken(user, sessionSecret), secureCookie));
  database.log(user.id, 'login', 'cms');
  response.json({ user: database.getUserById(user.id) });
});

app.post('/api/auth/logout', (request, response) => {
  response.setHeader('Set-Cookie', clearSessionCookie(secureCookie));
  response.json({ ok: true });
});

app.get('/api/health', (request, response) => {
  response.json({ ok: true, time: new Date().toISOString() });
});

app.post('/api/analytics/track', (request, response) => {
  if (analyticsLimited(request.ip)) {
    response.sendStatus(429);
    return;
  }
  if (/(?:bot|crawler|spider|preview|headless|lighthouse)/i.test(request.headers['user-agent'] || '')) {
    response.sendStatus(204);
    return;
  }
  const visitor = String(request.body?.visitor || '').trim();
  if (!/^[a-zA-Z0-9_-]{16,100}$/.test(visitor)) {
    response.sendStatus(204);
    return;
  }
  const visitorId = crypto.createHmac('sha256', sessionSecret).update(visitor).digest('hex');
  database.recordVisit({
    visitorId,
    pagePath: request.body?.path,
    title: request.body?.title,
    referrer: request.body?.referrer,
    pageview: request.body?.type === 'pageview',
  });
  response.sendStatus(204);
});

app.get('/api/auth/me', requireUser, (request, response) => {
  response.json({ user: request.user, siteUrl });
});

app.get('/api/dashboard', requireUser, (request, response) => {
  response.json(database.getDashboard());
});

app.get('/api/pages', requireUser, (request, response) => {
  response.json(database.listPages());
});

app.get('/api/pages/:key', requireUser, (request, response) => {
  if (!PAGE_KEYS.includes(request.params.key)) {
    response.status(404).json({ error: 'Страница не найдена.' });
    return;
  }
  response.json(database.getPage(request.params.key));
});

app.put('/api/pages/:key', requireUser, async (request, response, next) => {
  try {
    if (!PAGE_KEYS.includes(request.params.key) || !request.body?.data || Array.isArray(request.body.data)) {
      response.status(400).json({ error: 'Некорректные данные страницы.' });
      return;
    }
    const cleanData = sanitizeRichTree(request.body.data);
    rejectDamagedEncoding(cleanData);
    const saved = database.savePage(request.params.key, cleanData, request.user.id);
    const publication = await publisher.publish(request.user.id);
    response.json({ page: saved, publication });
  } catch (error) {
    next(error);
  }
});

const normalizeSlug = (value) => String(value || '')
  .toLowerCase()
  .trim()
  .replace(/[^a-z0-9а-яё_-]+/giu, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 100);

const validateEntry = (input) => {
  rejectDamagedEncoding(input);
  const type = input.type === 'case' ? 'case' : 'article';
  const title = String(input.title || '').trim();
  const slug = normalizeSlug(input.slug || title);
  if (!title) throw new Error('Укажите название.');
  if (!slug) throw new Error('Не удалось сформировать адрес страницы.');
  return {
    id: input.id ? Number(input.id) : null,
    type,
    slug,
    title: title.slice(0, 160),
    subtitle: sanitizeStoredRichText(String(input.subtitle || '').slice(0, 5_000)),
    date: input.date ? new Date(input.date).toISOString() : new Date().toISOString(),
    category: String(input.category || '').slice(0, 100),
    service: String(input.service || '').slice(0, 120),
    location: String(input.location || '').slice(0, 120),
    result: sanitizeStoredRichText(String(input.result || '').slice(0, 6_000)),
    excerpt_text: String(input.excerpt_text || '').slice(0, 600),
    seo_title: String(input.seo_title || '').slice(0, 160),
    seo_description: String(input.seo_description || '').slice(0, 400),
    image: String(input.image || '').slice(0, 500),
    image_alt: String(input.image_alt || '').slice(0, 250),
    featured: Boolean(input.featured),
    published: input.published !== false,
    body: sanitizeStoredRichText(String(input.body || '').slice(0, 200_000)),
  };
};

app.get('/api/entries', requireUser, (request, response) => {
  const type = request.query.type === 'case' ? 'case' : 'article';
  response.json(database.listEntries(type));
});

app.get('/api/entries/:id', requireUser, (request, response) => {
  const entry = database.getEntry(Number(request.params.id));
  if (!entry) {
    response.status(404).json({ error: 'Материал не найден.' });
    return;
  }
  response.json(entry);
});

app.post('/api/entries', requireUser, async (request, response, next) => {
  try {
    const entry = database.saveEntry(validateEntry(request.body), request.user.id);
    const publication = await publisher.publish(request.user.id);
    response.status(201).json({ entry, publication });
  } catch (error) {
    next(error);
  }
});

app.put('/api/entries/:id', requireUser, async (request, response, next) => {
  try {
    const current = database.getEntry(Number(request.params.id));
    if (!current) {
      response.status(404).json({ error: 'Материал не найден.' });
      return;
    }
    const entry = database.saveEntry(validateEntry({ ...request.body, id: current.id, type: current.type }), request.user.id);
    const publication = await publisher.publish(request.user.id);
    response.json({ entry, publication });
  } catch (error) {
    next(error);
  }
});

app.delete('/api/entries/:id', requireUser, async (request, response, next) => {
  try {
    if (!database.deleteEntry(Number(request.params.id), request.user.id)) {
      response.status(404).json({ error: 'Материал не найден.' });
      return;
    }
    const publication = await publisher.publish(request.user.id);
    response.json({ ok: true, publication });
  } catch (error) {
    next(error);
  }
});

const allowedTypes = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
]);
const upload = multer({
  storage: multer.diskStorage({
    destination: mediaDirectory,
    filename: (request, file, callback) => {
      const extension = allowedTypes.get(file.mimetype) || '';
      callback(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${extension}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (request, file, callback) => callback(null, allowedTypes.has(file.mimetype)),
});

app.get('/api/media', requireUser, (request, response) => {
  response.json(database.listMedia());
});

const isRealImage = async (filename, mimeType) => {
  const bytes = await readFile(filename);
  if (mimeType === 'image/jpeg') return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mimeType === 'image/png') return bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (mimeType === 'image/webp') return bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP';
  return false;
};

app.post('/api/media', requireUser, upload.single('image'), async (request, response, next) => {
  if (!request.file) {
    response.status(400).json({ error: 'Выберите изображение JPG, PNG или WEBP размером до 10 МБ.' });
    return;
  }
  try {
    if (!await isRealImage(request.file.path, request.file.mimetype)) {
      await rm(request.file.path, { force: true });
      response.status(400).json({ error: 'Содержимое файла не похоже на изображение.' });
      return;
    }
    const url = `media/uploads/${request.file.filename}`;
    const item = database.addMedia({
      filename: request.file.filename,
      originalName: request.file.originalname,
      mimeType: request.file.mimetype,
      size: request.file.size,
      url,
    }, request.user.id);
    response.status(201).json(item);
  } catch (error) {
    next(error);
  }
});

app.delete('/api/media/:id', requireUser, requireAdmin, async (request, response, next) => {
  try {
    const item = database.deleteMedia(Number(request.params.id), request.user.id);
    if (!item) {
      response.status(404).json({ error: 'Файл не найден.' });
      return;
    }
    await rm(path.join(mediaDirectory, item.filename), { force: true });
    response.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.get('/api/users', requireUser, requireAdmin, (request, response) => {
  response.json(database.listUsers());
});

app.post('/api/users', requireUser, requireAdmin, (request, response, next) => {
  try {
    const email = String(request.body.email || '').trim();
    const name = String(request.body.name || '').trim();
    const password = String(request.body.password || '');
    if (!email.includes('@') || !name || password.length < 8) {
      response.status(400).json({ error: 'Укажите имя, корректную почту и пароль не короче 8 символов.' });
      return;
    }
    const user = database.createUser({ email, name, password, role: request.body.role });
    database.log(request.user.id, 'create_user', String(user.id));
    response.status(201).json(user);
  } catch (error) {
    next(error);
  }
});

app.put('/api/users/:id', requireUser, requireAdmin, (request, response, next) => {
  try {
    const id = Number(request.params.id);
    const current = database.getUserById(id);
    if (!current) {
      response.status(404).json({ error: 'Пользователь не найден.' });
      return;
    }
    const changes = {
      name: String(request.body.name || current.name).trim(),
      email: String(request.body.email || current.email).trim(),
      role: request.body.role || current.role,
      active: request.body.active !== false,
      password: String(request.body.password || ''),
    };
    if (!changes.email.includes('@') || !changes.name || (changes.password && changes.password.length < 8)) {
      response.status(400).json({ error: 'Проверьте имя, почту и новый пароль.' });
      return;
    }
    const user = database.updateUser(id, changes);
    database.log(request.user.id, 'update_user', String(id));
    response.json(user);
  } catch (error) {
    next(error);
  }
});

app.post('/api/publish', requireUser, async (request, response, next) => {
  try {
    response.json(await publisher.publish(request.user.id));
  } catch (error) {
    next(error);
  }
});

app.post('/api/markdown-preview', requireUser, (request, response) => {
  const source = String(request.body.markdown || '').slice(0, 200_000);
  const richHtml = richTextHtml(source);
  if (richHtml !== null) {
    response.json({ html: richHtml });
    return;
  }
  const renderer = new marked.Renderer();
  renderer.html = () => '';
  response.json({
    html: marked.parse(source, {
      renderer,
      gfm: true,
      breaks: true,
      walkTokens(token) {
        if ((token.type === 'link' || token.type === 'image') && token.href) {
          const href = String(token.href).trim();
          if (!/^(?:https?:|mailto:|tel:|\/|#)/i.test(href)) token.href = '#';
        }
      },
    }),
  });
});

app.get('/cms/preview/:type', requireUser, (request, response) => {
  if (!['article', 'case'].includes(request.params.type)) {
    response.sendStatus(404);
    return;
  }
  response.sendFile(path.join(root, 'data', 'cms-previews', `${request.params.type}.html`));
});

app.use('/cms', express.static(path.join(cmsDir, 'public'), { index: 'index.html', maxAge: production ? '5m' : 0 }));
app.use('/media/uploads', express.static(mediaDirectory, { maxAge: production ? '7d' : 0, immutable: production }));
app.use(express.static(path.join(root, '_site'), { index: 'index.html', maxAge: production ? '5m' : 0 }));
app.get('/cms/*path', (request, response) => response.sendFile(path.join(cmsDir, 'public', 'index.html')));

app.use((error, request, response, next) => {
  console.error(error);
  if (error instanceof multer.MulterError) {
    response.status(400).json({ error: error.code === 'LIMIT_FILE_SIZE' ? 'Файл больше 10 МБ.' : 'Не удалось загрузить файл.' });
    return;
  }
  if (String(error.message).includes('UNIQUE constraint failed')) {
    response.status(409).json({ error: 'Такое значение уже используется. Измените адрес или электронную почту.' });
    return;
  }
  response.status(error.status || 500).json({
    error: error.status ? error.message : (production ? 'Не удалось выполнить действие.' : error.message),
  });
});

await publisher.publish().catch((error) => {
  console.error(`Первичная публикация не выполнена: ${error.message}`);
});

app.listen(port, host, () => {
  console.log(`Сайт: ${siteUrl}`);
  console.log(`Админка: http://${host}:${port}/cms/`);
});
