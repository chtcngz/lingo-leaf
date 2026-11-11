const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
require('../phrases.js');
require('../expressions.js');
const Lingo = require('../core.js');
const Sync = require('../sync.js');
const Drive = require('../drive.js');

const row = (word, status, updatedAt, extra = {}) => ({ word, status, createdAt: '2026-11-01T10:00:00.000Z', updatedAt, learnedAt: null, url: '', example: '', note: '', translation: '', ...extra });
const state = (words = {}, extra = {}) => ({ words, deleted: {}, settings: {}, settingsAt: null, events: [], activity: {}, ...extra });
const plain = value => JSON.parse(JSON.stringify(value));

test('merge keeps the newest version of each word and fills fields the other side lacks', () => {
  const local = state({ election: row('election', 'learning', '2026-11-10T08:00:00.000Z', { note: 'notum', example: 'The election…' }), vote: row('vote', 'known', '2026-11-10T08:00:00.000Z') },
    { events: [{ word: 'election', from: 'unknown', to: 'learning', at: '2026-11-10T08:00:00.000Z' }], activity: { '2026-11-10': 300 }, settings: { goal: 5 }, settingsAt: '2026-11-09T00:00:00.000Z' });
  const remote = state({ election: row('election', 'learned', '2026-11-10T09:00:00.000Z', { translation: 'seçim', learnedAt: '2026-11-10T09:00:00.000Z' }) },
    { deleted: { vote: '2026-11-10T10:00:00.000Z' }, events: [{ word: 'election', from: 'learning', to: 'learned', at: '2026-11-10T09:00:00.000Z' }, { word: 'election', from: 'unknown', to: 'learning', at: '2026-11-10T08:00:00.000Z' }], activity: { '2026-11-10': 120, '2026-11-09': 60 }, settings: { goal: 10 }, settingsAt: '2026-11-10T00:00:00.000Z' });
  const merged = Drive.merge(local, remote, Date.parse('2026-11-11T00:00:00Z'));
  assert.equal(merged.words.election.status, 'learned');
  assert.equal(merged.words.election.note, 'notum');
  assert.equal(merged.words.election.translation, 'seçim');
  assert.equal(merged.words.vote, undefined);
  assert.ok(merged.deleted.vote);
  assert.equal(merged.events.length, 2);
  assert.deepEqual(merged.activity, { '2026-11-09': 60, '2026-11-10': 300 });
  assert.equal(merged.settings.goal, 10);
  assert.equal(Drive.fingerprint(Drive.merge(merged, merged)), Drive.fingerprint(merged));
});

test('fingerprints ignore key order', () => {
  assert.equal(Drive.fingerprint({ a: 1, b: { c: 2, d: 3 } }), Drive.fingerprint({ b: { d: 3, c: 2 }, a: 1 }));
  assert.notEqual(Drive.fingerprint({ a: 1 }), Drive.fingerprint({ a: 2 }));
});

// A small in-memory Google Drive appDataFolder that answers the same URLs drive.js calls.
function fakeDrive() {
  const files = new Map(); let calls = 0, uploads = 0, validToken = 'token-1';
  const json = (body, status = 200) => ({ ok: status < 300, status, json: async () => structuredClone(body) });
  async function fetch(url, init = {}) {
    calls++; const u = new URL(url), method = init.method || 'GET';
    if (init.headers?.Authorization !== `Bearer ${validToken}`) return json({}, 401);
    const md5 = text => crypto.createHash('md5').update(text).digest('hex');
    if (u.pathname === '/drive/v3/files' && method === 'GET') {
      assert.equal(u.searchParams.get('spaces'), 'appDataFolder');
      return json({ files: [...files.entries()].map(([id, f]) => ({ id, md5Checksum: f.md5 })) });
    }
    if (u.pathname.startsWith('/drive/v3/files/') && u.searchParams.get('alt') === 'media') return json(JSON.parse(files.get(u.pathname.split('/').pop()).text));
    if (u.pathname === '/upload/drive/v3/files' && method === 'POST') {
      uploads++; const boundary = init.headers['Content-Type'].split('boundary=')[1], parts = init.body.split(`--${boundary}`);
      const meta = JSON.parse(parts[1].split('\r\n\r\n')[1]), text = parts[2].split('\r\n\r\n')[1].replace(/\r\n$/, '');
      assert.deepEqual(meta, { name: 'lingoleaf.json', parents: ['appDataFolder'] });
      const id = 'f' + files.size; files.set(id, { text, md5: md5(text) }); return json({ id, md5Checksum: md5(text) });
    }
    if (u.pathname.startsWith('/upload/drive/v3/files/') && method === 'PATCH') {
      uploads++; const id = u.pathname.split('/').pop(); files.set(id, { text: init.body, md5: md5(init.body) }); return json({ id, md5Checksum: md5(init.body) });
    }
    return json({}, 404);
  }
  return { fetch, files, stats: () => ({ calls, uploads }), expire: () => { validToken = 'token-2'; } , token: () => validToken };
}

function device(drive, sync) {
  const store = {}, session = {}; let listener; const noop = () => {}; const event = { addListener: noop };
  const area = target => ({ get: async keys => Object.fromEntries([].concat(keys).filter(k => k in target).map(k => [k, structuredClone(target[k])])), set: async v => { Object.assign(target, structuredClone(v)); }, remove: async k => { delete target[k]; } });
  const chrome = {
    storage: { local: area(store), session: area(session), sync: area(sync), onChanged: event },
    identity: { getRedirectURL: () => 'https://abc.chromiumapp.org/', launchWebAuthFlow: async ({ url }) => {
      const u = new URL(url); assert.equal(u.searchParams.get('scope'), Drive.SCOPE); assert.equal(u.searchParams.get('prompt'), 'none');
      return `https://abc.chromiumapp.org/#access_token=${drive.token()}&expires_in=3599&token_type=Bearer`; } },
    alarms: { create: noop, clear: async () => {}, onAlarm: event },
    runtime: { onMessage: { addListener: fn => { listener = fn; } }, onInstalled: event, onStartup: event },
    contextMenus: { onClicked: event, removeAll: noop, create: noop }, commands: { onCommand: event },
    sidePanel: { setPanelBehavior: async () => {}, open: async () => {} }, i18n: { detectLanguage: async () => ({}) },
  };
  const context = vm.createContext({ chrome, crypto: globalThis.crypto, console, structuredClone, URL, URLSearchParams, Lingo, LingoSync: Sync, LingoDrive: Drive, fetch: drive.fetch, importScripts: noop, globalThis: {}, setTimeout, clearTimeout });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../background.js'), 'utf8'), context);
  const send = msg => new Promise((resolve, reject) => listener(msg, {}, r => r.ok ? resolve(r.result) : reject(Error(r.error))));
  return { send, store, session, context };
}
const wait = ms => new Promise(r => setTimeout(r, ms));
const CLIENT = '1234-abc.apps.googleusercontent.com';

test('Chrome at home, Chrome at work and Edge share words, notes and settings through Drive', async () => {
  const drive = fakeDrive();
  // Each browser has its own chrome.storage.sync (Edge and Chrome never share it).
  const home = device(drive, {}), work = device(drive, {}), edge = device(drive, {});
  await home.send({ type: 'change', words: ['election', 'ballot'], status: 'learning', example: 'The election was close.' });
  await home.send({ type: 'detail', word: 'election', note: 'seçim', example: 'The election was close.' });
  await home.send({ type: 'settings', patch: { goal: 12 } });
  assert.equal((await home.send({ type: 'driveConnect', clientId: CLIENT })).error, '');
  assert.equal(drive.files.size, 1);
  for (const d of [work, edge]) assert.equal((await d.send({ type: 'driveConnect', clientId: CLIENT })).error, '');
  assert.equal(edge.store.words.election.note, 'seçim');
  assert.equal(edge.store.settings.goal, 12);
  await wait(5);
  await edge.send({ type: 'change', words: ['election'], status: 'learned' });
  await edge.send({ type: 'change', words: ['ballot'], status: 'remove' });
  await edge.context.noteDeleted({ ballot: 1 }, {});
  await edge.send({ type: 'driveSync' });
  await work.send({ type: 'driveSync' });
  await home.send({ type: 'driveSync' });
  for (const d of [home, work, edge]) {
    assert.deepEqual(Object.keys(d.store.words), ['election']);
    assert.equal(d.store.words.election.status, 'learned');
    assert.equal(d.store.words.election.note, 'seçim');
  }
  assert.equal(drive.files.size, 1);
  // Nothing changed anywhere: a poll reads the file list only and uploads nothing.
  const before = drive.stats();
  for (const d of [home, work, edge]) await d.send({ type: 'driveSync' });
  assert.equal(drive.stats().uploads, before.uploads);
  assert.equal(drive.stats().calls - before.calls, 3);
});

test('an expired token is renewed silently; a local sync with no changes skips the network', async () => {
  const drive = fakeDrive(), solo = device(drive, {});
  await solo.send({ type: 'change', words: ['vote'], status: 'learning' });
  await solo.send({ type: 'driveConnect', clientId: CLIENT });
  drive.expire();
  await solo.send({ type: 'change', words: ['turnout'], status: 'learning' });
  const status = await solo.send({ type: 'driveSync' });
  assert.equal(status.error, '');
  assert.deepEqual(Object.keys(JSON.parse([...drive.files.values()][0].text).words).sort(), ['turnout', 'vote']);
  const calls = drive.stats().calls;
  assert.equal((await solo.context.driveSync('local')).skipped, true);
  assert.equal(drive.stats().calls, calls);
});

test('disconnecting stops syncing and keeps local words', async () => {
  const drive = fakeDrive(), solo = device(drive, {});
  await solo.send({ type: 'change', words: ['vote'], status: 'learning' });
  await solo.send({ type: 'driveConnect', clientId: CLIENT });
  await solo.send({ type: 'driveDisconnect' });
  assert.equal(solo.session.driveToken, undefined);
  assert.equal((await solo.send({ type: 'driveSync' })).off, true);
  assert.ok(solo.store.words.vote);
  await assert.rejects(solo.send({ type: 'driveConnect', clientId: 'not-a-client-id' }));
});

test('connecting without a client id uses the built-in LingoLeaf client and the fixed extension id', async () => {
  const drive = fakeDrive(), solo = device(drive, {});
  let used;
  solo.context.chrome.identity.launchWebAuthFlow = async ({ url }) => { used = new URL(url); return `https://x/#access_token=${drive.token()}&expires_in=3599`; };
  assert.equal((await solo.send({ type: 'driveConnect' })).error, '');
  assert.equal(used.searchParams.get('client_id'), Drive.CLIENT_ID);
  assert.equal(solo.store.drive.clientId, Drive.CLIENT_ID);
  const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, '../manifest.json'), 'utf8'));
  const der = Buffer.from(manifest.key, 'base64'), id = [...crypto.createHash('sha256').update(der).digest('hex').slice(0, 32)].map(c => String.fromCharCode(97 + parseInt(c, 16))).join('');
  assert.equal(id, 'ahpbjjdapeegefbckcfnoikbmbggmfgh');
});
