const measures=new Set(['width','height','gapX','gapY','leader','paperW','paperH','margin','headerSize','headerY','headerX','valueSize','valueY','valueX','footerSize','footerY','barcodeY','barcodeX','barHeight','module','quiet','borderWidth','radius','logoX','logoY','logoW','logoH']);
export function initNavigation(){
  document.querySelectorAll('[data-key]').forEach(input=>{
    if(!measures.has(input.dataset.key))return;
    const label=input.closest('label');if(!label)return;
    const unit=document.createElement('span');unit.className='field-unit';unit.textContent='mm';unit.dataset.noTranslate='';input.before(unit);
    input.setAttribute('aria-description','mm');
  });
  const tabs=Array.from(document.querySelectorAll('[data-tab]'));
  const nav=document.createElement('div');nav.className='panel-navigation';
  nav.innerHTML='<button type="button" id="previousPanel" class="button secondary">Indietro</button><span id="panelStep" data-no-translate></span><button type="button" id="nextPanel" class="button secondary">Avanti</button>';
  document.querySelector('.settings').append(nav);
  function sync(){const index=tabs.findIndex(tab=>tab.classList.contains('active'));tabs.forEach((tab,i)=>{tab.setAttribute('aria-selected',String(i===index));tab.tabIndex=i===index?0:-1;});nav.querySelector('#previousPanel').disabled=index===0;nav.querySelector('#nextPanel').disabled=index===tabs.length-1;nav.querySelector('#panelStep').textContent=`${index+1} / ${tabs.length}`;document.querySelector('.settings-scroll').scrollTop=0;}
  tabs.forEach((tab,index)=>{
    tab.setAttribute('role','tab');tab.id='tab-'+tab.dataset.tab;tab.setAttribute('aria-controls','panel-'+tab.dataset.tab);
    const panel=document.querySelector(`[data-panel="${tab.dataset.tab}"]`);panel.id='panel-'+tab.dataset.tab;panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby',tab.id);
    tab.addEventListener('click',sync);
    tab.addEventListener('keydown',event=>{const rtl=document.documentElement.dir==='rtl';const direction=event.key==='ArrowRight'?(rtl?-1:1):event.key==='ArrowLeft'?(rtl?1:-1):0;if(direction){event.preventDefault();const next=tabs[(index+direction+tabs.length)%tabs.length];next.click();next.focus();}});
  });
  document.querySelector('.tabs').setAttribute('role','tablist');
  nav.querySelector('#previousPanel').onclick=()=>{const index=tabs.findIndex(tab=>tab.classList.contains('active'));tabs[Math.max(0,index-1)].click();};
  nav.querySelector('#nextPanel').onclick=()=>{const index=tabs.findIndex(tab=>tab.classList.contains('active'));tabs[Math.min(tabs.length-1,index+1)].click();};
  new MutationObserver(sync).observe(document.querySelector('.tabs'),{attributes:true,attributeFilter:['class'],subtree:true});sync();
}
