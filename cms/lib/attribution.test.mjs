import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { CmsDatabase } from './database.mjs';
import { attributionLabel, attributionRows, normalizeAttribution } from './attribution.mjs';

test('attribution is allowlisted, bounded and classified conservatively', () => {
  const data = normalizeAttribution({
    utm_source: 'yandex', utm_medium: 'cpc', utm_campaign: 'land',
    landingPage: '/services.html', secret: 'discard',
  });
  assert.deepEqual(data, {
    utm_source: 'yandex', utm_medium: 'cpc', utm_campaign: 'land', landingPage: '/services.html',
  });
  assert.equal(attributionLabel(data), 'Платная реклама — yandex');
  assert.deepEqual(attributionRows(data).slice(0, 4), [
    ['Источник', 'Платная реклама — yandex'],
    ['UTM source', 'yandex'],
    ['UTM medium', 'cpc'],
    ['UTM campaign', 'land'],
  ]);
  assert.equal(attributionLabel(normalizeAttribution({ yclid: '123' })), 'Реклама — Яндекс');
  assert.equal(attributionLabel(normalizeAttribution({ referrerHost: 'google.com' })), 'Поиск — вероятно органический');
  assert.equal(attributionLabel({}), 'Прямой переход или источник не определён');
});

test('existing leads are retained when attribution column is added', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'gradstroy-attribution-'));
  const filename = path.join(dir, 'cms.sqlite');
  let database;
  try {
    const old = new DatabaseSync(filename);
    old.exec("CREATE TABLE leads (id INTEGER PRIMARY KEY, phone TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'new', created_at TEXT NOT NULL DEFAULT ''); INSERT INTO leads (id, phone) VALUES (7, '+79991234567');");
    old.close();
    database = new CmsDatabase({ root: process.cwd(), filename });
    await database.init();
    assert.equal(database.getLead(7).phone, '+79991234567');
    assert.equal(database.getLead(7).attribution_json, '{}');
  } finally {
    database?.db?.close();
    await rm(dir, { recursive: true, force: true });
  }
});

test('new leads retain attribution for the CMS', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'gradstroy-new-lead-'));
  let database;
  try {
    database = new CmsDatabase({ root: process.cwd(), filename: path.join(dir, 'cms.sqlite') });
    await database.init();
    const attribution = { utm_source: 'yandex', utm_campaign: 'autumn', label: 'Переход с UTM-метками' };
    const lead = database.createLead({ phone: '+79991234567', attribution });
    assert.deepEqual(JSON.parse(lead.attribution_json), attribution);
    assert.deepEqual(JSON.parse(database.listLeads()[0].attribution_json), attribution);
  } finally {
    database?.db?.close();
    await rm(dir, { recursive: true, force: true });
  }
});
