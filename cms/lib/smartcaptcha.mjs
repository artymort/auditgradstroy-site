import { domainToASCII } from 'node:url';

const VALIDATE_URL = 'https://smartcaptcha.cloud.yandex.ru/validate';

const normalizeHost = (value) => {
  const host = String(value || '').trim().toLowerCase().replace(/:\d+$/, '');
  return domainToASCII(host);
};

export async function verifySmartCaptchaToken({
  token,
  secret,
  ip,
  expectedHost,
  fetchImpl = fetch,
}) {
  if (typeof token !== 'string' || !token || token.length > 4_096) {
    return { ok: false, unavailable: false };
  }

  const body = new URLSearchParams({ secret, token });
  if (ip) body.set('ip', ip);

  try {
    const response = await fetchImpl(VALIDATE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) return { ok: false, unavailable: true };

    const result = await response.json();
    if (result?.status !== 'ok') return { ok: false, unavailable: false };
    const host = normalizeHost(result.host);
    const allowedHosts = Array.isArray(expectedHost) ? expectedHost : [expectedHost];
    if (!host || !allowedHosts.some((allowedHost) => host === normalizeHost(allowedHost))) {
      return { ok: false, unavailable: false };
    }
    return { ok: true, unavailable: false };
  } catch {
    // A missing verification result must never turn into an accepted lead.
    return { ok: false, unavailable: true };
  }
}
