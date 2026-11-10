importScripts('core.js');
let queue=Promise.resolve();
const enqueue=fn=>{const result=queue.then(fn);queue=result.catch(()=>{});return result;};
chrome.sidePanel.setPanelBehavior({openPanelOnActionClick:true}).catch(()=>{});
chrome.runtime.onInstalled.addListener(()=>chrome.contextMenus.removeAll(()=>{
  for(const [id,title] of Object.entries({select:'LingoLeaf: Kelimeleri yönet',learning:'Öğrenme listeme ekle',known:'Biliyorum',learned:'Öğrendim'}))chrome.contextMenus.create({id,title,contexts:['selection'],documentUrlPatterns:['http://*/*','https://*/*']});
}));
async function pending(text,tab){await chrome.storage.local.set({pending:{text:String(text||'').slice(0,5000),url:tab?.url||'',nonce:Date.now()}});}
chrome.contextMenus.onClicked.addListener((info,tab)=>{
  if(info.menuItemId==='select'){chrome.sidePanel.open({windowId:tab.windowId}).catch(()=>{});pending(info.selectionText,{...tab,url:info.pageUrl||tab?.url}).catch(console.error);}
  else enqueue(()=>change({words:Lingo.unique(info.selectionText),status:info.menuItemId,url:info.pageUrl||tab?.url,example:info.selectionText})).catch(console.error);
});
chrome.commands.onCommand.addListener((command,tab)=>{
  if(command!=='open-panel'||!tab)return;
  chrome.sidePanel.open({windowId:tab.windowId}).catch(()=>{});
  chrome.tabs.sendMessage(tab.id,{type:'selection'}).then(r=>pending(r?.text,{...tab,url:r?.url||tab.url})).catch(()=>pending('',tab));
});
const cleanDate=value=>typeof value==='string'&&Number.isFinite(Date.parse(value))?new Date(value).toISOString():null;
const safeURL=value=>{try{const url=new URL(value);return ['http:','https:'].includes(url.protocol)?url.href.slice(0,2048):'';}catch{return '';}};
function cleanRow(row){
  if(!row||typeof row.word!=='string')return null;const word=Lingo.normalize(row.word);
  if(!Lingo.validKey(word)||!Lingo.statuses.includes(row.status))return null;
  const now=new Date().toISOString();
  return {word,status:row.status,createdAt:cleanDate(row.createdAt)||now,updatedAt:cleanDate(row.updatedAt)||now,learnedAt:cleanDate(row.learnedAt),url:safeURL(row.url),example:String(row.example||'').slice(0,1000),note:String(row.note||'').slice(0,2000)};
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
    words[word]={word,status:msg.status,createdAt:old?.createdAt||now,updatedAt:now,learnedAt:old?.learnedAt||(msg.status==='learned'?now:null),url:old?.url||safeURL(msg.url),example:old?.example||String(msg.example||'').slice(0,1000),note:old?.note||''};
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
        if(JSON.stringify(current)!==JSON.stringify(expected))continue;
        if(tx.before[key])words[key]=tx.before[key];else delete words[key];count++;
      }
      delete data.undo[msg.id];await chrome.storage.local.set({words,undo:data.undo});return {count,skipped:Object.keys(tx.before).length-count};
    });
    if(msg.type==='detail')return enqueue(async()=>{
      const data=await chrome.storage.local.get(['words','events','undo']);const words=data.words||{};if(!Object.hasOwn(words,msg.word))throw Error('Kelime bulunamadı.');
      const before={[msg.word]:words[msg.word]};words[msg.word]={...words[msg.word],note:String(msg.note||'').slice(0,2000),example:String(msg.example||'').slice(0,1000),updatedAt:new Date().toISOString()};return commit(data,words,data.events||[],before);
    });
    if(msg.type==='settings')return enqueue(async()=>{const data=await chrome.storage.local.get('settings'),old=data.settings||{};const value=Lingo.settings({...old,...msg.patch,colors:{...old.colors,...msg.patch?.colors},siteModes:{...old.siteModes,...msg.patch?.siteModes}});await chrome.storage.local.set({settings:value});return value;});
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
