import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isValidRussianPhone } from './phone.mjs';

test('accepts eleven-digit Russian mobile and landline numbers', () => {
  for (const phone of [
    '89225353533',
    '+79225353533',
    '8 (499) 711-22-88',
    '8 (3532) 90-90-90',
    '+7 (499) 711-22-88',
  ]) assert.equal(isValidRussianPhone(phone), true, phone);
});

test('rejects too few, too many, wrong prefixes and extraneous characters', () => {
  for (const phone of [
    '7777777',
    '8922535353',
    '892253535333',
    '79225353533',
    '+89225353533',
    '8 (499) 711-22-88 доб. 1',
    '8 499 711 22 88 abc',
    '8 499 711 22 88' + ' '.repeat(30),
  ]) assert.equal(isValidRussianPhone(phone), false, phone);
});
