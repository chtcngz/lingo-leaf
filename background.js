importScripts('phrases.js','expressions.js','core.js','sync.js','drive.js');
const candidatePhrases=Lingo.bundledIndex();
let queue=Promise.resolve();
const enqueue=fn=>{const result=queue.then(fn);queue=result.catch(()=>{});return result;};
chrome.sidePanel.setPanelBehavior({openPanelOnActionClick:true}).catch(()=>{});
chrome.runtime.onInstalled.addListener(()=>chrome.contextMenus.removeAll(()=>{
  for(const [id,title] of Object.entries({select:'LingoLeaf: Kelimeleri yönet',learning:'Öğrenme listeme ekle',known:'Biliyorum',learned:'Öğrendim'}))chrome.contextMenus.create({id,title,contexts:['selection'],documentUrlPatterns:['http://*/*','https://*/*']});
}));
async function pending(text,tab){await chrome.storage.local.set({pending:{text:String(text||'').slice(0,5000),url:tab?.url||'',nonce:Date.now()}});}
chrome.contextMenus.onClicked.addListener((info,tab)=>{
  if(info.menuItemId==='select'){chrome.sidePanel.open({windowId:tab.windowId}).catch(()=>{});pending(info.selectionText,{...tab,url:info.pageUrl||tab?.url}).catch(console.error);}
  else enqueue(async()=>change({words:Lingo.terms(info.selectionText,candidatePhrases,(await chrome.storage.local.get('words')).words||{}),status:info.menuItemId,url:info.pageUrl||tab?.url,example:info.selectionText})).catch(console.error);
});
chrome.commands.onCommand.addListener((command,tab)=>{
  if(command!=='open-panel'||!tab)return;
  chrome.sidePanel.open({windowId:tab.windowId}).catch(()=>{});
  chrome.tabs.sendMessage(tab.id,{type:'selection'}).then(r=>pending(r?.text,{...tab,url:r?.url||tab.url})).catch(()=>pending('',tab));
});
const cleanDate=value=>typeof value==='string'&&Number.isFinite(Date.parse(value))?new Date(value).toISOString():null;
const cleanTranslation=value=>String(value||'').replace(/\s+/g,' ').trim().slice(0,500);
// Undo ignores translations: they are filled in later in the background and must not block undoing a status change.
const bare=row=>row&&JSON.stringify({...row,translation:undefined});
const safeURL=value=>{try{const url=new URL(value);return ['http:','https:'].includes(url.protocol)?url.href.slice(0,2048):'';}catch{return '';}};
function cleanRow(row){
  if(!row||typeof row.word!=='string')return null;const word=Lingo.normalize(row.word);
  if(!Lingo.validKey(word)||!Lingo.statuses.includes(row.status))return null;
  const now=new Date().toISOString();
  return {word,status:row.status,createdAt:cleanDate(row.createdAt)||now,updatedAt:cleanDate(row.updatedAt)||now,learnedAt:cleanDate(row.learnedAt),url:safeURL(row.url),example:String(row.example||'').slice(0,1000),note:String(row.note||'').slice(0,2000),translation:cleanTranslation(row.translation)};
}
async function commit(data,words,events,before){
  const id=crypto.randomUUID(),undo=data.undo||{};const after={};
  for(const key of Object.keys(before))after[key]=Object.hasOwn(words,key)?words[key]:null;
  undo[id]={before,after,at:Date.now()};const keep=Object.fromEntries(Object.entries(undo).sort((a,b)=>a[1].at-b[1].at).slice(-15));
  await chrome.storage.local.set({words,events:events.slice(-30000),undo:keep});return {count:Object.keys(before).length,undoId:id};
}
async function change(msg){
  if(msg.status!=='remove'&&!Lingo.statuses.includes(msg.status))throw Error('Geçersiz durum');
  if(!Array.isArray(msg.words))throw Error('Kelime listesi gerekli.');
  const data=await chrome.storage.local.get(['words','events','undo']);const words=data.words||{},events=data.events||[],before={};
  for(const raw of new Set(msg.words.slice(0,10000))){
    if(typeof raw!=='string')continue;const word=Lingo.normalize(raw);if(!Lingo.validKey(word))continue;
    const old=Object.hasOwn(words,word)?words[word]:null;if(old?.status===msg.status||(!old&&msg.status==='remove'))continue;
    before[word]=old;
    if(msg.status==='remove'){delete words[word];continue;}
    const now=new Date().toISOString();
    words[word]={word,status:msg.status,createdAt:old?.createdAt||now,updatedAt:now,learnedAt:old?.learnedAt||(msg.status==='learned'?now:null),url:old?.url||safeURL(msg.url),example:old?.example||String(msg.example||'').slice(0,1000),note:old?.note||'',translation:old?.translation||''};
    events.push({word,from:old?.status||'unknown',to:msg.status,at:now});
  }
  if(!Object.keys(before).length)return {count:0};return commit(data,words,events,before);
}
chrome.runtime.onMessage.addListener((msg,sender,respond)=>{
  const run=async()=>{
    if(msg.type==='change')return enqueue(()=>change({...msg,url:sender.url||sender.tab?.url||msg.url}));
    if(msg.type==='undo')return enqueue(async()=>{
      const data=await chrome.storage.local.get(['words','undo']);const tx=data.undo?.[msg.id];if(!tx)throw Error('Geri alma kaydı bulunamadı.');
      const words=data.words||{};let count=0;
      for(const [key,expected] of Object.entries(tx.after)){
        const current=Object.hasOwn(words,key)?words[key]:null;
        if(bare(current)!==bare(expected))continue;
        if(tx.before[key])words[key]={...tx.before[key],translation:tx.before[key].translation||current?.translation||'',updatedAt:new Date().toISOString()};else delete words[key];count++;
      }
      delete data.undo[msg.id];await chrome.storage.local.set({words,undo:data.undo});return {count,skipped:Object.keys(tx.before).length-count};
    });
    if(msg.type==='detail')return enqueue(async()=>{
      const data=await chrome.storage.local.get(['words','events','undo']);const words=data.words||{};if(!Object.hasOwn(words,msg.word))throw Error('Kelime bulunamadı.');
      const before={[msg.word]:words[msg.word]};words[msg.word]={...words[msg.word],note:String(msg.note||'').slice(0,2000),example:String(msg.example||'').slice(0,1000),...(typeof msg.translation==='string'?{translation:cleanTranslation(msg.translation)}:{}),updatedAt:new Date().toISOString()};return commit(data,words,data.events||[],before);
    });
    // Automatic translations only fill empty fields; they are not undo steps and do not change updatedAt.
    if(msg.type==='translations')return enqueue(async()=>{
      if(!msg.map||typeof msg.map!=='object')throw Error('Çeviri listesi gerekli.');
      const data=await chrome.storage.local.get('words');const words=data.words||{};let count=0;
      for(const [word,text] of Object.entries(msg.map).slice(0,500)){const value=cleanTranslation(text);if(!value||!Object.hasOwn(words,word)||words[word].translation)continue;words[word]={...words[word],translation:value};count++;}
      if(count)await chrome.storage.local.set({words});return {count};
    });
    if(msg.type==='syncNow')return enqueue(syncNow);
    if(msg.type==='driveConnect')return enqueue(async()=>{
      const clientId=String(msg.clientId||'').trim();if(!/^[\w.-]+\.apps\.googleusercontent\.com$/.test(clientId))throw Error('Geçerli bir OAuth istemci kimliği gir (…apps.googleusercontent.com).');
      const data=await chrome.storage.local.get('drive');await chrome.storage.local.set({drive:{...data.drive,clientId,connected:true,localPrint:'',md5:''}});
      chrome.alarms.create('drive',{periodInMinutes:5});return driveSync('poll');
    });
    if(msg.type==='driveDisconnect')return enqueue(async()=>{
      const data=await chrome.storage.local.get('drive');await chrome.storage.local.set({drive:{clientId:data.drive?.clientId||'',connected:false}});
      await chrome.storage.session.remove('driveToken');await chrome.alarms.clear('drive');return {};
    });
    if(msg.type==='driveSync')return enqueue(()=>driveSync('poll'));
    if(msg.type==='settings')return enqueue(async()=>{const data=await chrome.storage.local.get('settings'),old=data.settings||{};const value=Lingo.settings({...old,...msg.patch,colors:{...old.colors,...msg.patch?.colors},siteModes:{...old.siteModes,...msg.patch?.siteModes}});await chrome.storage.local.set({settings:value,settingsAt:new Date().toISOString()});return value;});
    if(msg.type==='pending'){
      const opening=sender.tab?chrome.sidePanel.open({tabId:sender.tab.id}):Promise.resolve();
      await Promise.all([pending(msg.text,{...sender.tab,url:sender.url||sender.tab?.url||msg.url}),opening]);return {};
    }
    if(msg.type==='detect')return chrome.i18n.detectLanguage(String(msg.text).slice(0,6000));
    if(msg.type==='activity')return enqueue(async()=>{
      const data=await chrome.storage.local.get('activity');const activity=data.activity||{};const today=Lingo.day();
      activity[today]=Math.min(86400,(activity[today]||0)+Math.max(0,Math.min(60,Number(msg.seconds)||0)));
      await chrome.storage.local.set({activity:Object.fromEntries(Object.entries(activity).sort().slice(-400))});return {};
    });
    if(msg.type==='import')return enqueue(async()=>{
      if(!Array.isArray(msg.rows)||msg.rows.length>50000)throw Error('En fazla 50.000 kayıt içe aktarılabilir.');
      const data=await chrome.storage.local.get(['words','events','undo']);const words=data.words||{},before={};let skipped=0;
      for(const raw of msg.rows){const row=cleanRow(raw);if(!row||Object.hasOwn(words,row.word)){skipped++;continue;}before[row.word]=null;words[row.word]=row;}
      if(!Object.keys(before).length)return {count:0,skipped};return {...await commit(data,words,data.events||[],before),skipped};
    });
    throw Error('Bilinmeyen işlem');
  };
  run().then(result=>respond({ok:true,result})).catch(error=>respond({ok:false,error:error.message}));return true;
});

// Chrome sync (see sync.js): merge local words with the copy in chrome.storage.sync, newest change per word wins.
let syncTimer;
function scheduleSync(delay=4000){clearTimeout(syncTimer);syncTimer=setTimeout(()=>enqueue(syncNow).catch(console.error),delay);}
async function syncNow(){
  const data=await chrome.storage.local.get(['words','syncDeleted','settings']);
  if(!Lingo.settings(data.settings).sync)return {off:true};
  const status={at:new Date().toISOString(),error:''};
  try{
    const stored=await chrome.storage.sync.get(LingoSync.keys),words=data.words||{};
    const merged=LingoSync.merge(words,LingoSync.prune(data.syncDeleted||{}),LingoSync.decode(stored));
    const encoded=LingoSync.encode(merged.entries),changed=Object.fromEntries(Object.entries(encoded.items).filter(([key,value])=>(stored[key]||'')!==value));
    Object.assign(status,{count:Object.keys(merged.words).length,bytes:encoded.bytes,limit:LingoSync.limits.TOTAL,translations:encoded.translations});
    // When everything no longer fits, nothing is written, so the other devices keep a consistent copy.
    if(!encoded.fits)status.error='quota';else if(Object.keys(changed).length)await chrome.storage.sync.set(changed);
    const local={syncDeleted:merged.deleted,syncStatus:status};
    if(JSON.stringify(merged.words)!==JSON.stringify(words))local.words=merged.words;
    await chrome.storage.local.set(local);
  }catch(error){status.error=error.message||'Senkron tamamlanamadı.';await chrome.storage.local.set({syncStatus:status});}
  return status;
}
// Removals are remembered with their time so the other devices delete the word too instead of bringing it back.
async function noteDeleted(before,after){
  const data=await chrome.storage.local.get('syncDeleted'),deleted={...data.syncDeleted};let dirty=false;
  for(const word of Object.keys(before))if(!Object.hasOwn(after,word)&&!Object.hasOwn(deleted,word)){deleted[word]=new Date().toISOString();dirty=true;}
  for(const word of Object.keys(after))if(Object.hasOwn(deleted,word)){delete deleted[word];dirty=true;}
  if(dirty)await chrome.storage.local.set({syncDeleted:deleted});
}
chrome.storage.onChanged.addListener((changes,area)=>{
  if(area==='sync'&&LingoSync.keys.some(key=>changes[key]))scheduleSync(1500);
  if(area!=='local')return;
  if(changes.words)enqueue(()=>noteDeleted(changes.words.oldValue||{},changes.words.newValue||{})).then(()=>scheduleSync()).catch(console.error);
  // Reading time alone does not trigger an upload; it travels with the next change or the periodic check.
  if(changes.words||changes.settings||changes.syncDeleted)scheduleDrive();
  if(changes.settings&&changes.settings.newValue?.sync!==false&&changes.settings.oldValue?.sync===false)scheduleSync(0);
});
chrome.runtime.onStartup.addListener(()=>{scheduleSync(2000);scheduleDrive(3000,'poll');});
chrome.runtime.onInstalled.addListener(()=>{scheduleSync(2000);scheduleDrive(3000,'poll');});

// Google Drive sync (see drive.js). 'local' runs after a change here and does nothing if the local data is unchanged;
// 'poll' runs on startup and every 5 minutes and also picks up changes made on other devices.
let driveTimer,driveMode='local';
function scheduleDrive(delay=8000,mode='local'){if(mode==='poll')driveMode='poll';clearTimeout(driveTimer);driveTimer=setTimeout(()=>{const m=driveMode;driveMode='local';enqueue(()=>driveSync(m)).catch(console.error);},delay);}
chrome.alarms?.onAlarm.addListener(alarm=>{if(alarm.name==='drive')scheduleDrive(0,'poll');});
async function driveToken(fresh=false){
  if(!fresh){const saved=(await chrome.storage.session.get('driveToken')).driveToken;if(saved?.expires>Date.now()+60000)return saved.token;}
  const {drive}=await chrome.storage.local.get('drive');
  try{const token=await LingoDrive.authorize(chrome.identity,drive.clientId,false);await chrome.storage.session.set({driveToken:token});return token.token;}
  catch{throw Object.assign(Error('reconnect'),{reconnect:true});}
}
const driveState=data=>({words:data.words||{},deleted:data.syncDeleted||{},settings:data.settings||{},settingsAt:data.settingsAt||null,events:data.events||[],activity:data.activity||{}});
async function driveSync(mode){
  const data=await chrome.storage.local.get(['words','syncDeleted','settings','settingsAt','events','activity','drive']),drive=data.drive||{};
  if(!drive.connected||!drive.clientId)return {off:true};
  const local=driveState(data),localPrint=LingoDrive.fingerprint(local),changed=localPrint!==drive.localPrint;
  if(mode==='local'&&!changed)return {skipped:true};
  const status={at:new Date().toISOString(),error:''};let next={...drive};
  try{
    let api=LingoDrive.client(fetch,await driveToken());
    let file;try{file=await api.find();}catch(error){if(!error.auth)throw error;api=LingoDrive.client(fetch,await driveToken(true));file=await api.find();}
    if(changed||!file||file.md5Checksum!==drive.md5){
      const remote=file?await api.read(file.id):null;
      const merged=LingoDrive.merge(local,remote||{});merged.settings=Lingo.settings(merged.settings);
      const remotePrint=remote?LingoDrive.fingerprint(driveState({...remote,syncDeleted:remote.deleted})):'';
      let md5=file?.md5Checksum||'';
      if(LingoDrive.fingerprint(driveState({...merged,syncDeleted:merged.deleted}))!==remotePrint){
        const doc={app:'LingoLeaf',version:1,savedAt:status.at,...merged};
        md5=(file?await api.update(file.id,doc):await api.create(doc)).md5Checksum||'';
      }
      // Only keys that really changed are written, so open pages are not recoloured for nothing.
      const write={},target={words:merged.words,syncDeleted:merged.deleted,settings:merged.settings,settingsAt:merged.settingsAt,events:merged.events,activity:merged.activity};
      for(const [key,value] of Object.entries(target))if(LingoDrive.fingerprint(value)!==LingoDrive.fingerprint(data[key]??(key==='settingsAt'?null:key==='events'?[]:key==='settings'?{}:{})))write[key]=value;
      if(Object.keys(write).length)await chrome.storage.local.set(write);
      next={...next,md5,localPrint:LingoDrive.fingerprint(driveState({...data,...write}))};
      status.count=Object.keys(merged.words).length;
    }else status.count=Object.keys(local.words).length;
  }catch(error){status.error=error.reconnect?'reconnect':error.message||'Google Drive ile eşitlenemedi.';if(error.reconnect)await chrome.storage.session.remove('driveToken');}
  await chrome.storage.local.set({drive:{...next,status}});return status;
}
