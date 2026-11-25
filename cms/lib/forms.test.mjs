import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { CmsDatabase } from './database.mjs';

test('existing CMS pages gain editable consultation topics without losing custom copy', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'gradstroy-form-fields-'));
  let database;
  try {
    database = new CmsDatabase({ root: process.cwd(), filename: path.join(dir, 'cms.sqlite') });
    await database.init();
    const site = database.getPage('site').data;
    delete site.forms.topic_label;
    delete site.forms.topic_placeholder;
    delete site.forms.topic_options;
    site.forms.phone_label = 'Мой телефон';
    const home = database.getPage('home').data;
    home.hero.secondary_action = 'Получить консультацию';
    home.hero.lead = 'Мой текст первого экрана';
    database.db.prepare('UPDATE content_pages SET data_json = ? WHERE key = ?').run(JSON.stringify(site), 'site');
    database.db.prepare('UPDATE content_pages SET data_json = ? WHERE key = ?').run(JSON.stringify(home), 'home');

    await database.seedPages();

    const updatedSite = database.getPage('site').data;
    const updatedHome = database.getPage('home').data;
    assert.equal(updatedSite.forms.topic_label, 'Что хотите обсудить?');
    assert.ok(updatedSite.forms.topic_options.includes('Смена ВРИ, категория или раздел участка'));
    assert.equal(updatedSite.forms.phone_label, 'Мой телефон');
    assert.equal(updatedHome.hero.secondary_action, 'Посмотреть услуги');
    assert.equal(updatedHome.hero.lead, 'Мой текст первого экрана');

    updatedSite.forms.topic_options[2] = 'ВРИ, категория, смена или раздел участка';
    updatedSite.forms.topic_options.push('Моя тема');
    database.db.prepare('UPDATE content_pages SET data_json = ? WHERE key = ?').run(JSON.stringify(updatedSite), 'site');
    await database.seedPages();
    const migratedTopics = database.getPage('site').data.forms.topic_options;
    assert.ok(migratedTopics.includes('Смена ВРИ, категория или раздел участка'));
    assert.ok(migratedTopics.includes('Моя тема'));
  } finally {
    database?.db?.close();
    await rm(dir, { recursive: true, force: true });
  }
});
