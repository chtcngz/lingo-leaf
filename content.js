(() => {
  if (globalThis.__lingoleaf) return;
  globalThis.__lingoleaf = true;
  let words = {}, settings = Lingo.settings(), generation = 0, timer, pageEnglish = false, pageStats = null, occurrences = new Map(), focus = {word:'',index:-1}, hoverIndex = new WeakMap();
  const blockSelector='p,li,blockquote,h1,h2,h3,h4,h5,h6,td,th,figcaption,div,article,section';
  const blockVerdicts=new WeakMap(),languageCache=new Map();let lastInteraction=Date.now();
  const candidatePhrases=Lingo.bundledIndex();
  const names = new Set(); const sheet = new CSSStyleSheet();
  const focusSheet = new CSSStyleSheet();
  document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet, focusSheet];
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
  const styleCache=new Map();
  function highlightStyle(status,info){
    const key=[status,settings.colors[status],settings.intensity,info.bg,info.original,info.font.size,info.font.weight].join('|');
    if(!styleCache.has(key)){if(styleCache.size>500)styleCache.clear();styleCache.set(key,Lingo.highlightStyle(settings.colors[status],info.bg,info.original,settings.intensity,info.font));}
    return styleCache.get(key);
  }
  function allowed(el) {
    if (el.closest(excluded)) return false;
    if (settings.siteModes[location.hostname] === 'on') return true;
    const lang = el.closest('[lang]')?.getAttribute('lang')?.toLowerCase();
    if (lang) return lang === 'en' || lang.startsWith('en-');
    const block=textBlock(el);
    if(blockVerdicts.has(block))return blockVerdicts.get(block);
    return pageEnglish;
  }
  function selectionDetails(selection,el){
    try{
      const block=textBlock(el),range=selection.getRangeAt(0);
      if(!block.contains(range.startContainer)||!block.contains(range.endContainer))return {sentence:'',suggestions:[]};
      const before=document.createRange();before.selectNodeContents(block);before.setEnd(range.startContainer,range.startOffset);
      const after=document.createRange();after.selectNodeContents(block);after.setStart(range.endContainer,range.endOffset);
      const prefix=before.toString().slice(-900),chosen=range.toString(),context=prefix+chosen+after.toString().slice(0,900);
      const start=prefix.length,end=start+chosen.length;
      return {sentence:Lingo.sentenceContext(context,start),suggestions:Lingo.phraseSuggestions(context,start,end,candidatePhrases,words)};
    }catch{return {sentence:'',suggestions:[]};}
  }
  async function detectBlock(block){
    if(settings.siteModes[location.hostname]==='on')return true;
    const explicit=block.closest('[lang]');
    if(explicit&&explicit!==document.documentElement){const lang=explicit.lang.toLowerCase();return lang==='en'||lang.startsWith('en-');}
    const text=(block.innerText||block.textContent).trim().slice(0,5000);
    if(/[ğışİĞŞ]/.test(text))return false;
    if(text.length<55)return pageEnglish||Lingo.englishHint(text);
    if(languageCache.has(text))return languageCache.get(text);
    // Headlines are full of names and short of function words, so an uncertain verdict follows the page language.
    const fallback=()=>pageEnglish||Lingo.englishHint(text);
    let english=false;
    try{const r=await message({type:'detect',text});const first=r.languages?.[0];english=r.isReliable&&first?.percentage>=65?first.language==='en':fallback();}catch{english=fallback();}
    if(languageCache.size>=300)languageCache.delete(languageCache.keys().next().value);languageCache.set(text,english);return english;
  }
  // The text-node pieces a token covers; a token can span inline elements.
  function pieces(segments,start,length,from=0){
    const out=[];
    for(let i=from;i<segments.length;i++){
      const seg=segments[i],a=Math.max(start,seg.start),b=Math.min(start+length,seg.start+seg.node.length);
      if(seg.start>=start+length)break;if(b>a)out.push({seg,start:a-seg.start,end:b-seg.start});
    }
    return out;
  }
  function range(piece){const r=new Range();r.setStart(piece.seg.node,piece.start);r.setEnd(piece.seg.node,piece.end);return r;}
  // Panel hover and click: keep the word's existing colour and blink an underline at the current occurrence.
  const focusNames=new Set();let focusTimer;
  function clearFocus(){clearInterval(focusTimer);for(const name of focusNames)CSS.highlights?.delete(name);focusNames.clear();CSS.highlights?.delete('lingoleaf-focus-current');focusSheet.replaceSync('');}
  function occurrenceRanges(word){
    const list=[];
    for(const hit of occurrences.get(word)||[]){
      const parts=hit.tokens.flatMap(token=>pieces(hit.segments,token.start,token.length)).filter(p=>p.seg.node.isConnected).map(piece=>({range:range(piece),info:piece.seg.info}));
      if(parts.length)list.push(parts);
    }
    return list;
  }
  function showFocus(word,step){
    clearFocus();if(!CSS.highlights||!globalThis.Highlight)return {count:0};
    const list=occurrenceRanges(word);if(!list.length){focus={word:'',index:-1};return {count:0};}
    if(focus.word!==word)focus={word,index:-1};
    const status=words[word]?.status||'unknown',groups=new Map(),rules=[];
    for(const occurrence of list)for(const part of occurrence){
      const style=status==='known'?{color:`rgb(${part.info.original.slice(0,3).join(',')})`,background:''}:highlightStyle(status,part.info);
      const key=`${style.color}|${style.background}`;if(!groups.has(key))groups.set(key,{style,ranges:[]});groups.get(key).ranges.push(part.range);
    }
    let i=0;for(const {style,ranges} of groups.values()){
      const name=`lingoleaf-focus-${i++}`,highlight=new Highlight(...ranges);highlight.priority=1;CSS.highlights.set(name,highlight);focusNames.add(name);
      rules.push(`::highlight(${name}){color:${style.color};${style.background?`background-color:${style.background};`:''}text-decoration-line:underline;text-decoration-color:${style.color};text-decoration-style:dashed;text-decoration-thickness:2px}`);
    }
    const currentPart=list[Math.max(0,focus.index+1)%list.length][0];
    const currentColor=status==='known'?`rgb(${currentPart.info.original.slice(0,3).join(',')})`:highlightStyle(status,currentPart.info).color;
    rules.push(`::highlight(lingoleaf-focus-current){text-decoration-line:underline;text-decoration-style:solid;text-decoration-color:${currentColor};text-decoration-thickness:4px}`);
    focusSheet.replaceSync(rules.join('\n'));
    if(!step)return {count:list.length,index:focus.index};
    focus.index=(focus.index+1)%list.length;
    const current=new Highlight(...list[focus.index].map(part=>part.range));current.priority=2;CSS.highlights.set('lingoleaf-focus-current',current);
    let flashes=0;focusTimer=setInterval(()=>{if(++flashes>=6){CSS.highlights.set('lingoleaf-focus-current',current);clearInterval(focusTimer);return;}if(flashes%2)CSS.highlights.delete('lingoleaf-focus-current');else CSS.highlights.set('lingoleaf-focus-current',current);},350);
    const rect=list[focus.index][0].range.getBoundingClientRect();
    if(rect.top<80||rect.bottom>innerHeight-80)scrollBy({top:rect.top-innerHeight/2,behavior:'smooth'});
    return {count:list.length,index:focus.index};
  }
  function schedule() { clearTimeout(timer); generation++; timer=setTimeout(scan,350); }
  async function scan() {
    const id=++generation; clear(); hoverIndex=new WeakMap(); hideTip(); pageStats=null; const found=new Map();
    if (!settings.enabled || settings.siteModes[location.hostname]==='off' || !CSS.highlights || !globalThis.Highlight){clearFocus();return;}
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
      if (!info) {const cs=getComputedStyle(el),bg=background(el); info={visible:cs.display!=='none'&&cs.visibility!=='hidden'&&el.getClientRects().length>0&&!el.closest('[hidden]'),bg:bg.color,complex:bg.complex,original:rgb(cs.color),font:{size:parseFloat(cs.fontSize)||16,weight:Number(cs.fontWeight)||400}};cached.set(el,info);}
      if (!info.visible) continue;
      textLength+=node.length;if(textLength>450000){limited=true;break;}
      const block=textBlock(el);
      if(!blocks.has(block))blocks.set(block,{text:'',segments:[],lastProcessed:processed});
      const item=blocks.get(block);if(item.segments.length&&item.lastProcessed!==processed-1)item.text+='\u0000';item.segments.push({node,start:item.text.length,info});item.text+=node.textContent;item.lastProcessed=processed;
      if (processed%180===0) await new Promise(r=>setTimeout(r,0));
    }
    const phrases=Lingo.phraseIndex(words);
    const english=[];
    for(const [block,item] of blocks){
      if(id!==generation)return;
      const verdict=await detectBlock(block);blockVerdicts.set(block,verdict);if(verdict)english.push({...item,tokens:Lingo.matchedTokens(item.text,phrases)});
    }
    // Names are judged across the whole page so a sentence-initial "Netanyahu" is caught by its other mentions.
    const nameSets=settings.names?Lingo.nameTokens(english):english.map(()=>new Set());
    const note=(word,hit)=>{if(!found.has(word))found.set(word,[]);found.get(word).push(hit);};
    for(const [b,item] of english.entries()){
      let segmentIndex=0;
      for(const [t,token] of item.tokens.entries()){
        note(token.word,{segments:item.segments,tokens:[token]});
        // A separated phrase (gave it up) is one occurrence made of its own tokens only.
        if(token.phraseTokens?.[0]===t)note(token.phraseWord,{segments:item.segments,tokens:token.phraseTokens.map(i=>item.tokens[i])});
        if(nameSets[b].has(t)&&!token.phraseStatus&&!Object.hasOwn(words,token.word))continue;
        seen.add(token.word);const status=token.phraseStatus||words[token.word]?.status||'unknown';
        if(status==='known'||status==='learned')known.add(token.word);
        if(status==='known')continue;
        while(segmentIndex+1<item.segments.length&&item.segments[segmentIndex+1].start<=token.start)segmentIndex++;
        for(const piece of pieces(item.segments,token.start,token.length,segmentIndex)){
          if(piece.seg.info.complex)continue;
          const style=highlightStyle(status,piece.seg.info),key=`${status}|${style.color}|${style.background}`;
          if(!groups.has(key))groups.set(key,{...style,ranges:[]});groups.get(key).ranges.push(range(piece));
        }
      }
    }
    if (id!==generation) return;
    const rules=[];let index=0;
    for (const group of groups.values()) {
      const name=`lingoleaf-${index++}`; const highlight=new Highlight();for(const r of group.ranges)highlight.add(r);
      CSS.highlights.set(name,highlight); names.add(name); rules.push(`::highlight(${name}) { color: ${group.color};${group.background?` background-color: ${group.background};`:''} }`);
    }
    sheet.replaceSync(rules.join('\n'));occurrences=found;
    hoverIndex=new WeakMap();
    for(const [word,hits] of found){if(!Object.hasOwn(words,word))continue;
      for(const hit of hits)for(const token of hit.tokens)for(const piece of pieces(hit.segments,token.start,token.length)){
        const node=piece.seg.node;if(!node.isConnected)continue;
        const entries=hoverIndex.get(node)||[];entries.push({word,start:piece.start,end:piece.end});hoverIndex.set(node,entries);
      }
    }
    if(focus.word&&focusNames.size)showFocus(focus.word,false);
    pageStats={total:seen.size,known:known.size,limited,english:seen.size>0,host:location.hostname};
  }
  async function identify() {
    const declared=document.documentElement.lang.toLowerCase();const sample=document.body.innerText.slice(0,6000);
    pageEnglish=declared==='en'||declared.startsWith('en-');languageCache.clear();
    if (!declared) {try {const r=await message({type:'detect',text:sample});pageEnglish=r.isReliable&&r.languages?.[0]?.language==='en'&&r.languages[0].percentage>=65;}catch{pageEnglish=Lingo.englishHint(sample);}}
    schedule();
  }
  const host=document.createElement('div');host.dataset.lingoleaf='true';
  host.style.cssText='all:initial;position:fixed;z-index:2147483647;display:none;';
  const shadow=host.attachShadow({mode:'closed'});
  const style=document.createElement('style');style.textContent=`.card{box-sizing:border-box;width:min(360px,calc(100vw - 16px));max-height:calc(100vh - 16px);overflow-y:auto;background:#fff;border:1px solid #d5e4dc;border-radius:14px;box-shadow:0 10px 40px #0003;padding:10px;font:13px/1.45 system-ui;color:#1c3430} .title{font-size:12px;color:#63776c;padding:3px 4px 8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis} .translation{border-top:1px solid #e4eee8;margin:2px 0 10px;padding:10px 4px 2px} .translation-label{font-size:10px;font-weight:700;letter-spacing:.5px;color:#63776c;margin-bottom:5px} .translation-text{font-size:14px;line-height:1.5;white-space:pre-wrap;overflow-wrap:anywhere} .context-source{color:#63776c;font-size:11px;margin-bottom:5px} .phrase-row{padding:6px 0;border-bottom:1px solid #edf3ef} .phrase-row:last-child{border:0} .phrase-form{font-weight:650} .phrase-meaning{font-size:12px;margin:4px 0;color:#496b58} .actions{display:flex;gap:5px;flex-wrap:wrap}button{font:12px system-ui;cursor:pointer;border:0;border-radius:8px;background:#edf4ef;color:#193d30;padding:8px}button:hover{background:#d4e8dc}button:disabled{opacity:.6;cursor:default} .note{padding:6px;font-size:12px}`;
  shadow.append(style);const card=document.createElement('div');card.className='card';shadow.append(card);document.documentElement.append(host);
  const tipHost=document.createElement('div');tipHost.dataset.lingoleaf='true';tipHost.style.cssText='all:initial;position:fixed;z-index:2147483646;pointer-events:none;display:none;';
  const tipShadow=tipHost.attachShadow({mode:'closed'}),tip=document.createElement('div');tip.style.cssText='box-sizing:border-box;max-width:280px;padding:8px 11px;border-radius:9px;background:#203e35;color:#fff;box-shadow:0 5px 18px #0004;font:13px/1.4 system-ui;overflow-wrap:anywhere;';tipShadow.append(tip);document.documentElement.append(tipHost);
  let tipWord='';
  function hideTip(){tipHost.style.display='none';tipWord='';}
  document.addEventListener('pointermove',e=>{
    if(!settings.enabled||settings.siteModes[location.hostname]==='off'||!document.caretRangeFromPoint){hideTip();return;}
    const caret=document.caretRangeFromPoint(e.clientX,e.clientY),node=caret?.startContainer;
    const entries=node?.nodeType===Node.TEXT_NODE?hoverIndex.get(node):null;
    let match=null;
    if(entries)for(const entry of entries){
      if(caret.startOffset<entry.start||caret.startOffset>entry.end)continue;
      const check=new Range();check.setStart(node,entry.start);check.setEnd(node,entry.end);
      if([...check.getClientRects()].some(r=>e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom)){
        if(!match||entry.end-entry.start>match.end-match.start)match=entry;
      }
    }
    if(!match){hideTip();return;}
    const meaning=words[match.word]?.translation||'Türkçe karşılık henüz yok';
    if(tipWord!==match.word||tip.dataset.meaning!==meaning){tip.replaceChildren();const title=document.createElement('strong');title.textContent=match.word;const text=document.createElement('div');text.textContent=meaning;tip.append(title,text);tip.dataset.meaning=meaning;tipWord=match.word;}
    tipHost.style.display='block';tipHost.style.left=`${Math.max(8,Math.min(e.clientX+12,innerWidth-tip.getBoundingClientRect().width-8))}px`;tipHost.style.top=`${Math.max(8,Math.min(e.clientY+18,innerHeight-tip.getBoundingClientRect().height-8))}px`;
  },{passive:true});
  document.addEventListener('pointerleave',hideTip);addEventListener('scroll',hideTip,{passive:true});
  let selected='',translationRequest=0,translatorPromise=null,translatorState=null;
  const translationCache=new Map();
  // Saved words get their own Turkish meaning (not the sentence's) for the panel; only empty fields are filled.
  async function rememberTranslation(word){
    try{
      let text=translationCache.get(word);
      if(!text){if(!translatorPromise)return;const translator=await translatorPromise;text=await translator.translate(word);translationCache.set(word,text);}
      if(text)await message({type:'translations',map:{[word]:text}});
    }catch{}
  }
  function hide(){translationRequest++;host.style.display='none';}
  function positionCard(rect){
    const width=card.getBoundingClientRect().width,height=card.getBoundingClientRect().height;
    host.style.left=`${Math.max(8,Math.min(rect.left,innerWidth-width-8))}px`;
    const below=rect.bottom+10,above=rect.top-height-10;
    host.style.top=`${below+height<=innerHeight-8?below:above>=8?above:Math.max(8,innerHeight-height-8)}px`;
  }
  async function translateSelection(text,request,output,rect,onDone){
    const update=value=>{if(request!==translationRequest)return;output.textContent=value;positionCard(rect);};
    const finish=result=>{update(result);if(request===translationRequest)onDone?.(result);};
    try{
      if(translationCache.has(text)){finish(translationCache.get(text));return;}
      if(!globalThis.Translator){finish('Yerel çeviri için Chrome 138 veya üzeri gerekir.');return;}
      if(!translatorPromise){
        const state=translatorState??await Translator.availability({sourceLanguage:'en',targetLanguage:'tr'});
        if(state==='unavailable'){finish('İngilizce–Türkçe çeviri bu tarayıcıda kullanılamıyor.');return;}
        if(request!==translationRequest)return;
        translatorState=state;
        if(state!=='available')update('Çeviri dil paketi hazırlanıyor…');
        translatorPromise=Translator.create({sourceLanguage:'en',targetLanguage:'tr',monitor(m){
          m.addEventListener('downloadprogress',e=>update(`Çeviri dil paketi indiriliyor: %${Math.round(e.loaded*100)}`));
        }});
      }
      const translator=await translatorPromise;
      if(request!==translationRequest)return;
      update('Çevriliyor…');
      const result=await translator.translate(text);
      translationCache.set(text,result);if(translationCache.size>100)translationCache.delete(translationCache.keys().next().value);
      finish(result);
    }catch{
      if(request!==translationRequest)return;
      translatorPromise=null;
      output.replaceChildren(document.createTextNode('Çeviri tamamlanamadı. '));
      const retry=document.createElement('button');retry.textContent='Tekrar dene';retry.onclick=()=>{update('Çevriliyor…');translateSelection(text,request,output,rect,onDone);};output.append(retry);positionCard(rect);
      onDone?.(null);
    }
  }
  function show(text, rect, details) {
    const request=++translationRequest;
    selected=text.slice(0,5000);card.replaceChildren();
    const title=document.createElement('div');title.className='title';title.textContent=selected;card.append(title);
    const terms=Lingo.selectionTerms(selected,candidatePhrases,words),list=terms.map(term=>term.word),single=list.length===1?terms[0]:null;
    if(single?.phrase&&single.surface.toLowerCase()!==single.word)title.textContent=`${single.surface} → ${single.word}`;
    const suggestions=details.suggestions.filter(suggestion=>!list.includes(suggestion.word));
    const translation=document.createElement('div');translation.className='translation';
    const translationLabel=document.createElement('div');translationLabel.className='translation-label';translationLabel.textContent='TÜRKÇE ÇEVİRİ';translation.append(translationLabel);
    const translationText=document.createElement('div');translationText.className='translation-text';translationText.setAttribute('aria-live','polite');translationText.textContent='Çevriliyor…';translation.append(translationText);card.append(translation);
    const phraseOutputs=[];
    if(suggestions.length){
      const section=document.createElement('div');section.className='translation';
      const label=document.createElement('div');label.className='translation-label';label.textContent='ÖBEK ÖNERİSİ';section.append(label);
      for(const suggestion of suggestions.slice(0,2)){
        const row=document.createElement('div');row.className='phrase-row';
        const form=document.createElement('div');form.className='phrase-form';form.textContent=suggestion.surface===suggestion.word?suggestion.word:`${suggestion.surface} → ${suggestion.word}`;row.append(form);
        const meaning=document.createElement('div');meaning.className='phrase-meaning';meaning.setAttribute('aria-live','polite');meaning.textContent='Çevriliyor…';row.append(meaning);
        const save=document.createElement('button');save.textContent='Öğreniyorum olarak ekle';save.onclick=async()=>{
          try{save.disabled=true;const result=await message({type:'change',words:[suggestion.word],status:'learning',example:details.sentence||selected});save.textContent=result.count?'Eklendi':'Zaten kayıtlı';if(result.count)rememberTranslation(suggestion.word);}
          catch(e){save.disabled=false;meaning.textContent=e.message;}
        };row.append(save);section.append(row);phraseOutputs.push({text:suggestion.surface,output:meaning});
      }
      card.append(section);
    }
    let contextOutput=null;
    if(Lingo.tokens(selected).length===1&&details.sentence&&details.sentence.toLowerCase()!==selected.toLowerCase()){
      const section=document.createElement('div');section.className='translation';
      const label=document.createElement('div');label.className='translation-label';label.textContent='CÜMLEDEKİ KULLANIM';section.append(label);
      const source=document.createElement('div');source.className='context-source';source.textContent=details.sentence;section.append(source);
      contextOutput=document.createElement('div');contextOutput.className='translation-text';contextOutput.setAttribute('aria-live','polite');contextOutput.textContent='Çevriliyor…';section.append(contextOutput);card.append(section);
    }
    if(suggestions.length&&single&&!single.phrase){const only=document.createElement('div');only.className='note';only.textContent=`Yalnızca “${single.word}”:`;card.append(only);}
    const actions=document.createElement('div');actions.className='actions';card.append(actions);
    const add=(label,fn)=>{const b=document.createElement('button');b.textContent=label;b.onclick=()=>fn().catch(e=>{title.textContent=e.message;});actions.append(b);};
    add('Kelimeleri yönet',async()=>{await message({type:'pending',text:selected,url:location.href});hide();});
    if(list.length===1)for(const status of Lingo.statuses)add(Lingo.labels[status],async()=>{
      const word=single.word;
      const result=await message({type:'change',words:[word],status,example:getSelection()?.anchorNode?.parentElement?.closest(blockSelector)?.textContent?.slice(0,1000)||selected});if(result.count)rememberTranslation(word);title.textContent=result.count?`${Lingo.labels[status]} olarak kaydedildi`:single.phrase?'Bu öbek zaten bu durumda':'Bu kelime zaten bu durumda';
      actions.replaceChildren();if(result.undoId)add('Geri al',async()=>{await message({type:'undo',id:result.undoId});hide();});add('Kapat',async()=>hide());
    });
    else {const note=document.createElement('div');note.className='note';const phraseCount=terms.filter(term=>term.phrase).length;note.textContent=`${list.length} benzersiz ${phraseCount?`öğe (${phraseCount} öbek)`:'kelime'} • Panelde seçerek ekle`;card.append(note);}
    const pendingError=from=>{for(const phrase of phraseOutputs.slice(from))phrase.output.textContent='Çeviri tamamlanamadı.';if(contextOutput)contextOutput.textContent='Çeviri tamamlanamadı.';};
    const translateContext=()=>{if(contextOutput)translateSelection(details.sentence,request,contextOutput,rect);};
    const translatePhrases=(index=0)=>{
      if(index>=phraseOutputs.length){translateContext();return;}
      const phrase=phraseOutputs[index];
      if(phrase.text===selected){phrase.output.textContent=translationText.textContent;translatePhrases(index+1);return;}
      translateSelection(phrase.text,request,phrase.output,rect,result=>{if(result===null)pendingError(index+1);else translatePhrases(index+1);});
    };
    host.style.display='block';positionCard(rect);translateSelection(selected,request,translationText,rect,result=>{if(result===null)pendingError(0);else translatePhrases();});
  }
  document.addEventListener('pointerup',e=>{
    if(e.composedPath().includes(host)||!settings.enabled||!settings.menu||settings.siteModes[location.hostname]==='off')return;
    setTimeout(()=>{const selection=getSelection();const text=selection?.toString().trim();const el=selection?.anchorNode?.parentElement;
      if(!text||!selection.rangeCount||!el||!allowed(el)){hide();return;}show(text,selection.getRangeAt(0).getBoundingClientRect(),selectionDetails(selection,el));},20);
  });
  document.addEventListener('keydown',e=>{if(e.key==='Escape')hide();});
  document.addEventListener('pointerdown',e=>{if(!e.composedPath().includes(host))hide();});
  addEventListener('scroll',hide,{passive:true});
  chrome.runtime.onMessage.addListener((msg,sender,reply)=>{if(msg.type==='selection')reply({text:getSelection()?.toString()||'',url:location.href});if(msg.type==='pageStats')reply(pageStats||{english:false,host:location.hostname});
    if(msg.type==='occurrences')reply(Object.fromEntries(Object.keys(words).map(word=>[word,occurrences.get(word)?.length||0]).filter(([,count])=>count)));
    if(msg.type==='focus')reply(showFocus(String(msg.word||''),msg.step===true));
    if(msg.type==='blur'){clearFocus();if(!msg.keep)focus={word:'',index:-1};reply({});}});
  const statusKey=rows=>Object.values(rows||{}).map(row=>`${row.word}:${row.status}`).sort().join('|');
  chrome.storage.onChanged.addListener((changes,area)=>{if(area!=='local')return;
    // Translation-only writes do not change colours, so the page and an open card are left alone.
    const recolor=changes.settings||(changes.words&&statusKey(changes.words.newValue)!==statusKey(changes.words.oldValue));
    if(changes.words)words=changes.words.newValue||{};if(changes.settings)settings=Lingo.settings(changes.settings.newValue);if(recolor){hide();schedule();}});
  const observer=new MutationObserver(records=>{if(records.some(r=>r.type==='attributes'&&r.attributeName==='lang'))identify();else if(records.some(r=>r.type==='attributes'||r.type==='characterData'||[...r.addedNodes,...r.removedNodes].some(n=>n!==host&&n!==tipHost)))schedule();});
  chrome.storage.local.get(['words','settings']).then(data=>{words=data.words||{};settings=Lingo.settings(data.settings);identify();observer.observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['lang','class','style','hidden']});observer.observe(document.documentElement,{attributes:true,attributeFilter:['lang','class','style']});});
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change',schedule);
  let resize;addEventListener('resize',()=>{clearTimeout(resize);resize=setTimeout(schedule,300);});
  for(const event of ['pointerdown','keydown','scroll'])document.addEventListener(event,()=>lastInteraction=Date.now(),{passive:true});
  setInterval(()=>{if(document.visibilityState==='visible'&&document.hasFocus()&&settings.enabled&&settings.siteModes[location.hostname]!=='off'&&pageStats?.english&&Date.now()-lastInteraction<90000)message({type:'activity',seconds:30}).catch(()=>{});},30000);
})();
