import assert from 'node:assert/strict';
import test from 'node:test';
import { verifySmartCaptchaToken } from './smartcaptcha.mjs';

const options = {
  token: 'valid-token',
  secret: 'test-secret',
  ip: '203.0.113.5',
  expectedHost: 'xn--80aahfbye3bpckmgl.xn--p1ai',
};

test('rejects missing tokens without contacting Yandex', async () => {
  const result = await verifySmartCaptchaToken({
    ...options,
    token: '',
    fetchImpl: () => { throw new Error('must not be called'); },
  });
  assert.equal(result.ok, false);
});

test('accepts a one-time token only for the configured site', async () => {
  const result = await verifySmartCaptchaToken({
    ...options,
    fetchImpl: async (_url, request) => {
      assert.equal(request.method, 'POST');
      assert.equal(request.body.get('secret'), options.secret);
      assert.equal(request.body.get('token'), options.token);
      assert.equal(request.body.get('ip'), options.ip);
      return {
        ok: true,
        json: async () => ({ status: 'ok', host: 'градстройаудит.рф' }),
      };
    },
  });
  assert.equal(result.ok, true);
});

test('rejects tokens issued for another host', async () => {
  const result = await verifySmartCaptchaToken({
    ...options,
    fetchImpl: async () => ({
      ok: true,
      json: async () => ({ status: 'ok', host: 'attacker.example' }),
    }),
  });
  assert.equal(result.ok, false);
});

test('accepts the www variant when configured for the same site', async () => {
  const result = await verifySmartCaptchaToken({
    ...options,
    expectedHost: [options.expectedHost, `www.${options.expectedHost}`],
    fetchImpl: async () => ({
      ok: true,
      json: async () => ({ status: 'ok', host: 'www.градстройаудит.рф' }),
    }),
  });
  assert.equal(result.ok, true);
});

test('rejects failed validation and fails closed on network errors', async () => {
  const failed = await verifySmartCaptchaToken({
    ...options,
    fetchImpl: async () => ({
      ok: true,
      json: async () => ({ status: 'failed', message: '' }),
    }),
  });
  assert.deepEqual(failed, { ok: false, unavailable: false });

  const unavailable = await verifySmartCaptchaToken({
    ...options,
    fetchImpl: async () => { throw new Error('network down'); },
  });
  assert.deepEqual(unavailable, { ok: false, unavailable: true });
});
