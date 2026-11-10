(() => {
  const statuses = ['learning', 'learned', 'known'];
  const labels = {learning: 'Öğreniyorum', learned: 'Öğrendim', known: 'Biliyorum', unknown: 'Bilinmeyen'};
  const defaults = {enabled: true, menu: true, intensity: 'soft', theme: 'system', goal: 5, siteModes: {}, colors: {unknown: '#b8abec', learning: '#efc67b', learned: '#82cbb1'}};
  function normalize(text) { return String(text).normalize('NFKC').replace(/[’‘]/g, "'").trim().toLowerCase().replace(/^[^a-z]+|[^a-z]+$/g, '').replace(/\s+/g, ' '); }
  function tokens(text) { return [...String(text).matchAll(/(?<![\p{L}\p{N}_])[A-Za-z]+(?:['’‘][A-Za-z]+)*(?:-[A-Za-z]+)*(?![\p{L}\p{N}_])/gu)].filter(m=>!/[^a-zA-Z'’‘-]/.test(m[0])).map(m => ({word: normalize(m[0]), start: m.index, length: m[0].length})); }
  function unique(text) { return [...new Set(tokens(text).map(t => t.word))]; }
  function validKey(key) { return typeof key === 'string' && key.length <= 500 && /^[a-z]+(?:[' -][a-z]+)*$/.test(key); }
  function settings(value = {}) {
    const colors={...defaults.colors};for(const k of Object.keys(colors))if(/^#[a-f\d]{6}$/i.test(value.colors?.[k]))colors[k]=value.colors[k];
    const siteModes={};for(const [host,mode] of Object.entries(value.siteModes||{}))if(['auto','on','off'].includes(mode)&&host.length<255)siteModes[host]=mode;
    return {enabled:typeof value.enabled==='boolean'?value.enabled:true,menu:typeof value.menu==='boolean'?value.menu:true,intensity:['soft','normal','strong'].includes(value.intensity)?value.intensity:'soft',theme:['system','light','dark'].includes(value.theme)?value.theme:'system',goal:Math.max(1,Math.min(1000,Math.floor(Number(value.goal)||5))),colors,siteModes};
  }
  function day(date = new Date()) { const d = new Date(date); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
  function englishHint(text) {
    const words = unique(text.slice(0, 5000));
    const common = new Set('the a an is are was were be been being of to and in that it for on with as this by from or not you your we they have has at can will which their our but about more what when how there these those into also than its would should could'.split(' '));
    return words.length >= 6 && words.filter(w => common.has(w)).length >= Math.max(3, words.length * .07) && !/[ğışİĞŞ]/.test(text);
  }
  function phraseIndex(words){const index=new Map();for(const row of Object.values(words)){if(!row.word.includes(' '))continue;const parts=row.word.split(' ');if(!index.has(parts[0]))index.set(parts[0],[]);index.get(parts[0]).push({parts,status:row.status,word:row.word});}for(const candidates of index.values())candidates.sort((a,b)=>b.parts.length-a.parts.length);return index;}
  function matchedTokens(text,index){const list=tokens(text);for(let i=0;i<list.length;i++){const candidates=index.get(list[i].word)||[];for(const phrase of candidates){if(!phrase.parts.every((p,j)=>list[i+j]?.word===p&&(j===0||/^\s+$/.test(text.slice(list[i+j-1].start+list[i+j-1].length,list[i+j].start)))))continue;for(let j=0;j<phrase.parts.length;j++)list[i+j].phraseStatus=phrase.status;i+=phrase.parts.length-1;break;}}return list;}
  function streak(days,now=new Date()){const active=new Set(days);let d=new Date(now),count=0;if(!active.has(day(d)))d.setDate(d.getDate()-1);while(active.has(day(d))){count++;d.setDate(d.getDate()-1);}return count;}
  function parseCSV(text){const first=text.split(/\r?\n/,1)[0],delimiter=(first.match(/;/g)||[]).length>(first.match(/,/g)||[]).length?';':',';const rows=[];let row=[],field='',quoted=false;for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){field+='"';i++;}else quoted=!quoted;}else if(!quoted&&(c===delimiter||c==='\n'||c==='\r')){row.push(field);field='';if(c==='\n'||c==='\r'){if(c==='\r'&&text[i+1]==='\n')i++;if(row.some(Boolean))rows.push(row);row=[];}}else field+=c;}if(quoted)throw Error('CSV içinde kapanmamış tırnak var.');row.push(field);if(row.some(Boolean))rows.push(row);return rows;}
  globalThis.Lingo = {statuses, labels, defaults, normalize, tokens, unique, validKey, settings, day, englishHint, phraseIndex, matchedTokens, streak, parseCSV};
  if (typeof module !== 'undefined') module.exports = globalThis.Lingo;
})();
