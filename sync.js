// Word sync across Chrome profiles signed into the same Google account, through chrome.storage.sync.
// chrome.storage.sync allows about 100 KB in total and 8 KB per key, so only what colouring and progress need
// travels: word, status, dates and the Turkish translation. Notes, examples and sources stay on each device.
// Words are spread over fixed buckets by hash, so one change rewrites only its own bucket.
// Conflicts are settled per word by the newest updatedAt (a deletion counts as a change at its own time).
(() => {
  const BUCKETS = 32, PREFIX = 'w', TOTAL = 95000, PER_ITEM = 8000, KEEP_DELETED = 60 * 86400;
  const codes = { learning: 'l', learned: 'd', known: 'k' }, statuses = { l: 'learning', d: 'learned', k: 'known' };
  const keys = Array.from({ length: BUCKETS }, (_, i) => PREFIX + i);
  const seconds = iso => { const ms = Date.parse(iso); return Number.isFinite(ms) ? Math.floor(ms / 1000) : 0; };
  const iso = s => new Date(s * 1000).toISOString();
  const b36 = n => n ? n.toString(36) : '';
  const clean = text => String(text || '').replace(/[|;]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120);
  // Chrome counts the key plus the JSON-encoded value, in UTF-8 bytes.
  const encoder = new TextEncoder(), size = (key, value) => encoder.encode(key + JSON.stringify(value)).length;
  function bucketOf(word) { let h = 2166136261; for (let i = 0; i < word.length; i++) h = Math.imul(h ^ word.charCodeAt(i), 16777619); return (h >>> 0) % BUCKETS; }

  // remote entry: {status|'deleted', at, created, learned, translation} with times in seconds.
  function decode(items) {
    const remote = new Map();
    for (const key of keys) {
      if (typeof items?.[key] !== 'string' || !items[key]) continue;
      for (const part of items[key].split(';')) {
        const [word, code, at, created, learned, translation = ''] = part.split('|');
        if (!word || !/^[a-z]+(?:[' -][a-z]+)*$/.test(word) || !(code === 'x' || statuses[code])) continue;
        const entry = { status: code === 'x' ? 'deleted' : statuses[code], at: parseInt(at, 36) || 0, created: parseInt(created, 36) || 0, learned: parseInt(learned, 36) || 0, translation };
        const old = remote.get(word);
        if (!old || entry.at > old.at) remote.set(word, entry);
      }
    }
    return remote;
  }

  function encodeEntry(word, entry, withTranslation) {
    if (entry.status === 'deleted') return `${word}|x|${b36(entry.at)}`;
    const translation = withTranslation ? clean(entry.translation) : '';
    return `${word}|${codes[entry.status]}|${b36(entry.at)}|${b36(entry.created)}|${b36(entry.learned)}${translation ? '|' + translation : ''}`;
  }
  // entries: Map word → entry. Translations are dropped first, then old deletions, when the quota is tight.
  function encode(entries, now = Math.floor(Date.now() / 1000)) {
    const attempt = (withTranslation, keepDeleted) => {
      const parts = keys.map(() => []);
      for (const [word, entry] of [...entries].sort((a, b) => a[0].localeCompare(b[0]))) {
        if (entry.status === 'deleted' && now - entry.at > keepDeleted) continue;
        parts[bucketOf(word)].push(encodeEntry(word, entry, withTranslation));
      }
      const items = Object.fromEntries(keys.map((key, i) => [key, parts[i].join(';')]));
      const sizes = keys.map(key => size(key, items[key]));
      return { items, bytes: sizes.reduce((a, b) => a + b, 0), fits: sizes.every(size => size <= PER_ITEM) && sizes.reduce((a, b) => a + b, 0) <= TOTAL, translations: withTranslation };
    };
    for (const [withTranslation, keepDeleted] of [[true, KEEP_DELETED], [false, KEEP_DELETED], [false, 7 * 86400]]) {
      const result = attempt(withTranslation, keepDeleted);
      if (result.fits) return result;
    }
    return { ...attempt(false, 0), fits: false };
  }

  const localEntry = row => ({ status: row.status, at: seconds(row.updatedAt), created: seconds(row.createdAt), learned: seconds(row.learnedAt), translation: row.translation || '' });
  const min = (a, b) => a && b ? Math.min(a, b) : a || b;

  // words: local rows; deleted: word → ISO time of local removal; remote: decode() result.
  // Returns the new local rows and deletions, plus the merged entries to write back to sync.
  function merge(words, deleted, remote) {
    const out = { ...words }, gone = { ...deleted }, entries = new Map();
    const all = new Set([...Object.keys(words), ...Object.keys(deleted), ...remote.keys()]);
    for (const word of all) {
      const row = Object.hasOwn(words, word) ? words[word] : null;
      const local = row ? localEntry(row) : Object.hasOwn(deleted, word) ? { status: 'deleted', at: seconds(deleted[word]) } : null;
      const other = remote.get(word);
      // Ties keep the local side, so a round trip through sync changes nothing.
      const winner = !other || (local && local.at >= other.at) ? local : other;
      if (winner.status === 'deleted') {
        delete out[word]; gone[word] = iso(winner.at); entries.set(word, { status: 'deleted', at: winner.at });
        continue;
      }
      delete gone[word];
      const sides = [local, other].filter(side => side && side.status !== 'deleted');
      const created = sides.map(side => side.created).reduce(min, 0) || winner.at;
      const learned = sides.map(side => side.learned).reduce(min, 0);
      const translation = winner.translation || sides.map(side => side.translation).find(Boolean) || '';
      const base = row || { word, url: '', example: '', note: '' };
      const next = { ...base, word, status: winner.status, createdAt: winner === local && row ? row.createdAt : iso(created), updatedAt: winner === local && row ? row.updatedAt : iso(winner.at), learnedAt: learned ? (row?.learnedAt && seconds(row.learnedAt) === learned ? row.learnedAt : iso(learned)) : null, translation };
      if (row && seconds(row.createdAt) > created) next.createdAt = iso(created);
      out[word] = next;
      entries.set(word, { status: next.status, at: seconds(next.updatedAt), created: seconds(next.createdAt), learned: seconds(next.learnedAt), translation });
    }
    return { words: out, deleted: gone, entries };
  }

  // Local removal times older than the sync window are forgotten.
  function prune(deleted, now = Date.now()) { return Object.fromEntries(Object.entries(deleted).filter(([, at]) => now - Date.parse(at) < KEEP_DELETED * 1000)); }

  globalThis.LingoSync = { keys, bucketOf, decode, encode, merge, prune, limits: { TOTAL, PER_ITEM }, size };
  if (typeof module !== 'undefined') module.exports = globalThis.LingoSync;
})();
