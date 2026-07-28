import crypto from 'node:crypto';

const SESSION_TTL_SECONDS = 60 * 60 * 12;

export const hashPassword = (password) => {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64);
  return `scrypt$${salt.toString('base64url')}$${hash.toString('base64url')}`;
};

export const verifyPassword = (password, encoded) => {
  try {
    const [algorithm, saltText, hashText] = String(encoded).split('$');
    if (algorithm !== 'scrypt' || !saltText || !hashText) return false;
    const expected = Buffer.from(hashText, 'base64url');
    const actual = crypto.scryptSync(password, Buffer.from(saltText, 'base64url'), expected.length);
    return crypto.timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
};

const sign = (value, secret) => crypto.createHmac('sha256', secret).update(value).digest('base64url');

export const createSessionToken = (user, secret) => {
  const payload = Buffer.from(JSON.stringify({
    sub: user.id,
    role: user.role,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  })).toString('base64url');
  return `${payload}.${sign(payload, secret)}`;
};

export const readSessionToken = (token, secret) => {
  try {
    const [payload, signature] = String(token || '').split('.');
    if (!payload || !signature) return null;
    const expected = sign(payload, secret);
    if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!data.sub || !data.exp || data.exp < Math.floor(Date.now() / 1000)) return null;
    return data;
  } catch {
    return null;
  }
};

export const parseCookies = (header = '') => Object.fromEntries(
  header.split(';').map((part) => part.trim()).filter(Boolean).map((part) => {
    const separator = part.indexOf('=');
    if (separator < 0) return [part, ''];
    return [part.slice(0, separator), decodeURIComponent(part.slice(separator + 1))];
  }),
);

export const sessionCookie = (token, secure) => [
  `cms_session=${encodeURIComponent(token)}`,
  'Path=/',
  'HttpOnly',
  'SameSite=Strict',
  `Max-Age=${SESSION_TTL_SECONDS}`,
  secure ? 'Secure' : '',
].filter(Boolean).join('; ');

export const clearSessionCookie = (secure) => [
  'cms_session=',
  'Path=/',
  'HttpOnly',
  'SameSite=Strict',
  'Max-Age=0',
  secure ? 'Secure' : '',
].filter(Boolean).join('; ');
