(() => {
  const statuses = ['learning', 'learned', 'known'];
  const labels = {learning: 'Öğreniyorum', learned: 'Öğrendim', known: 'Biliyorum', unknown: 'Bilinmeyen'};
  const defaults = {enabled: true, menu: true, names: true, sync: true, intensity: 'soft', theme: 'system', goal: 5, siteModes: {}, colors: {unknown: '#b8abec', learning: '#efc67b', learned: '#82cbb1'}};
  function normalize(text) { return String(text).normalize('NFKC').replace(/[’‘]/g, "'").trim().toLowerCase().replace(/^[^a-z]+|[^a-z]+$/g, '').replace(/\s+/g, ' '); }
  function tokens(text) { return [...String(text).matchAll(/(?<![\p{L}\p{N}_])[A-Za-z]+(?:['’‘][A-Za-z]+)*(?:-[A-Za-z]+)*(?![\p{L}\p{N}_])/gu)].filter(m=>!/[^a-zA-Z'’‘-]/.test(m[0])).map(m => ({word: normalize(m[0]), start: m.index, length: m[0].length})); }
  function unique(text) { return [...new Set(tokens(text).map(t => t.word))]; }
  function validKey(key) { return typeof key === 'string' && key.length <= 500 && /^[a-z]+(?:[' -][a-z]+)*$/.test(key); }
  function settings(value = {}) {
    const colors={...defaults.colors};for(const k of Object.keys(colors))if(/^#[a-f\d]{6}$/i.test(value.colors?.[k]))colors[k]=value.colors[k];
    const siteModes={};for(const [host,mode] of Object.entries(value.siteModes||{}))if(['auto','on','off'].includes(mode)&&host.length<255)siteModes[host]=mode;
    return {enabled:typeof value.enabled==='boolean'?value.enabled:true,menu:typeof value.menu==='boolean'?value.menu:true,names:typeof value.names==='boolean'?value.names:true,sync:typeof value.sync==='boolean'?value.sync:true,intensity:['soft','normal','strong'].includes(value.intensity)?value.intensity:'soft',theme:['system','light','dark'].includes(value.theme)?value.theme:'system',goal:Math.max(1,Math.min(1000,Math.floor(Number(value.goal)||5))),colors,siteModes};
  }
  function day(date = new Date()) { const d = new Date(date); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
  function englishHint(text) {
    const words = unique(text.slice(0, 5000));
    const common = new Set('the a an is are was were be been being of to and in that it for on with as this by from or not you your we they have has at can will which their our but about more what when how there these those into also than its would should could'.split(' '));
    return words.length >= 6 && words.filter(w => common.has(w)).length >= Math.max(3, words.length * .07) && !/[ğışİĞŞ]/.test(text);
  }
  const irregularVerbs=Object.fromEntries((
    'be:am,is,are,was,were,been,being;have:has,had;do:does,did,done;go:goes,went,gone;arise:arose,arisen;awake:awoke,awoken;bear:bore,borne,born;'+
    'beat:beat,beaten;become:became;begin:began,begun;bend:bent;bet:bet;bid:bid;bind:bound;bite:bit,bitten;bleed:bled;blow:blew,blown;break:broke,broken;'+
    'breed:bred;bring:brought;build:built;burn:burnt,burned;burst:burst;buy:bought;cast:cast;catch:caught;choose:chose,chosen;cling:clung;come:came;'+
    'cost:cost;creep:crept;cut:cut;deal:dealt;dig:dug;draw:drew,drawn;dream:dreamt,dreamed;drink:drank,drunk;drive:drove,driven;eat:ate,eaten;'+
    'fall:fell,fallen;feed:fed;feel:felt;fight:fought;find:found;flee:fled;fling:flung;fly:flew,flown;forget:forgot,forgotten;freeze:froze,frozen;'+
    'get:got,gotten;give:gave,given;grind:ground;grow:grew,grown;hang:hung,hanged;hear:heard;hide:hid,hidden;hit:hit;hold:held;hurt:hurt;keep:kept;'+
    'kneel:knelt;know:knew,known;lay:laid;lead:led;lean:leant,leaned;leap:leapt,leaped;leave:left;lend:lent;let:let;lie:lay,lain,lied;light:lit,lighted;'+
    'lose:lost;make:made;mean:meant;meet:met;pay:paid;put:put;quit:quit;read:read;ride:rode,ridden;ring:rang,rung;rise:rose,risen;run:ran;say:said;'+
    'see:saw,seen;seek:sought;sell:sold;send:sent;set:set;shake:shook,shaken;shed:shed;shine:shone;shoot:shot;show:showed,shown;shrink:shrank,shrunk;'+
    'shut:shut;sing:sang,sung;sink:sank,sunk;sit:sat;sleep:slept;slide:slid;sling:slung;speak:spoke,spoken;speed:sped;spend:spent;spill:spilt,spilled;'+
    'spin:spun;spit:spat;split:split;spread:spread;spring:sprang,sprung;stand:stood;steal:stole,stolen;stick:stuck;sting:stung;stink:stank;strike:struck;'+
    'string:strung;swear:swore,sworn;sweep:swept;swell:swelled,swollen;swim:swam,swum;swing:swung;take:took,taken;teach:taught;tear:tore,torn;tell:told;'+
    'think:thought;throw:threw,thrown;thrust:thrust;tread:trod,trodden;wake:woke,woken;wear:wore,worn;weave:wove,woven;weep:wept;win:won;wind:wound;'+
    'withdraw:withdrew,withdrawn;wring:wrung;write:wrote,written'
  ).split(';').map(entry=>{const [base,forms]=entry.split(':');return [base,forms.split(',')];}));
  function verbForms(base){
    const consonantY=/[^aeiou]y$/.test(base),third=consonantY?`${base.slice(0,-1)}ies`:/(?:s|x|z|ch|sh|o)$/.test(base)?`${base}es`:`${base}s`;
    // Short consonant-vowel-consonant verbs double the last letter: drop → dropped, shut → shutting.
    const stem=/^[^aeiou]*[aeiou][bdglmnprt]$/.test(base.replace(/^qu/,'q'))?base+base.at(-1):base;
    const past=consonantY?`${base.slice(0,-1)}ied`:base.endsWith('e')?`${base}d`:`${stem}ed`;
    const ing=base.endsWith('ie')?`${base.slice(0,-2)}ying`:base.endsWith('e')&&base.length>2&&!/(?:ee|ye|oe)$/.test(base)?`${base.slice(0,-1)}ing`:`${stem}ing`;
    return new Set([base,third,ing,...(irregularVerbs[base]||[past])]);
  }
  // Entries are phrase strings or rows ({word,status,fixed}); every inflected form of the first word points at the phrase unless it is fixed.
  function candidateIndex(phrases){
    const index=new Map();
    for(const entry of phrases){const row=typeof entry==='string'?{word:entry}:entry,word=row.word,parts=word.split(' ');if(parts.length<2)continue;
      for(const form of row.fixed?[parts[0]]:verbForms(parts[0])){if(!index.has(form))index.set(form,[]);index.get(form).push({word,parts,status:row.status,fixed:row.fixed===true});}
    }
    for(const candidates of index.values())candidates.sort((a,b)=>b.parts.length-a.parts.length);
    return index;
  }
  function bundledIndex(){return candidateIndex([...(globalThis.LingoPhrases||[]),...(globalThis.LingoExpressions||[]).map(word=>({word,fixed:true}))]);}
  function phraseIndex(words){return candidateIndex(Object.values(words).filter(row=>row.word.includes(' ')));}
  const objectPronouns=new Set(['it','them','him','her','me','us','you','anyone','someone','everyone','nobody','somebody','something','nothing']);
  const determiners=new Set(['a','an','the','this','that','these','those','my','our','your','his','her','their','some','any']);
  // Every phrase occurrence in text; tokens holds the indexes of the phrase's own words (an object between verb and particle is not part of it).
  function phraseMatches(text,index,list=tokens(text)){
    const matches=[],adjacent=(a,b)=>/^\s+$/.test(text.slice(list[a].start+list[a].length,list[b].start));
    for(let i=0;i<list.length;i++)for(const candidate of index.get(list[i].word)||[]){
      const parts=[i];let valid=true;
      for(let j=1;j<candidate.parts.length&&valid;j++){
        const last=parts.at(-1),next=last+1;
        if(j===1&&candidate.parts.length===2&&!candidate.fixed){
          let separated=false;
          for(let gap=1;gap<=3;gap++){
            const particle=next+gap,middle=list.slice(next,particle).map(token=>token.word);
            const object=gap===1?objectPronouns.has(middle[0]):determiners.has(middle[0]);
            if(!object||list[particle]?.word!==candidate.parts[j])continue;
            if(Array.from({length:gap+1},(_,k)=>last+k).every(k=>adjacent(k,k+1))){parts.push(particle);separated=true;break;}
          }
          if(separated)continue;
        }
        if(list[next]?.word!==candidate.parts[j]||!adjacent(last,next))valid=false;else parts.push(next);
      }
      if(valid)matches.push({word:candidate.word,status:candidate.status,tokens:parts,start:list[i].start,end:list[parts.at(-1)].start+list[parts.at(-1)].length});
    }
    return matches;
  }
  const byPriority=(a,b)=>b.tokens.length-a.tokens.length||(a.end-a.start)-(b.end-b.start)||a.start-b.start;
  function claim(matches,used,take){for(const match of matches.sort(byPriority)){if(match.tokens.some(t=>used.has(t)))continue;match.tokens.forEach(t=>used.add(t));take(match);}}
  function matchedTokens(text,index){const list=tokens(text);claim(phraseMatches(text,index,list),new Set(),match=>{for(const t of match.tokens){list[t].phraseStatus=match.status;list[t].phraseWord=match.word;list[t].phraseTokens=match.tokens;}});return list;}
  // Proper names (people, places, organisations) are left uncolored. A capital letter inside a sentence marks a name;
  // a capital at a sentence start or in a Title Case heading is ambiguous and counts as a name only when the same word
  // appears elsewhere as a name and never in lower case. Short all-caps words are acronyms (NATO, UK).
  function capitalKinds(text,list=tokens(text)){
    const raws=list.map(token=>text.slice(token.start,token.start+token.length));
    // Title Case headings capitalise almost every longer word and do not end like a sentence.
    const letters=raws.filter(raw=>raw.length>3),titleCase=letters.length>=3&&letters.filter(raw=>/^[A-Z]/.test(raw)).length>=letters.length*.75&&!/[.!?]["”’')]*$/.test(text.trim());
    const shouting=raws.length>=2&&raws.every(raw=>raw===raw.toUpperCase());
    return list.map((token,i)=>{
      const raw=raws[i];
      if(!/^[A-Z]/.test(raw)||token.word==='i'||token.word.startsWith("i'"))return 'lower';
      if(raw.length>1&&raw===raw.toUpperCase())return shouting?'ambiguous':raw.length<=5?'acronym':'ambiguous';
      if(titleCase)return 'ambiguous';
      return /(?:^|[.!?:;…\u0000]|\n)[\s"“”‘’'(\[«—–-]*$/.test(text.slice(0,token.start))?'ambiguous':'mid';
    });
  }
  // blocks: [{text, tokens?}] → one Set of name token indexes per block.
  function nameTokens(blocks){
    const lists=blocks.map(block=>block.tokens||tokens(block.text)),kinds=blocks.map((block,b)=>capitalKinds(block.text,lists[b])),evidence=new Map();
    lists.forEach((list,b)=>list.forEach((token,i)=>{
      const kind=kinds[b][i];if(kind==='ambiguous')return;
      const row=evidence.get(token.word)||{name:0,lower:0};row[kind==='lower'?'lower':'name']++;evidence.set(token.word,row);
    }));
    return kinds.map((list,b)=>new Set(list.flatMap((kind,i)=>{
      const row=evidence.get(lists[b][i].word);
      return kind==='mid'||kind==='acronym'||(kind==='ambiguous'&&row?.name>0&&!row.lower)?[i]:[];
    })));
  }
  // Unique terms in reading order; saved phrases win over bundled candidates, and words inside a phrase are not listed again.
  // Candidate phrases named in exclude (split by the user) fall back to separate words.
  function extractTerms(text,candidates,saved={},exclude=new Set()){
    const list=tokens(text),used=new Set(),found=[];
    const take=match=>found.push({word:match.word,phrase:true,saved:Object.hasOwn(saved,match.word),surface:text.slice(match.start,match.end),at:match.tokens[0]});
    claim(phraseMatches(text,phraseIndex(saved),list),used,take);
    if(candidates)claim(phraseMatches(text,candidates,list).filter(match=>!exclude.has(match.word)),used,take);
    list.forEach((token,i)=>{if(!used.has(i))found.push({word:token.word,phrase:false,surface:text.slice(token.start,token.start+token.length),at:i});});
    const seen=new Set();
    return found.sort((a,b)=>a.at-b.at).filter(term=>!seen.has(term.word)&&seen.add(term.word)).map(({at,...term})=>term);
  }
  // A selection that is one phrase plus the object inside it ("ruling anyone out") stands for that phrase alone.
  function selectionTerms(text,candidates,saved){const found=extractTerms(text,candidates,saved),phrases=found.filter(term=>term.phrase);return phrases.length===1&&tokens(phrases[0].surface).length===tokens(text).length?phrases:found;}
  function terms(text,candidates,saved,exclude){return extractTerms(text,candidates,saved,exclude).map(term=>term.word);}
  function phraseSuggestions(text,start,end,index,saved={}){
    const matches=phraseMatches(text,index).filter(match=>!Object.hasOwn(saved,match.word)&&match.start<end&&match.end>start)
      .map(match=>({word:match.word,surface:text.slice(match.start,match.end),start:match.start,end:match.end}));
    matches.sort((a,b)=>(b.end-b.start)-(a.end-a.start));
    const selected=[];for(const match of matches){if(selected.some(other=>match.start<other.end&&match.end>other.start))continue;selected.push(match);if(selected.length===3)break;}
    return selected;
  }
  function sentenceContext(text,start,maxLength=500){
    for(const part of new Intl.Segmenter('en',{granularity:'sentence'}).segment(text)){
      if(start<part.index||start>=part.index+part.segment.length)continue;
      const sentence=part.segment.trim();if(sentence.length<=maxLength)return sentence;
      const center=start-part.index,left=Math.max(0,Math.min(center-160,sentence.length-maxLength));
      return `${left?'…':''}${sentence.slice(left,left+maxLength).trim()}${left+maxLength<sentence.length?'…':''}`;
    }
    return '';
  }
  function streak(days,now=new Date()){const active=new Set(days);let d=new Date(now),count=0;if(!active.has(day(d)))d.setDate(d.getDate()-1);while(active.has(day(d))){count++;d.setDate(d.getDate()-1);}return count;}
  function parseCSV(text){const first=text.split(/\r?\n/,1)[0],delimiter=(first.match(/;/g)||[]).length>(first.match(/,/g)||[]).length?';':',';const rows=[];let row=[],field='',quoted=false;for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){field+='"';i++;}else quoted=!quoted;}else if(!quoted&&(c===delimiter||c==='\n'||c==='\r')){row.push(field);field='';if(c==='\n'||c==='\r'){if(c==='\r'&&text[i+1]==='\n')i++;if(row.some(Boolean))rows.push(row);row=[];}}else field+=c;}if(quoted)throw Error('CSV içinde kapanmamış tırnak var.');row.push(field);if(row.some(Boolean))rows.push(row);return rows;}
  // Highlight colors are rebuilt per background and font in OKLCH: the status hue is kept, chroma stays vivid,
  // and lightness is pushed only as far toward the background as the contrast target allows.
  const toLinear=v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;};
  const fromLinear=v=>Math.round(255*Math.min(1,Math.max(0,v<=.0031308?12.92*v:1.055*v**(1/2.4)-.055)));
  const luminance=c=>c.slice(0,3).map(toLinear).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
  const contrast=(a,b)=>{const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
  function oklab(rgb){
    const [r,g,b]=rgb.slice(0,3).map(toLinear);
    const l=Math.cbrt(.4122214708*r+.5363325363*g+.0514459929*b),m=Math.cbrt(.2119034982*r+.6806995451*g+.1073969566*b),s=Math.cbrt(.0883024619*r+.2817188376*g+.6299787005*b);
    return [.2104542553*l+.793617785*m-.0040720468*s,1.9779984951*l-2.428592205*m+.4505937099*s,.0259040371*l+.7827717662*m-.808675766*s];
  }
  // OKLCH → sRGB, lowering chroma until the color fits the gamut.
  function fromOklch(L,C,h){
    for(let c=C;;c*=.9){
      const a=c*Math.cos(h),b=c*Math.sin(h);
      const l=(L+.3963377774*a+.2158037573*b)**3,m=(L-.1055613458*a-.0638541728*b)**3,s=(L-.0894841775*a-1.291485548*b)**3;
      const lin=[4.0767416621*l-3.3077115913*m+.2309699292*s,-1.2684380046*l+2.6097574011*m-.3413193965*s,-.0041960863*l-.7034186147*m+1.707614701*s];
      if(c<.005||lin.every(v=>v>=-.0001&&v<=1.0001))return lin.map(v=>fromLinear(Math.max(0,v)));
    }
  }
  const intensities={soft:{chroma:.13,tint:0},normal:{chroma:.16,tint:.07},strong:{chroma:.19,tint:.14}};
  function hexRGB(hex){const c=[1,3,5].map(i=>parseInt(String(hex).slice(i,i+2),16));return c.every(Number.isFinite)?c:[150,130,200];}
  // font: {size (px), weight}. Large text may be lighter (WCAG 3:1); thin small text needs more than 4.5:1.
  function highlightStyle(hex,bg,text,intensity='soft',font={size:16,weight:400}){
    const mode=intensities[intensity]||intensities.soft,status=hexRGB(hex);
    const large=font.size>=24||(font.size>=18.5&&font.weight>=700),target=large?3.2:font.weight<350||font.size<13?5.5:4.6;
    const ground=mode.tint?bg.map((v,i)=>Math.round(status[i]*mode.tint+v*(1-mode.tint))):bg.slice(0,3);
    const [,a,b]=oklab(status),hue=Math.atan2(b,a),chroma=Math.max(mode.chroma,Math.hypot(a,b));
    // Dim text on a dark page is hard to read, so dark grounds ask for a little more contrast.
    const light=luminance(ground)>.18,goal=light?target:target+1.4;let color=light?[0,0,0]:[255,255,255];
    for(let i=0;i<=100;i++){const L=light?.98-i*.0098:.02+i*.0098,candidate=fromOklch(L,chroma,hue);if(contrast(candidate,ground)>=goal){color=candidate;break;}}
    // Keep the highlight apart from the page's own text color; otherwise the status is invisible.
    if(Math.hypot(...oklab(color).map((v,i)=>v-oklab(text)[i]))<.08)color=fromOklch(oklab(color)[0],chroma*1.3,hue);
    return {color:`rgb(${color.join(',')})`,background:mode.tint?`rgba(${status.join(',')},${mode.tint})`:'',contrast:Math.round(contrast(color,ground)*10)/10};
  }
  globalThis.Lingo = {statuses, labels, defaults, normalize, tokens, unique, validKey, settings, day, englishHint, phraseIndex, matchedTokens, candidateIndex, bundledIndex, extractTerms, selectionTerms, nameTokens, terms, phraseSuggestions, sentenceContext, streak, parseCSV, highlightStyle, contrast};
  if (typeof module !== 'undefined') module.exports = globalThis.Lingo;
})();
