(() => {
  if (globalThis.__lingoleaf) return;
  globalThis.__lingoleaf = true;
  let words = {}, settings = Lingo.settings(), generation = 0, timer, pageEnglish = false, pageStats = null;
  const blockSelector='p,li,blockquote,h1,h2,h3,h4,h5,h6,td,th,figcaption,div,article,section';
  const blockVerdicts=new WeakMap(),languageCache=new Map();let lastInteraction=Date.now();
  const names = new Set(); const sheet = new CSSStyleSheet();
  document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
  const excluded = 'script,style,noscript,textarea,input,select,option,code,pre,svg,math,[contenteditable]:not([contenteditable="false"]),[translate="no"],[data-lingoleaf],button';
  function textBlock(el){const natural=el.closest(blockSelector)||document.body,tagged=el.closest('[lang]');return tagged&&tagged!==document.documentElement&&natural.contains(tagged)?tagged:natural;}
  const message = async value => {const r=await chrome.runtime.sendMessage(value);if(!r?.ok)throw Error(r?.error||'Sayfayı yenileyin.');return r.result;};
  function clear() { for (const name of names) CSS.highlights?.delete(name); names.clear(); }
  function rgb(value) { const m = value.match(/[\d.]+/g); return m ? m.map(Number) : [255,255,255]; }
  function background(element) {
    const chain = []; for (let el = element; el; el = el.parentElement) chain.unshift(el);
    const scheme=getComputedStyle(document.documentElement).colorScheme;
    const dark=scheme==='dark'||(scheme.includes('dark')&&matchMedia('(prefers-color-scheme: dark)').matches);
    let result = dark ? [18,18,18] : [255,255,255];
    for (const el of chain) { const c = rgb(getComputedStyle(el).backgroundColor); const a = c[3] ?? 1; result = result.map((v,i) => Math.round(c[i]*a+v*(1-a))); }
    return {color:result,complex:chain.some(el=>getComputedStyle(el).backgroundImage!=='none')};
  }
  const luminance = c => c.slice(0,3).map(v => {v/=255; return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
  function accessible(hex, bg, original) {
    let c = [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
    if (c.some(n=>!Number.isFinite(n))) c=[150,130,200];
    const mix={soft:.58,normal:.8,strong:1}[settings.intensity];
    c=c.map((v,i)=>Math.round(v*mix+(original[i]??v)*(1-mix)));
    const lb=luminance(bg), target = lb > .179 ? 0 : 255;
    for (let i=0;i<50;i++) { const lc=luminance(c); if ((Math.max(lb,lc)+.05)/(Math.min(lb,lc)+.05)>=4.5) break; c=c.map(v=>Math.round(v*.9+target*.1)); }
    return `rgb(${c.join(',')})`;
  }
  function allowed(el) {
    if (el.closest(excluded)) return false;
    if (settings.siteModes[location.hostname] === 'on') return true;
    const block=textBlock(el);
    if(blockVerdicts.has(block))return blockVerdicts.get(block);
    const lang = el.closest('[lang]')?.getAttribute('lang')?.toLowerCase();
    if (lang) return lang === 'en' || lang.startsWith('en-');
    return pageEnglish;
  }
  async function detectBlock(block){
    if(settings.siteModes[location.hostname]==='on')return true;
    const explicit=block.closest('[lang]');
    if(explicit&&explicit!==document.documentElement){const lang=explicit.lang.toLowerCase();return lang==='en'||lang.startsWith('en-');}
    const text=(block.innerText||block.textContent).trim().slice(0,5000);
    if(/[ğışİĞŞ]/.test(text))return false;
    if(text.length<55)return pageEnglish||Lingo.englishHint(text);
    if(languageCache.has(text))return languageCache.get(text);
    let english=false;
    try{const r=await message({type:'detect',text});const first=r.languages?.[0];english=r.isReliable&&first?.language==='en'&&first.percentage>=65;if(!r.isReliable)english=Lingo.englishHint(text);}catch{english=Lingo.englishHint(text);}
    if(languageCache.size>=300)languageCache.delete(languageCache.keys().next().value);languageCache.set(text,english);return english;
  }
  function schedule() { clearTimeout(timer); generation++; timer=setTimeout(scan,350); }
  async function scan() {
    const id=++generation; clear(); pageStats=null;
    if (!settings.enabled || settings.siteModes[location.hostname]==='off' || !CSS.highlights || !globalThis.Highlight) return;
    const walker=document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const groups=new Map(), blocks=new Map(),seen=new Set(), known=new Set(); let node, processed=0, limited=false;
    const cached=new WeakMap();
    let textLength=0;
    while ((node=walker.nextNode())) {
      if (id!==generation) return;
      if (++processed>30000) {limited=true;break;}
      const el=node.parentElement;
      if (!el || !node.textContent || el.closest(excluded)) continue;
      let info=cached.get(el);
      if (!info) {const cs=getComputedStyle(el),bg=background(el); info={visible:cs.display!=='none'&&cs.visibility!=='hidden'&&el.getClientRects().length>0&&!el.closest('[hidden]'),bg:bg.color,complex:bg.complex,original:rgb(cs.color)};cached.set(el,info);}
      if (!info.visible) continue;
      textLength+=node.length;if(textLength>450000){limited=true;break;}
      const block=textBlock(el);
      if(!blocks.has(block))blocks.set(block,{text:'',segments:[],lastProcessed:processed});
      const item=blocks.get(block);if(item.segments.length&&item.lastProcessed!==processed-1)item.text+='\u0000';item.segments.push({node,start:item.text.length,info});item.text+=node.textContent;item.lastProcessed=processed;
      if (processed%180===0) await new Promise(r=>setTimeout(r,0));
    }
    const phrases=Lingo.phraseIndex(words);
    for(const [block,item] of blocks){
      if(id!==generation)return;
      const english=await detectBlock(block);blockVerdicts.set(block,english);if(!english)continue;
      let segmentIndex=0;
      for(const token of Lingo.matchedTokens(item.text,phrases)){
        seen.add(token.word);const status=token.phraseStatus||words[token.word]?.status||'unknown';
        if(status==='known'||status==='learned')known.add(token.word);
        if(status==='known')continue;
        while(segmentIndex+1<item.segments.length&&item.segments[segmentIndex+1].start<=token.start)segmentIndex++;
        for(let i=segmentIndex;i<item.segments.length;i++){
          const seg=item.segments[i],start=Math.max(token.start,seg.start),end=Math.min(token.start+token.length,seg.start+seg.node.length);
          if(seg.start>=token.start+token.length)break;if(end<=start||seg.info.complex)continue;
          const color=accessible(settings.colors[status],seg.info.bg,seg.info.original),key=`${status}|${color}`;
          if(!groups.has(key))groups.set(key,{color,ranges:[]});const range=new Range();range.setStart(seg.node,start-seg.start);range.setEnd(seg.node,end-seg.start);groups.get(key).ranges.push(range);
        }
      }
    }
    if (id!==generation) return;
    const rules=[];let index=0;
    for (const group of groups.values()) {
      const name=`lingoleaf-${index++}`; const highlight=new Highlight();for(const r of group.ranges)highlight.add(r);
      CSS.highlights.set(name,highlight); names.add(name); rules.push(`::highlight(${name}) { color: ${group.color}; }`);
    }
    sheet.replaceSync(rules.join('\n'));
    pageStats={total:seen.size,known:known.size,limited,english:seen.size>0,host:location.hostname};
  }
  async function identify() {
    const declared=document.documentElement.lang.toLowerCase();const sample=document.body.innerText.slice(0,6000);
    pageEnglish=declared==='en'||declared.startsWith('en-');
    if (!declared) {try {const r=await message({type:'detect',text:sample});pageEnglish=r.isReliable&&r.languages?.[0]?.language==='en'&&r.languages[0].percentage>=65;}catch{pageEnglish=Lingo.englishHint(sample);}}
    schedule();
  }
  const host=document.createElement('div');host.dataset.lingoleaf='true';
  host.style.cssText='all:initial;position:fixed;z-index:2147483647;display:none;';
  const shadow=host.attachShadow({mode:'closed'});
  const style=document.createElement('style');style.textContent=`:host{font:13px system-ui;color:#1c3430} .card{box-sizing:border-box;width:min(360px,calc(100vw - 16px));max-height:calc(100vh - 16px);overflow-y:auto;background:#fff;border:1px solid #d5e4dc;border-radius:14px;box-shadow:0 10px 40px #0003;padding:10px} .title{font-size:12px;color:#63776c;padding:3px 4px 8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis} .translation{border-top:1px solid #e4eee8;margin:2px 0 10px;padding:10px 4px 2px} .translation-label{font-size:10px;font-weight:700;letter-spacing:.5px;color:#63776c;margin-bottom:5px} .translation-text{font-size:14px;line-height:1.5;white-space:pre-wrap;overflow-wrap:anywhere} .actions{display:flex;gap:5px;flex-wrap:wrap}button{font:12px system-ui;cursor:pointer;border:0;border-radius:8px;background:#edf4ef;color:#193d30;padding:8px}button:hover{background:#d4e8dc} .note{padding:6px;font-size:12px}`;
  shadow.append(style);const card=document.createElement('div');card.className='card';shadow.append(card);document.documentElement.append(host);
  let selected='',translationRequest=0,translatorPromise=null;
  function hide(){translationRequest++;host.style.display='none';}
  function positionCard(rect){
    const width=card.getBoundingClientRect().width,height=card.getBoundingClientRect().height;
    host.style.left=`${Math.max(8,Math.min(rect.left,innerWidth-width-8))}px`;
    const below=rect.bottom+10,above=rect.top-height-10;
    host.style.top=`${below+height<=innerHeight-8?below:above>=8?above:Math.max(8,innerHeight-height-8)}px`;
  }
  async function translateSelection(text,request,output,rect){
    const update=value=>{if(request!==translationRequest)return;output.textContent=value;positionCard(rect);};
    try{
      if(!globalThis.Translator){update('Yerel çeviri için Chrome 138 veya üzeri gerekir.');return;}
      if(!translatorPromise){
        const state=await Translator.availability({sourceLanguage:'en',targetLanguage:'tr'});
        if(state==='unavailable'){update('İngilizce–Türkçe çeviri bu tarayıcıda kullanılamıyor.');return;}
        if(request!==translationRequest)return;
        if(state!=='available')update('Çeviri dil paketi hazırlanıyor…');
        translatorPromise=Translator.create({sourceLanguage:'en',targetLanguage:'tr',monitor(m){
          m.addEventListener('downloadprogress',e=>update(`Çeviri dil paketi indiriliyor: %${Math.round(e.loaded*100)}`));
        }});
      }
      const translator=await translatorPromise;
      if(request!==translationRequest)return;
      update('Çevriliyor…');
      const result=await translator.translate(text);
      update(result);
    }catch{
      translatorPromise=null;
      if(request!==translationRequest)return;
      output.replaceChildren(document.createTextNode('Çeviri tamamlanamadı. '));
      const retry=document.createElement('button');retry.textContent='Tekrar dene';retry.onclick=()=>{update('Çevriliyor…');translateSelection(text,request,output,rect);};output.append(retry);positionCard(rect);
    }
  }
  function show(text, rect) {
    const request=++translationRequest;
    selected=text.slice(0,5000);card.replaceChildren();
    const title=document.createElement('div');title.className='title';title.textContent=selected;card.append(title);
    const translation=document.createElement('div');translation.className='translation';
    const translationLabel=document.createElement('div');translationLabel.className='translation-label';translationLabel.textContent='TÜRKÇE ÇEVİRİ';translation.append(translationLabel);
    const translationText=document.createElement('div');translationText.className='translation-text';translationText.setAttribute('aria-live','polite');translationText.textContent='Çevriliyor…';translation.append(translationText);card.append(translation);
    const actions=document.createElement('div');actions.className='actions';card.append(actions);
    const add=(label,fn)=>{const b=document.createElement('button');b.textContent=label;b.onclick=()=>fn().catch(e=>{title.textContent=e.message;});actions.append(b);};
    add('Kelimeleri yönet',async()=>{await message({type:'pending',text:selected,url:location.href});hide();});
    const list=Lingo.unique(selected);
    if(list.length===1)for(const status of Lingo.statuses)add(Lingo.labels[status],async()=>{
      const word=list[0];
      const result=await message({type:'change',words:[word],status,example:getSelection()?.anchorNode?.parentElement?.closest(blockSelector)?.textContent?.slice(0,1000)||selected});title.textContent=result.count?`${Lingo.labels[status]} olarak kaydedildi`:'Bu kelime zaten bu durumda';
      actions.replaceChildren();if(result.undoId)add('Geri al',async()=>{await message({type:'undo',id:result.undoId});hide();});add('Kapat',async()=>hide());
    });
    else {const note=document.createElement('div');note.className='note';note.textContent=`${list.length} benzersiz kelime • Panelde seçerek ekle`;card.append(note);}
    host.style.display='block';positionCard(rect);translateSelection(selected,request,translationText,rect);
  }
  document.addEventListener('pointerup',e=>{
    if(e.composedPath().includes(host)||!settings.enabled||!settings.menu||settings.siteModes[location.hostname]==='off')return;
    setTimeout(()=>{const selection=getSelection();const text=selection?.toString().trim();const el=selection?.anchorNode?.parentElement;
      if(!text||!selection.rangeCount||!el||!allowed(el)){hide();return;}show(text,selection.getRangeAt(0).getBoundingClientRect());},20);
  });
  document.addEventListener('keydown',e=>{if(e.key==='Escape')hide();});
  document.addEventListener('pointerdown',e=>{if(!e.composedPath().includes(host))hide();});
  addEventListener('scroll',hide,{passive:true});
  chrome.runtime.onMessage.addListener((msg,sender,reply)=>{if(msg.type==='selection')reply({text:getSelection()?.toString()||'',url:location.href});if(msg.type==='pageStats')reply(pageStats||{english:false,host:location.hostname});});
  chrome.storage.onChanged.addListener((changes,area)=>{if(area!=='local')return;if(changes.words)words=changes.words.newValue||{};if(changes.settings)settings=Lingo.settings(changes.settings.newValue);if(changes.words||changes.settings){hide();schedule();}});
  const observer=new MutationObserver(records=>{if(records.some(r=>r.type==='attributes'&&r.attributeName==='lang'))identify();else if(records.some(r=>r.type==='attributes'||r.type==='characterData'||[...r.addedNodes,...r.removedNodes].some(n=>n!==host)))schedule();});
  chrome.storage.local.get(['words','settings']).then(data=>{words=data.words||{};settings=Lingo.settings(data.settings);identify();observer.observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['lang','class','style','hidden']});observer.observe(document.documentElement,{attributes:true,attributeFilter:['lang','class','style']});});
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change',schedule);
  let resize;addEventListener('resize',()=>{clearTimeout(resize);resize=setTimeout(schedule,300);});
  for(const event of ['pointerdown','keydown','scroll'])document.addEventListener(event,()=>lastInteraction=Date.now(),{passive:true});
  setInterval(()=>{if(document.visibilityState==='visible'&&document.hasFocus()&&settings.enabled&&settings.siteModes[location.hostname]!=='off'&&pageStats?.english&&Date.now()-lastInteraction<90000)message({type:'activity',seconds:30}).catch(()=>{});},30000);
})();
