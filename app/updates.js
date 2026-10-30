/* Tauri updater: Tauri Programme e collaboratori — https://github.com/tauri-apps/plugins-workspace */
import {check} from '@tauri-apps/plugin-updater';
import {getVersion} from '@tauri-apps/api/app';

export function initUpdater(options={}){
  const api={check,getVersion,storage:localStorage,initialDelay:5000,interval:21600000,...options};
  const preference='etichette-studio-auto-updates';
  let automatic=true,pending=null,checking=false,installing=false,dismissedVersion='',destroyed=false;
  try{automatic=api.storage.getItem(preference)!=='false';}catch{}
  const panel=document.createElement('section');
  panel.id='updateNotice';panel.className='update-notice';panel.hidden=true;
  panel.setAttribute('aria-label','Aggiornamenti');
  panel.innerHTML='<div class="update-heading"><strong>Aggiornamenti</strong><button type="button" id="closeUpdate" class="button text" aria-label="Chiudi">×</button></div><p id="updateStatus" role="status" aria-live="polite"></p><p id="updateVersion" data-no-translate></p><details id="updateDetails" hidden><summary>Novità della versione</summary><pre id="updateNotes" data-no-translate></pre></details><progress id="updateProgress" hidden max="100"></progress><div class="update-actions"><button type="button" id="installUpdate" class="button" hidden>Aggiorna</button><button type="button" id="laterUpdate" class="button secondary">Più tardi</button><button type="button" id="disableUpdates" class="button text">Non chiedermelo più</button></div><label class="update-preference"><input id="automaticUpdates" type="checkbox">Avvisami automaticamente degli aggiornamenti</label>';
  document.body.append(panel);
  const find=id=>panel.querySelector('#'+id);
  const trigger=document.createElement('button');
  trigger.type='button';trigger.id='checkUpdates';trigger.className='button secondary';
  trigger.textContent='Aggiornamenti';trigger.title='Controlla aggiornamenti';
  document.querySelector('.header-actions')?.append(trigger);
  const status=text=>{find('updateStatus').textContent=text;};
  const busy=value=>{installing=value;for(const id of ['closeUpdate','installUpdate','laterUpdate','disableUpdates','automaticUpdates'])find(id).disabled=value;};
  const clearPending=async()=>{const old=pending;pending=null;if(old)await old.close().catch(()=>{});};
  const setAutomatic=value=>{automatic=value;find('automaticUpdates').checked=value;try{api.storage.setItem(preference,String(value));}catch{}};
  setAutomatic(automatic);
  const hide=()=>{panel.hidden=true;if(pending)dismissedVersion=pending.version;};
  find('closeUpdate').onclick=hide;find('laterUpdate').onclick=hide;
  find('disableUpdates').onclick=()=>{setAutomatic(false);hide();void clearPending();};
  find('automaticUpdates').onchange=event=>setAutomatic(event.target.checked);
  async function runCheck(manual=false){
    if(destroyed||checking||installing||(!manual&&!automatic))return;
    checking=true;trigger.disabled=true;
    if(manual){panel.hidden=false;status('Ricerca aggiornamenti…');find('installUpdate').hidden=true;find('updateDetails').hidden=true;find('updateVersion').textContent='';}
    try{
      await clearPending();
      const update=await api.check({timeout:15000});
      if(destroyed||(!manual&&!automatic)){await update?.close().catch(()=>{});return;}
      pending=update;
      if(update){
        if(manual||dismissedVersion!==update.version){
          status('È disponibile una nuova versione.');
          find('updateVersion').textContent=`v${update.currentVersion} → v${update.version}`;
          find('updateNotes').textContent=update.body||'';find('updateDetails').hidden=!update.body;
          find('installUpdate').hidden=false;panel.hidden=false;
        }
        trigger.classList.add('update-available');
      }else{
        trigger.classList.remove('update-available');
        find('installUpdate').hidden=true;find('updateDetails').hidden=true;
        if(manual){status('Stai usando la versione più recente.');find('updateVersion').textContent='v'+await api.getVersion();}
      }
    }catch{
      if(manual){status('Impossibile controllare gli aggiornamenti. Verifica la connessione e riprova.');find('installUpdate').hidden=true;}
    }finally{checking=false;trigger.disabled=false;}
  }
  const confirm=document.createElement('dialog');confirm.id='updateConfirm';confirm.className='update-confirm';
  confirm.innerHTML='<h2>Installare l’aggiornamento?</h2><p>L’app verrà chiusa e riaperta. Salva il progetto prima di continuare.</p><p id="updateConfirmStatus" role="status"></p><div class="update-actions"><button type="button" id="saveBeforeUpdate" class="button secondary">Salva progetto</button><button type="button" id="confirmUpdate" class="button">Aggiorna ora</button><button type="button" id="cancelUpdate" class="button text">Annulla</button></div>';
  document.body.append(confirm);
  const confirmStatus=confirm.querySelector('#updateConfirmStatus');
  const prepare=()=>api.prepareInstall?api.prepareInstall():window.studio?.prepareUpdate?.();
  find('installUpdate').onclick=async()=>{
    if(!pending||checking||installing)return;
    try{await prepare();confirmStatus.textContent='';confirm.showModal();}catch(error){status(String(error.message||error));}
  };
  confirm.querySelector('#saveBeforeUpdate').onclick=async()=>{
    try{const saved=await window.studio?.saveCurrentProject?.();confirmStatus.textContent=saved?'Progetto salvato.':'Salvataggio annullato.';}
    catch{confirmStatus.textContent='Impossibile salvare il progetto. Riprova prima di aggiornare.';}
  };
  confirm.querySelector('#cancelUpdate').onclick=()=>confirm.close();
  confirm.querySelector('#confirmUpdate').onclick=async()=>{
    if(!pending||installing)return;
    try{await prepare();}catch(error){confirmStatus.textContent=String(error.message||error);return;}
    confirm.close();busy(true);status('Download dell’aggiornamento…');
    const progress=find('updateProgress');progress.hidden=false;progress.removeAttribute('value');
    let downloaded=0,total=0;
    try{
      await pending.download(event=>{
        if(event.event==='Started'){downloaded=0;total=event.data.contentLength||0;}
        if(event.event==='Progress'){downloaded+=event.data.chunkLength;if(total)progress.value=Math.min(100,downloaded/total*100);}
        if(event.event==='Finished'){progress.value=100;status('Verifica dell’aggiornamento…');}
      },{timeout:120000});
      await prepare();status('Installazione dell’aggiornamento…');
      await pending.install({restartAfterInstall:true});
    }catch{
      status('Aggiornamento non installato. Puoi continuare a lavorare e riprovare più tardi.');
      await clearPending();find('installUpdate').hidden=true;
    }finally{busy(false);progress.hidden=true;}
  };
  trigger.onclick=()=>runCheck(true);
  const initial=setTimeout(()=>{if(!document.hidden)void runCheck();},api.initialDelay);
  const interval=setInterval(()=>{if(!document.hidden)void runCheck();},api.interval);
  const online=()=>{if(!document.hidden)void runCheck();};window.addEventListener('online',online);
  api.getVersion().then(version=>{const el=document.querySelector('.version');if(el)el.textContent='Windows · v'+version;}).catch(()=>{});
  return {check:runCheck,destroy(){destroyed=true;clearTimeout(initial);clearInterval(interval);window.removeEventListener('online',online);void clearPending();panel.remove();confirm.remove();trigger.remove();}};
}
