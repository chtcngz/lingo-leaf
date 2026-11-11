const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
require('../phrases.js');
require('../expressions.js');
const Lingo = require('../core.js');

// Runs the real background.js against an in-memory chrome.storage.local.
function background() {
  const store = {};
  let listener;
  const noop = () => {};
  const event = { addListener: noop };
  const chrome = {
    storage: { local: {
      get: async keys => Object.fromEntries([].concat(keys).filter(k => k in store).map(k => [k, structuredClone(store[k])])),
      set: async values => { Object.assign(store, structuredClone(values)); },
    }, sync: { get: async () => ({}), set: async () => {} }, onChanged: event },
    runtime: { onMessage: { addListener: fn => { listener = fn; } }, onInstalled: event, onStartup: event },
    contextMenus: { onClicked: event, removeAll: noop, create: noop },
    commands: { onCommand: event },
    sidePanel: { setPanelBehavior: async () => {}, open: async () => {} },
    i18n: { detectLanguage: async () => ({}) },
  };
  const context = vm.createContext({ chrome, crypto, console, structuredClone, URL, Lingo, LingoSync: require('../sync.js'), setTimeout, clearTimeout, importScripts: noop, globalThis: {} });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../background.js'), 'utf8'), context);
  const send = msg => new Promise((resolve, reject) => listener(msg, {}, r => r.ok ? resolve(r.result) : reject(Error(r.error))));
  return { send, store };
}

test('translations fill only empty fields and never create undo steps', async () => {
  const { send, store } = background();
  await send({ type: 'change', words: ['election'], status: 'learning' });
  assert.equal(store.words.election.translation, '');
  const undoCount = Object.keys(store.undo).length;
  assert.equal((await send({ type: 'translations', map: { election: '  seçim ', missing: 'yok' } })).count, 1);
  assert.equal(store.words.election.translation, 'seçim');
  assert.equal((await send({ type: 'translations', map: { election: 'başka' } })).count, 0);
  assert.equal(store.words.election.translation, 'seçim');
  assert.equal(Object.keys(store.undo).length, undoCount);
  assert.equal(store.words.missing, undefined);
});

test('a translation filled later does not block undo, and the detail form edits it', async () => {
  const { send, store } = background();
  await send({ type: 'change', words: ['ballot'], status: 'learning' });
  const learned = await send({ type: 'change', words: ['ballot'], status: 'learned' });
  await send({ type: 'translations', map: { ballot: 'oy pusulası' } });
  const undone = await send({ type: 'undo', id: learned.undoId });
  assert.equal(undone.count, 1);
  assert.equal(undone.skipped, 0);
  assert.equal(store.words.ballot.status, 'learning');
  assert.equal(store.words.ballot.translation, 'oy pusulası');
  await send({ type: 'detail', word: 'ballot', note: '', example: '', translation: 'oy kâğıdı' });
  assert.equal(store.words.ballot.translation, 'oy kâğıdı');
  await send({ type: 'detail', word: 'ballot', note: 'not', example: '' });
  assert.equal(store.words.ballot.translation, 'oy kâğıdı');
});

test('imported rows keep their translation', async () => {
  const { send, store } = background();
  await send({ type: 'import', rows: [{ word: 'Turnout', status: 'learning', translation: 'katılım oranı' }] });
  assert.equal(store.words.turnout.translation, 'katılım oranı');
});

test('matched tokens carry the whole phrase they belong to', () => {
  const list = Lingo.matchedTokens('They gave it up today.', Lingo.phraseIndex({ 'give up': { word: 'give up', status: 'learning' } }));
  const gave = list.find(t => t.word === 'gave'), up = list.find(t => t.word === 'up');
  assert.equal(gave.phraseWord, 'give up');
  assert.deepEqual(gave.phraseTokens, up.phraseTokens);
  assert.deepEqual(gave.phraseTokens.map(i => list[i].word), ['gave', 'up']);
  assert.equal(list.find(t => t.word === 'it').phraseWord, undefined);
});
