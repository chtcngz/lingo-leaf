const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
require('../phrases.js');
require('../expressions.js');
const Lingo = require('../core.js');
const Sync = require('../sync.js');

const row = (word, status, updatedAt, extra = {}) => ({ word, status, createdAt: '2026-11-01T10:00:00.000Z', updatedAt, learnedAt: status === 'learned' ? updatedAt : null, url: '', example: '', note: '', translation: '', ...extra });
const plain = value => JSON.parse(JSON.stringify(value));

test('encode and decode round-trip words, deletions and translations', () => {
  const words = { election: row('election', 'learning', '2026-11-10T08:00:00.000Z', { translation: 'seçim; oy|lama' }), 'give up': row('give up', 'learned', '2026-11-10T09:00:00.000Z') };
  const { entries } = Sync.merge(words, { ballot: '2026-11-09T00:00:00.000Z' }, new Map());
  const encoded = Sync.encode(entries, Date.parse('2026-11-11T00:00:00Z') / 1000);
  assert.ok(encoded.fits && encoded.translations);
  const back = Sync.decode(encoded.items);
  assert.equal(back.get('election').status, 'learning');
  assert.equal(back.get('election').translation, 'seçim oy lama');
  assert.equal(back.get('give up').status, 'learned');
  assert.equal(back.get('ballot').status, 'deleted');
});

test('the newest change wins per word and a round trip changes nothing', () => {
  const local = { election: row('election', 'learning', '2026-11-10T08:00:00.000Z', { note: 'kendi notum' }), vote: row('vote', 'known', '2026-11-10T08:00:00.000Z') };
  const remote = Sync.decode(Sync.encode(Sync.merge({ election: row('election', 'learned', '2026-11-10T09:00:00.000Z', { translation: 'seçim' }), turnout: row('turnout', 'learning', '2026-11-10T07:00:00.000Z') }, { vote: '2026-11-10T10:00:00.000Z' }, new Map()).entries).items);
  const merged = Sync.merge(local, {}, remote);
  assert.equal(merged.words.election.status, 'learned');
  assert.equal(merged.words.election.note, 'kendi notum');
  assert.equal(merged.words.election.translation, 'seçim');
  assert.ok(merged.words.election.learnedAt);
  assert.equal(merged.words.turnout.status, 'learning');
  assert.equal(merged.words.vote, undefined);
  assert.ok(merged.deleted.vote);
  const again = Sync.merge(merged.words, merged.deleted, Sync.decode(Sync.encode(merged.entries).items));
  assert.deepEqual(plain(again.words), plain(merged.words));
});

test('a word added again after its deletion comes back', () => {
  const remote = Sync.decode(Sync.encode(Sync.merge({}, { vote: '2026-11-10T08:00:00.000Z' }, new Map()).entries, Date.parse('2026-11-11T00:00:00Z') / 1000).items);
  const merged = Sync.merge({ vote: row('vote', 'learning', '2026-11-10T09:00:00.000Z') }, {}, remote);
  assert.equal(merged.words.vote.status, 'learning');
  assert.equal(merged.entries.get('vote').status, 'learning');
});

test('stays inside chrome.storage.sync limits, dropping translations first', () => {
  const words = {};
  const name = i => { let s = ''; do { s = 'abcdefghijklmnopqrstuvwxyz'[i % 26] + s; i = Math.floor(i / 26); } while (i); return 'w' + s; };
  for (let i = 0; i < 2600; i++) { const w = name(i); words[w] = row(w, 'learning', '2026-11-10T08:00:00.000Z', { translation: 'uzunca bir türkçe karşılık' }); }
  const encoded = Sync.encode(Sync.merge(words, {}, new Map()).entries);
  assert.ok(encoded.fits);
  assert.equal(encoded.translations, false);
  assert.ok(encoded.bytes <= Sync.limits.TOTAL);
  for (const key of Sync.keys) assert.ok(Sync.size(key, encoded.items[key]) <= Sync.limits.PER_ITEM);
  for (let i = 0; i < 4000; i++) { const w = 'extra' + name(i); words[w] = row(w, 'learning', '2026-11-10T08:00:00.000Z'); }
  assert.equal(Sync.encode(Sync.merge(words, {}, new Map()).entries).fits, false);
});

// Two devices: separate chrome.storage.local, one shared chrome.storage.sync.
function device(sync) {
  const store = {}; let listener; const noop = () => {}; const event = { addListener: noop };
  const chrome = {
    storage: {
      local: { get: async keys => Object.fromEntries([].concat(keys).filter(k => k in store).map(k => [k, structuredClone(store[k])])), set: async v => { Object.assign(store, structuredClone(v)); } },
      sync: { get: async keys => Object.fromEntries([].concat(keys).filter(k => k in sync).map(k => [k, sync[k]])), set: async v => { Object.assign(sync, v); } },
      onChanged: event,
    },
    runtime: { onMessage: { addListener: fn => { listener = fn; } }, onInstalled: event, onStartup: event },
    contextMenus: { onClicked: event, removeAll: noop, create: noop }, commands: { onCommand: event },
    sidePanel: { setPanelBehavior: async () => {}, open: async () => {} }, i18n: { detectLanguage: async () => ({}) },
  };
  const context = vm.createContext({ chrome, crypto, console, structuredClone, URL, Lingo, LingoSync: Sync, importScripts: noop, globalThis: {}, setTimeout, clearTimeout });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../background.js'), 'utf8'), context);
  const send = msg => new Promise((resolve, reject) => listener(msg, {}, r => r.ok ? resolve(r.result) : reject(Error(r.error))));
  // The real extension records removals from storage.onChanged; the test calls the same function directly.
  const remove = async word => { const before = structuredClone(store.words); await send({ type: 'change', words: [word], status: 'remove' }); await context.noteDeleted(before, store.words); };
  return { send, store, remove };
}
const wait = ms => new Promise(r => setTimeout(r, ms));

test('two Chrome profiles end up with the same words', async () => {
  const sync = {}, home = device(sync), work = device(sync);
  await home.send({ type: 'change', words: ['election', 'ballot'], status: 'learning', example: 'The election was close.' });
  await home.send({ type: 'translations', map: { election: 'seçim' } });
  await home.send({ type: 'syncNow' });
  await work.send({ type: 'change', words: ['turnout'], status: 'known' });
  await work.send({ type: 'syncNow' });
  assert.deepEqual(Object.keys(work.store.words).sort(), ['ballot', 'election', 'turnout']);
  assert.equal(work.store.words.election.translation, 'seçim');
  assert.equal(work.store.words.election.example, '');
  await wait(1100);
  await work.send({ type: 'change', words: ['election'], status: 'learned' });
  await work.remove('ballot');
  await work.send({ type: 'syncNow' });
  await home.send({ type: 'syncNow' });
  assert.deepEqual(Object.keys(home.store.words).sort(), ['election', 'turnout']);
  assert.equal(home.store.words.election.status, 'learned');
  assert.equal(home.store.words.election.example, 'The election was close.');
  assert.equal(home.store.syncStatus.error, '');
  const status = await home.send({ type: 'syncNow' });
  assert.equal(status.count, 2);
  assert.deepEqual(plain(home.store.words), plain(Sync.merge(home.store.words, home.store.syncDeleted, Sync.decode(sync)).words));
});

test('sync can be turned off', async () => {
  const sync = {}, solo = device(sync);
  await solo.send({ type: 'settings', patch: { sync: false } });
  await solo.send({ type: 'change', words: ['vote'], status: 'learning' });
  assert.equal((await solo.send({ type: 'syncNow' })).off, true);
  assert.deepEqual(sync, {});
});
