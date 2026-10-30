import dictionaries from '../assets/translations.json';
const languages=[['it','Italiano'],['en','English'],['es','Español'],['fr','Français'],['pt','Português'],['de','Deutsch'],['ru','Русский'],['zh-CN','中文'],['hi','हिन्दी'],['bn','বাংলা'],['ar','العربية'],['ur','اردو'],['id','Bahasa Indonesia'],['ja','日本語']];
const originals=new WeakMap(),attributes=new WeakMap();
let language='it',timer=null;
try{language=localStorage.getItem('studio-language')||'it';}catch{}
if(!dictionaries[language])language='it';
const excluded=new Set(['currentValue','rangeMetric','folderPath','exportSubtitle','artworkName','printersList']);
const patterns=[
  [/^di (.+)$/,'di {count}',['count']],
  [/^(.+) file (\S+) · (.+) etichette$/,'{files} file {format} · {count} etichette',['files','format','count']],
  [/^(.+) etichette per bobina$/,'{count} etichette per bobina',['count']],
  [/^(.+) formati di codice$/,'{count} formati di codice',['count']],
  [/^(.+) di (.+) completati$/,'{done} di {total} completati',['done','total']],
  [/^Esportazione completata: (.+) file, (.+) etichette\.$/,'Esportazione completata: {files} file, {count} etichette.',['files','count']],
  [/^Codice (.+) × (.+) mm · modulo (.+) mm · nessun elemento fuori formato\.$/,'Codice {width} × {height} mm · modulo {module} mm · nessun elemento fuori formato.',['width','height','module']],
  [/^Zona libera inferiore a (.+) mm: verificare lo standard del codice\.$/,'Zona libera inferiore a {size} mm: verificare lo standard del codice.',['size']],
  [/^Formato rilevato: (.+) × (.+) mm$/,'Formato rilevato: {width} × {height} mm',['width','height']],
  [/^Pagina PDF \(1–(.+)\)$/,'Pagina PDF (1–{pages})',['pages']],
  [/^Immagine: (.+) × (.+) pixel\. Verrà usato il formato attuale dell’etichetta\.$/,'Immagine: {width} × {height} pixel. Verrà usato il formato attuale dell’etichetta.',['width','height']]
];
function t(source){
  const dict=dictionaries[language]||{};
  if(language==='it')return source;
  if(dict[source])return dict[source];
  for(const [expression,key,names]of patterns){const match=expression.exec(source);if(match){const values=Object.fromEntries(names.map((name,i)=>[name,match[i+1]]));return (dict[key]||key).replace(/\{(\w+)\}/g,(_,name)=>values[name]??'');}}
  let result=source;
  const candidates=Object.keys(dict).filter(key=>key.length>14&&source.includes(key)).sort((a,b)=>b.length-a.length);
  for(const key of candidates)result=result.replace(key,()=>dict[key]);
  return result;
}
function skip(node){const parent=node.parentElement;if(!parent||parent.closest('svg,script,style,textarea,[data-no-translate]'))return true;let current=parent;while(current){if(excluded.has(current.id))return true;current=current.parentElement;}return false;}
function refresh(){
  document.documentElement.lang=language;document.documentElement.dir=['ar','ur'].includes(language)?'rtl':'ltr';
  const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT),nodes=[];
  while(walker.nextNode())nodes.push(walker.currentNode);
  for(const node of nodes){
    if(skip(node))continue;
    const old=originals.get(node),source=old&&node.nodeValue===old.result?old.source:node.nodeValue,clean=source.trim();
    if(!clean)continue;
    const result=source.replace(clean,()=>t(clean));originals.set(node,{source,result});if(node.nodeValue!==result)node.nodeValue=result;
  }
  document.querySelectorAll('[placeholder],[title],[aria-label]').forEach(element=>{
    if(element.closest('[data-no-translate]'))return;
    let data=attributes.get(element);
    if(!data){data={};for(const attr of ['placeholder','title','aria-label'])if(element.hasAttribute(attr))data[attr]=element.getAttribute(attr);attributes.set(element,data);}
    for(const [attr,source]of Object.entries(data)){const result=t(source);if(element.getAttribute(attr)!==result)element.setAttribute(attr,result);}
  });
  const selector=document.getElementById('languageSelect');if(selector&&selector.value!==language)selector.value=language;
}
function setLanguage(code){
  if(!dictionaries[code])return;language=code;
  try{localStorage.setItem('studio-language',language);}catch{}
  refresh();window.dispatchEvent(new CustomEvent('studio-language',{detail:language}));
}
export function initI18n(){
  const select=document.createElement('select');select.id='languageSelect';select.className='language-select';select.setAttribute('aria-label','Lingua');select.setAttribute('data-no-translate','');
  for(const [code,name]of languages){const option=document.createElement('option');option.value=code;option.textContent=name;select.append(option);}
  select.value=language;select.onchange=()=>setLanguage(select.value);document.querySelector('.header-actions')?.prepend(select);
  new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(refresh,20);}).observe(document.body,{childList:true,subtree:true,characterData:true});
  refresh();window.EtichetteI18n={set:setLanguage,language:()=>language,languages:languages.map(item=>item[0]),t,refresh};
}
