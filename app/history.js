const databaseName='etichette-studio-history';
export function createHistoryStore(){
  let opened;
  const database=()=>opened||(opened=new Promise((resolve,reject)=>{
    const request=indexedDB.open(databaseName,1);
    request.onupgradeneeded=()=>request.result.createObjectStore('creations',{keyPath:'id',autoIncrement:true});
    request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
  }));
  async function transaction(mode,action){
    const db=await database();return new Promise((resolve,reject)=>{
      const tx=db.transaction('creations',mode),store=tx.objectStore('creations'),request=action(store);
      tx.oncomplete=()=>resolve(request?.result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
    });
  }
  return {
    async add(entry){return transaction('readwrite',store=>store.add({...entry,created:Date.now()}));},
    async list(){return (await transaction('readonly',store=>store.getAll())).reverse();},
    async remove(id){return transaction('readwrite',store=>store.delete(id));},
    async clear(){return transaction('readwrite',store=>store.clear());}
  };
}
export function initHistory({openProject}){
  const store=createHistoryStore();
  const button=document.createElement('button');button.type='button';button.id='openHistory';button.className='rail-button';button.title='Cronologia';button.innerHTML='↶<span>Cronologia</span>';
  document.querySelector('.rail-bottom').before(button);
  const dialog=document.createElement('dialog');dialog.id='historyDialog';dialog.className='history-dialog';
  dialog.innerHTML='<div class="history-heading"><div><h2>Cronologia</h2><p>Creazioni salvate su questo PC. Riapri un progetto per modificarlo o generarlo di nuovo.</p></div><button type="button" id="closeHistory" class="button secondary">Chiudi</button></div><input id="searchHistory" placeholder="Cerca nome o codice" aria-label="Cerca nella cronologia"><div id="historyList"></div><p id="historyStatus" role="status"></p><div class="history-footer"><button type="button" id="clearHistory" class="button text">Svuota cronologia</button><span id="clearHistoryConfirm" hidden><span>Eliminare tutta la cronologia?</span> <button type="button" id="confirmClearHistory" class="button secondary">Elimina tutto</button><button type="button" id="cancelClearHistory" class="button text">Annulla</button></span></div>';
  document.body.append(dialog);
  const find=id=>dialog.querySelector('#'+id),list=find('historyList');
  let entries=[];
  async function refresh(){
    try{entries=await store.list();render();}
    catch{find('historyStatus').textContent='Impossibile leggere la cronologia su questo PC.';}
  }
  function render(){
    list.replaceChildren();
    const query=find('searchHistory').value.trim().toLocaleLowerCase();
    const matches=entries.filter(entry=>[entry.config.name,entry.first,entry.last,entry.config.barcode,entry.config.header].join(' ').toLocaleLowerCase().includes(query));
    find('historyStatus').textContent=matches.length?'':'Nessuna creazione trovata.';
    for(const entry of matches){
      const card=document.createElement('article');card.className='history-card';
      const heading=document.createElement('strong');heading.textContent=entry.config.name;heading.dataset.noTranslate='';
      const details=document.createElement('p');details.dataset.noTranslate='';
      const locale=document.documentElement.lang||'it';
      details.textContent=`${new Date(entry.created).toLocaleString(locale)} · ${Number(entry.total).toLocaleString(locale)} · ${entry.config.barcode} · ${entry.config.width} × ${entry.config.height} mm · ${entry.format.toUpperCase()}`;
      const range=document.createElement('p');range.dataset.noTranslate='';range.className='history-range';range.textContent=entry.first===entry.last?entry.first:entry.first+' → '+entry.last;
      const kind=document.createElement('small');kind.textContent=entry.kind==='print'?'Preparato per la stampa':'File esportati';
      const actions=document.createElement('div');actions.className='update-actions';
      const reopen=document.createElement('button');reopen.type='button';reopen.className='button primary';reopen.textContent='Riapri progetto';
      reopen.onclick=()=>{openProject(entry.config);dialog.close();};
      const remove=document.createElement('button');remove.type='button';remove.className='button text';remove.textContent='Elimina';
      remove.onclick=async()=>{try{await store.remove(entry.id);await refresh();}catch{find('historyStatus').textContent='Impossibile modificare la cronologia.';}};
      actions.append(reopen,remove);card.append(heading,details,range,kind,actions);list.append(card);
    }
  }
  button.onclick=()=>{if(document.querySelector('dialog[open]'))return;find('clearHistoryConfirm').hidden=true;dialog.showModal();void refresh();};
  find('closeHistory').onclick=()=>dialog.close();find('searchHistory').oninput=render;
  find('clearHistory').onclick=()=>{find('clearHistoryConfirm').hidden=false;};
  find('cancelClearHistory').onclick=()=>{find('clearHistoryConfirm').hidden=true;};
  find('confirmClearHistory').onclick=async()=>{try{await store.clear();find('clearHistoryConfirm').hidden=true;await refresh();}catch{find('historyStatus').textContent='Impossibile modificare la cronologia.';}};
  window.addEventListener('studio-language',()=>{if(dialog.open)render();});
  window.addEventListener('studio-created',async event=>{
    try{await store.add(structuredClone(event.detail));if(dialog.open)await refresh();}
    catch{window.dispatchEvent(new CustomEvent('studio-notice',{detail:'File creati. Cronologia non salvata: spazio locale insufficiente o archivio non disponibile.'}));}
  });
  return store;
}
