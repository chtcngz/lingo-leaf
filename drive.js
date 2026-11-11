// Optional sync through the user's own Google Drive, for Chrome ↔ Edge and any other mix of browsers.
// Everything lives in one JSON file in Drive's hidden app folder (scope drive.appdata: the extension cannot
// see the user's other files). Unlike chrome.storage.sync there is no size limit, so notes, examples,
// sources, settings, history and reading time travel too. Per word the newest change wins, as in sync.js.
(() => {
  // LingoLeaf's own OAuth client (public by design; only the extension's fixed redirect address is allowed).
  const CLIENT_ID = '880054170663-n8ah8512fvgf4hu6jru79pulia750iua.apps.googleusercontent.com';
  const FILE = 'lingoleaf.json', SCOPE = 'https://www.googleapis.com/auth/drive.appdata', KEEP_DELETED = 60 * 86400000;
  const API = 'https://www.googleapis.com/drive/v3/files', UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files';
  const time = value => { const ms = Date.parse(value); return Number.isFinite(ms) ? ms : 0; };
  const earliest = (a, b) => !a ? b || null : !b ? a : time(a) <= time(b) ? a : b;

  // state: {words, deleted, settings, settingsAt, events, activity}
  function mergeWords(local, remote) {
    const words = {}, deleted = {};
    const names = new Set([...Object.keys(local.words), ...Object.keys(local.deleted), ...Object.keys(remote.words), ...Object.keys(remote.deleted)]);
    for (const word of names) {
      const side = state => Object.hasOwn(state.words, word) ? { row: state.words[word], at: time(state.words[word].updatedAt) }
        : Object.hasOwn(state.deleted, word) ? { gone: state.deleted[word], at: time(state.deleted[word]) } : null;
      const mine = side(local), theirs = side(remote);
      // Ties keep the local side, so syncing an unchanged state writes nothing.
      const winner = !theirs || (mine && mine.at >= theirs.at) ? mine : theirs, other = winner === mine ? theirs : mine;
      if (winner.gone) { deleted[word] = winner.gone; continue; }
      const row = { ...winner.row }, loser = other?.row;
      if (loser) {
        row.createdAt = earliest(row.createdAt, loser.createdAt);
        row.learnedAt = earliest(row.learnedAt, loser.learnedAt);
        // Fields the newer side never had (e.g. a word that arrived through Chrome sync) are kept from the other side.
        for (const key of ['translation', 'example', 'note', 'url']) if (!row[key] && loser[key]) row[key] = loser[key];
      }
      words[word] = row;
    }
    return { words, deleted };
  }

  function merge(local, remote, now = Date.now()) {
    remote = { words: {}, deleted: {}, events: [], activity: {}, ...remote };
    const { words, deleted } = mergeWords(local, remote);
    for (const [word, at] of Object.entries(deleted)) if (now - time(at) > KEEP_DELETED) delete deleted[word];
    const seen = new Set(), events = [];
    for (const event of [...local.events, ...remote.events].filter(event => typeof event?.at === 'string' && typeof event.word === 'string')) {
      const key = `${event.word}|${event.to}|${event.at}`;
      if (!seen.has(key)) { seen.add(key); events.push(event); }
    }
    events.sort((a, b) => a.at.localeCompare(b.at) || a.word.localeCompare(b.word) || String(a.to).localeCompare(String(b.to)));
    // Reading time is per device and cannot be told apart once summed, so each day keeps the larger value.
    const activity = { ...remote.activity };
    for (const [day, seconds] of Object.entries(local.activity)) activity[day] = Math.max(activity[day] || 0, seconds);
    const settingsFromRemote = remote.settings && time(remote.settingsAt) > time(local.settingsAt);
    return {
      words, deleted, events: events.slice(-30000),
      activity: Object.fromEntries(Object.entries(activity).sort().slice(-400)),
      settings: settingsFromRemote ? remote.settings : local.settings,
      settingsAt: settingsFromRemote ? remote.settingsAt : local.settingsAt || null,
    };
  }

  // Cheap fingerprint to skip a sync when nothing changed locally.
  // Keys are sorted so two devices that hold the same data in a different order agree.
  const canonical = value => Array.isArray(value) ? `[${value.map(canonical).join(',')}]`
    : value && typeof value === 'object' ? `{${Object.keys(value).sort().filter(key => value[key] !== undefined).map(key => JSON.stringify(key) + ':' + canonical(value[key])).join(',')}}`
    : JSON.stringify(value ?? null);
  function fingerprint(value) {
    const text = canonical(value); let h = 2166136261;
    for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
    return `${text.length}:${(h >>> 0).toString(36)}`;
  }

  // OAuth implicit flow through the browser's own auth window; works in Chrome and Edge alike.
  async function authorize(identity, clientId, interactive) {
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.search = new URLSearchParams({ client_id: clientId, response_type: 'token', redirect_uri: identity.getRedirectURL(), scope: SCOPE, ...(interactive ? {} : { prompt: 'none' }) });
    const result = await identity.launchWebAuthFlow({ url: url.href, interactive });
    const params = new URLSearchParams(new URL(result).hash.slice(1));
    if (params.get('error') || !params.get('access_token')) throw Error(params.get('error') || 'Google izni alınamadı.');
    return { token: params.get('access_token'), expires: Date.now() + (Number(params.get('expires_in')) || 3600) * 1000 };
  }

  function client(fetch, token) {
    const call = async (url, init = {}) => {
      const response = await fetch(url, { ...init, headers: { Authorization: `Bearer ${token}`, ...init.headers } });
      if (response.status === 401) throw Object.assign(Error('Google oturumu yenilenmeli.'), { auth: true });
      if (!response.ok) throw Error(`Google Drive yanıtı: ${response.status}`);
      return response;
    };
    return {
      async find() {
        const url = new URL(API);
        url.search = new URLSearchParams({ spaces: 'appDataFolder', q: `name='${FILE}' and trashed=false`, fields: 'files(id,md5Checksum,modifiedTime)', orderBy: 'modifiedTime desc' });
        return (await (await call(url.href)).json()).files?.[0] || null;
      },
      async read(id) { return (await call(`${API}/${id}?alt=media`)).json(); },
      async create(body) {
        const boundary = 'lingoleaf' + Math.random().toString(36).slice(2);
        const payload = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify({ name: FILE, parents: ['appDataFolder'] })}\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(body)}\r\n--${boundary}--`;
        return (await call(`${UPLOAD}?uploadType=multipart&fields=id,md5Checksum`, { method: 'POST', headers: { 'Content-Type': `multipart/related; boundary=${boundary}` }, body: payload })).json();
      },
      async update(id, body) {
        return (await call(`${UPLOAD}/${id}?uploadType=media&fields=id,md5Checksum`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })).json();
      },
    };
  }

  globalThis.LingoDrive = { CLIENT_ID, FILE, SCOPE, merge, fingerprint, authorize, client };
  if (typeof module !== 'undefined') module.exports = globalThis.LingoDrive;
})();
