const $ = id => document.getElementById(id);
let data={words:{},settings:Lingo.settings(),events:[],activity:{}}, currentView='home', filter='all', limit=80, selected=new Set(), picked=new Set(), activeHost='', sourceURL='', detailWord='', toastTimer;
const candidatePhrases=Lingo.bundledIndex(),splitPhrases=new Set();
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
async function send(msg){const response=await chrome.runtime.sendMessage(msg);if(!response?.ok)throw Error(response?.error||'İşlem tamamlanamadı.');return response.result;}
function toast(text,undo){clearTimeout(toastTimer);const box=$('toast');box.replaceChildren(document.createTextNode(text));if(undo){const b=el('button','','Geri al');b.style.marginLeft='12px';b.onclick=()=>safe(undo);box.append(b);}box.hidden=false;toastTimer=setTimeout(()=>box.hidden=true,undo?12000:6000);}
async function safe(fn){try{await fn();}catch(e){toast(e.message||'İşlem tamamlanamadı.');}}
function theme(){const setting=data.settings.theme;document.documentElement.dataset.theme=setting==='system'?(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):setting;}
function view(name){currentView=name;document.querySelectorAll('.view').forEach(n=>n.hidden=n.id!==name);document.querySelectorAll('nav button').forEach(b=>{b.classList.toggle('active',b.dataset.view===name);b.setAttribute('aria-current',b.dataset.view===name?'page':'false');});if(name==='home')refreshPage();if(name==='library')renderLibrary();}
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>view(b.dataset.view));document.querySelectorAll('[data-goto]').forEach(b=>b.onclick=()=>view(b.dataset.goto));
$('expand').onclick=()=>chrome.tabs.create({url:chrome.runtime.getURL('panel.html')});
function rows(){return Object.values(data.words);}
function learningDates(){const learned=new Map();for(const row of rows())if(row.learnedAt)learned.set(row.word,row.learnedAt);for(const event of data.events)if(event.to==='learned'&&(!learned.has(event.word)||event.at<learned.get(event.word)))learned.set(event.word,event.at);return [...learned.values()];}
function home(){
  const all=rows();for(const status of Lingo.statuses)$(`count-${status}`).textContent=all.filter(w=>w.status===status).length.toLocaleString('tr');
  const learned=learningDates(),today=Lingo.day(),daily=learned.filter(at=>Lingo.day(at)===today).length;
  $('goal-title').textContent=`${daily} / ${data.settings.goal} kelime`;$('goal-progress').max=data.settings.goal;$('goal-progress').value=daily;
  $('goal-note').textContent=daily>=data.settings.goal?'Bugünkü hedefine ulaştın. Güzel bir adım!':'Yeni öğrendiğin kelimeleri işaretleyerek ilerle.';
  const period=Number($('chart-period').value),days=Array.from({length:period},(_,i)=>{const date=new Date();date.setDate(date.getDate()-period+1+i);return {date,count:learned.filter(at=>Lingo.day(at)===Lingo.day(date)).length};});
  const max=Math.max(1,...days.map(d=>d.count));$('chart').replaceChildren();$('chart').classList.toggle('dense',period>7);
  for(const [i,day] of days.entries()){const wrap=el('div','bar-wrap');wrap.title=`${day.date.toLocaleDateString('tr')}: ${day.count} kelime`;wrap.setAttribute('aria-label',wrap.title);const bar=el('div','bar');bar.style.height=`${Math.max(3,day.count/max*76)}px`;wrap.append(bar);if(period===7)wrap.prepend(el('span','',day.count));if(period===7||i===0||i===period-1||i===Math.floor(period/2))wrap.append(el('small','',day.date.toLocaleDateString('tr',period===7?{weekday:'short'}:{day:'numeric',month:'numeric'})));$('chart').append(wrap);}
  $('week-total').textContent=`${days.reduce((sum,day)=>sum+day.count,0)} kelime`;
  const active=new Set(Object.keys(data.activity));for(const event of data.events)active.add(Lingo.day(event.at));for(const row of all)active.add(Lingo.day(row.createdAt));
  $('streak-count').textContent=Lingo.streak([...active]);const recent30=new Set(Array.from({length:30},(_,i)=>{const d=new Date();d.setDate(d.getDate()-i);return Lingo.day(d);}));$('active-days').textContent=[...active].filter(d=>recent30.has(d)).length;
  let seconds=0;for(let i=0;i<7;i++){const d=new Date();d.setDate(d.getDate()-i);seconds+=data.activity[Lingo.day(d)]||0;}$('reading-time').textContent=`${Math.floor(seconds/60)} dk`;
  const recent=all.sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,4);$('recent').replaceChildren();if(!recent.length)$('recent').append(empty('İlk kelimene yer aç.','İngilizce bir sayfada kelime seçerek başlayabilirsin.'));else for(const word of recent)$('recent').append(wordRow(word,false));
}
$('chart-period').onchange=home;
function empty(title,text){const box=el('div','empty');box.append(el('b','',title),document.createTextNode(text));return box;}
async function undoResult(result,message){toast(message,result.undoId?async()=>{const r=await send({type:'undo',id:result.undoId});toast(r.skipped?`${r.count} kayıt geri alındı. Sonradan değişen ${r.skipped} kayıt korundu.`:'İşlem geri alındı.');}:null);}
async function change(words,status,example=''){
  const r=await send({type:'change',words,status,example,url:sourceURL});
  undoResult(r,r.count?`${r.count} kaydın durumu güncellendi.`:'Bu kelimeler zaten seçilen durumda.');
}
function wordRow(word,checkbox=true){
  const row=el('div','word');
  if(checkbox){const cb=el('input');cb.type='checkbox';cb.checked=selected.has(word.word);cb.setAttribute('aria-label',`${word.word} seç`);cb.onchange=()=>{if(cb.checked)selected.add(word.word);else selected.delete(word.word);renderBulk();};row.append(cb);}
  const body=el('div','word-body'),name=el('button','text-button',word.word);name.style.fontSize='15px';name.style.fontWeight='650';name.onclick=()=>openDetail(word.word);
  const note=word.note||word.example||new Date(word.createdAt).toLocaleDateString('tr');body.append(name,el('small','',note));row.append(body);
  const select=el('select');select.setAttribute('aria-label',`${word.word} durumu`);for(const s of Lingo.statuses){const option=el('option','',Lingo.labels[s]);option.value=s;select.append(option);}select.value=word.status;select.onchange=()=>safe(()=>change([word.word],select.value));row.append(select);return row;
}
function filtered(){const q=$('search').value.trim().toLowerCase();return rows().filter(w=>(filter==='all'||w.status===filter)&&w.word.includes(q)).sort($('sort').value==='alpha'?(a,b)=>a.word.localeCompare(b.word):(a,b)=>b.createdAt.localeCompare(a.createdAt));}
function renderLibrary(){
  const all=filtered(), shown=all.slice(0,limit);$('word-list').replaceChildren();
  if(!all.length)$('word-list').append(empty('Burada henüz kelime yok.','Sayfada kelime seç veya Kelime ekle alanından bir kelime ekle.'));
  for(const word of shown)$('word-list').append(wordRow(word));$('more').hidden=all.length<=limit;$('library-count').textContent=`${all.length} kayıt · ${shown.length} tanesi gösteriliyor`;renderBulk();
}
function renderBulk(){$('bulk').hidden=selected.size===0;$('selected-count').textContent=`${selected.size} seçili`;}
$('search').oninput=()=>{limit=80;renderLibrary();};$('sort').onchange=renderLibrary;
document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{filter=b.dataset.filter;selected.clear();limit=80;document.querySelectorAll('[data-filter]').forEach(n=>n.classList.toggle('active',n===b));renderLibrary();});
$('more').onclick=()=>{limit+=80;renderLibrary();};$('select-all').onclick=()=>{const shown=filtered().slice(0,limit);const all=shown.every(w=>selected.has(w.word));for(const w of shown){if(all)selected.delete(w.word);else selected.add(w.word);}renderLibrary();};
$('bulk-apply').onclick=()=>safe(async()=>{await change([...selected],$('bulk-status').value);selected.clear();renderBulk();});
function setSource(text,url=''){$('source').value=text;sourceURL=url;picked.clear();splitPhrases.clear();renderTokens();$('source-origin').textContent=url?'Seçtiğin metin kaynak sayfasıyla birlikte kaydedilecek.':'';}
$('source').oninput=()=>{picked.clear();splitPhrases.clear();renderTokens();};
// New words come first; saved ones sit in their status group so a later save never touches them by accident. Known words stay folded at the bottom.
const tokenGroups=[['new','Yeni','unknown'],['learning',Lingo.labels.learning,'learning'],['learned',Lingo.labels.learned,'learned'],['known',Lingo.labels.known,'known']];
let knownOpen=false;
function currentTerms(){return Lingo.extractTerms($('source').value,candidatePhrases,data.words,splitPhrases).slice(0,600);}
function renderTokens(){
  const all=Lingo.extractTerms($('source').value,candidatePhrases,data.words,splitPhrases),terms=all.slice(0,600);$('token-list').replaceChildren();
  for(const word of picked)if(!terms.some(term=>term.word===word))picked.delete(word);
  if(!terms.length){$('token-list').append(el('p','caption','Bir metin seçtiğinde kelimeler burada görünür.'));renderPicked();return;}
  for(const [key,title,dot] of tokenGroups){
    const group=terms.filter(term=>(data.words[term.word]?.status||'new')===key);if(!group.length)continue;
    const box=el(key==='known'?'details':'div','token-group'),head=el(key==='known'?'summary':'div','token-head');
    if(key==='known'){box.open=knownOpen;box.ontoggle=()=>knownOpen=box.open;}
    const words=group.map(term=>term.word),toggle=el('button','text-button',words.every(w=>picked.has(w))?'Seçimi kaldır':'Tümünü seç');toggle.type='button';
    toggle.onclick=e=>{e.preventDefault();if(words.every(w=>picked.has(w)))words.forEach(w=>picked.delete(w));else words.forEach(w=>picked.add(w));renderTokens();};
    head.append(el('span',`dot ${dot}`),el('b','',title),el('small','',String(group.length)),toggle);box.append(head);
    const list=el('div','tokens');
    for(const {word,phrase,saved} of group){
      const label=el('label','token'),input=el('input');input.type='checkbox';input.checked=picked.has(word);input.onchange=()=>{input.checked?picked.add(word):picked.delete(word);renderPicked();};
      label.append(input,document.createTextNode(word));if(phrase&&!saved)label.append(el('small','','öbek'));
      if(phrase&&!saved){const split=el('button','token-split','böl');split.type='button';split.title='Öbek değil; kelimeleri ayrı göster';split.onclick=e=>{e.preventDefault();splitPhrases.add(word);picked.delete(word);renderTokens();};label.append(split);}
      list.append(label);
    }
    box.append(list);$('token-list').append(box);
  }
  if(all.length>600)$('token-list').append(el('p','caption','İlk 600 kelime gösteriliyor. Daha kısa bir bölüm seçebilirsin.'));
  renderPicked();
}
function renderPicked(){$('save-picked').textContent=picked.size?`${picked.size} seçileni kaydet`:'Seçilenleri kaydet';}
$('pick-all').onclick=()=>{const fresh=currentTerms().filter(term=>!Object.hasOwn(data.words,term.word)).map(term=>term.word);if(fresh.length&&fresh.every(w=>picked.has(w)))fresh.forEach(w=>picked.delete(w));else fresh.forEach(w=>picked.add(w));renderTokens();};
$('save-picked').onclick=()=>safe(async()=>{if(!picked.size)return toast('Önce eklemek istediğin kelimeleri seç.');const words=[...picked];picked.clear();try{await change(words,$('pick-status').value,$('source').value);}catch(e){words.forEach(w=>picked.add(w));throw e;}finally{renderTokens();}});
$('save-phrase').onclick=()=>safe(async()=>{const phrase=Lingo.normalize($('source').value);if(!Lingo.validKey(phrase))return toast('İfade en fazla 500 karakter olmalı; yalnızca İngilizce kelimeler, boşluk, kesme işareti ve tire içerebilir.');await change([phrase],$('pick-status').value,$('source').value);});
function renderPreview(){
  const box=$('color-preview');box.replaceChildren();
  for(const [bg,text] of [[[255,255,255],[34,34,34]],[[24,24,24],[230,230,230]]]){
    const sample=el('p','preview-sample');sample.style.background=`rgb(${bg})`;sample.style.color=`rgb(${text})`;
    for(const [status,word] of [['unknown','unfamiliar'],['learning','learning'],['learned','learned'],['known','known']]){
      const span=el('span','',word);if(status!=='known'){const style=Lingo.highlightStyle(data.settings.colors[status],bg,text,data.settings.intensity);span.style.color=style.color;if(style.background)span.style.background=style.background;}
      sample.append(span,document.createTextNode(' '));
    }
    box.append(sample);
  }
}
function renderSettings(){for(const k of ['enabled','menu'])$(k).checked=data.settings[k];for(const k of ['goal','theme','intensity'])$(k).value=data.settings[k];for(const k of ['unknown','learning','learned'])$(`color-${k}`).value=data.settings.colors[k];theme();renderPreview();}
for(const k of ['enabled','menu','goal','theme','intensity'])$(k).onchange=()=>safe(async()=>{
  let value=$(k).type==='checkbox'?$(k).checked:$(k).value;if(k==='goal'){value=Math.max(1,Math.min(1000,Math.floor(Number(value)||5)));$(k).value=value;}
  await send({type:'settings',patch:{[k]:value}});home();toast('Ayar kaydedildi.');
});
for(const k of ['unknown','learning','learned'])$(`color-${k}`).onchange=()=>safe(()=>send({type:'settings',patch:{colors:{[k]:$(`color-${k}`).value}}}));
$('reset-colors').onclick=()=>safe(()=>send({type:'settings',patch:{colors:Lingo.defaults.colors}}));
function download(name,body,type){const url=URL.createObjectURL(new Blob([body],{type}));const a=el('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('export').onclick=()=>download(`lingoleaf-${Lingo.day()}.json`,JSON.stringify({app:'LingoLeaf',version:1,exportedAt:new Date().toISOString(),words:rows(),settings:data.settings},null,2),'application/json');
$('export-csv').onclick=()=>{const quote=v=>'"'+String(v||'').replaceAll('"','""')+'"';const fields=['word','status','note','example','url','createdAt','learnedAt'];download(`lingoleaf-${Lingo.day()}.csv`,'\ufeff'+[fields.join(','),...rows().map(row=>fields.map(k=>quote(row[k])).join(','))].join('\r\n'),'text/csv;charset=utf-8');};
$('import').onclick=()=>$('import-file').click();$('import-file').onchange=()=>safe(async()=>{
  const input=$('import-file'),file=input.files[0];if(!file)return;input.value='';if(file.size>15*1024*1024)throw Error('Yedek 15 MB sınırını aşıyor.');
  const text=(await file.text()).replace(/^\uFEFF/,'');let imported;
  if(file.name.toLowerCase().endsWith('.json')){const backup=JSON.parse(text);if(backup.app!=='LingoLeaf'||backup.version!==1||!Array.isArray(backup.words))throw Error('Geçerli bir LingoLeaf yedeği seç.');imported=backup.words;}
  else if(file.name.toLowerCase().endsWith('.txt'))imported=text.split(/\r?\n/).filter(s=>s.trim()).map(word=>({word,status:$('import-status').value}));
  else{const csv=Lingo.parseCSV(text);if(!csv.length)throw Error('Dosya boş.');const header=csv[0].map(c=>c.trim().toLowerCase()),hasHeader=header.includes('word')||header.includes('kelime');const aliases={kelime:'word',durum:'status',not:'note',örnek:'example',kaynak:'url',createdat:'createdAt',learnedat:'learnedAt'};imported=(hasHeader?csv.slice(1):csv).map(cells=>{const row={status:$('import-status').value};if(hasHeader)header.forEach((key,i)=>row[aliases[key]||key]=cells[i]);else {row.word=cells[0];if(cells[1])row.status=cells[1];}const statuses={'biliyorum':'known','öğreniyorum':'learning','öğrendim':'learned'};row.status=statuses[row.status?.trim().toLowerCase()]||row.status||$('import-status').value;return row;});}
  const r=await send({type:'import',rows:imported});undoResult(r,`${r.count} yeni kayıt eklendi; ${r.skipped||0} mevcut/geçersiz kayıt atlandı.`);
});
function openDetail(word){const row=data.words[word];if(!row)return;detailWord=word;$('detail-title').textContent=word;$('detail-example').value=row.example||'';$('detail-note').value=row.note||'';$('detail-date').textContent=`Eklendi: ${new Date(row.createdAt).toLocaleDateString('tr')}${row.learnedAt?' · İlk öğrenme: '+new Date(row.learnedAt).toLocaleDateString('tr'):''}`;const link=$('detail-source');link.hidden=true;link.removeAttribute('href');try{const url=new URL(row.url);if(['https:','http:'].includes(url.protocol)){link.href=url.href;link.hidden=false;}}catch{}$('word-dialog').showModal();}
$('close-detail').onclick=()=>$('word-dialog').close();
$('detail-form').onsubmit=e=>{e.preventDefault();safe(async()=>{const r=await send({type:'detail',word:detailWord,note:$('detail-note').value,example:$('detail-example').value});$('word-dialog').close();undoResult(r,'Kelime notu kaydedildi.');});};
$('delete-word').onclick=()=>safe(async()=>{await change([detailWord],'remove');$('word-dialog').close();});
$('forget-word').onclick=()=>safe(async()=>{await change([detailWord],'learning');$('word-dialog').close();});
async function refreshPage(){
  try{const [tab]=await chrome.tabs.query({active:true,currentWindow:true});if(!tab?.id)throw Error();const stats=await chrome.tabs.sendMessage(tab.id,{type:'pageStats'});activeHost=stats.host;$('site-mode').disabled=false;$('site-mode').value=data.settings.siteModes[activeHost]||'auto';$('page-info').textContent=stats.total?`${stats.host} · ${stats.total} benzersiz kelimenin ${stats.known} tanesi bildiğin veya öğrendiğin olarak kayıtlı (%${Math.round(stats.known/stats.total*100)}).${stats.limited?' Büyük sayfa: kısmi tarama.':''}`:`${stats.host} · İngilizce içerik bulunamadı, tarama sürüyor veya renklendirme kapalı.`;}
  catch{$('page-info').textContent='İngilizce bir web sayfasına geçip Yenile’ye bas. Eklentiyi yeni yüklediysen sayfayı da yenile.';$('site-mode').disabled=true;activeHost='';}
}
$('refresh-page').onclick=refreshPage;$('site-mode').onchange=()=>safe(async()=>{if(!activeHost)return;await send({type:'settings',patch:{siteModes:{[activeHost]:$('site-mode').value}}});toast('Bu sitenin ayarı kaydedildi.');});
chrome.storage.onChanged.addListener((changes,area)=>{if(area!=='local')return;for(const k of ['words','events','activity'])if(changes[k])data[k]=changes[k].newValue||(k==='events'?[]:{});if(changes.settings){data.settings=Lingo.settings(changes.settings.newValue);renderSettings();}if(changes.activity||changes.events)home();if(changes.words){for(const word of selected)if(!data.words[word])selected.delete(word);home();renderLibrary();renderTokens();}if(changes.pending){setSource(changes.pending.newValue?.text||'',changes.pending.newValue?.url||'');view('add');}});
matchMedia('(prefers-color-scheme: dark)').addEventListener('change',theme);
(async()=>{const saved=await chrome.storage.local.get(['words','settings','events','activity','pending']);data={words:saved.words||{},settings:Lingo.settings(saved.settings),events:saved.events||[],activity:saved.activity||{}};renderSettings();home();renderLibrary();if(saved.pending?.text&&Date.now()-saved.pending.nonce<120000){setSource(saved.pending.text,saved.pending.url);view('add');}else{renderTokens();refreshPage();}})().catch(e=>toast(e.message));
