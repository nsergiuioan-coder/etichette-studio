/* Playwright: Microsoft e collaboratori — https://github.com/microsoft/playwright */
const {chromium}=require('playwright-core');
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../dist'),out=path.resolve(__dirname,'fixtures');
fs.mkdirSync(out,{recursive:true});
const server=http.createServer((request,response)=>{
  const file=path.resolve(root,'.'+(request.url==='/'?'/index.html':request.url.split('?')[0]));
  if(!file.startsWith(root+path.sep)){response.writeHead(403).end();return;}
  fs.readFile(file,(error,data)=>{if(error){response.writeHead(404).end();return;}response.setHeader('Content-Type',({'.js':'application/javascript','.mjs':'application/javascript','.css':'text/css','.html':'text/html','.ttf':'font/ttf'})[path.extname(file)]||'application/octet-stream');response.end(data);});
});
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const browser=await chromium.launch({channel:'msedge',headless:true});
  try{
    const page=await browser.newPage({viewport:{width:1440,height:960}}),errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.addInitScript(()=>{
      window.files={};window.appendCount=0;
      window.__TAURI_INTERNALS__={invoke:async(command,args)=>{
        if(command==='plugin:app|version')return '1.1.0';
        if(command==='plugin:updater|check')return null;
        if(command==='plugin:dialog|open')return 'C:/test';
        if(command==='begin_export')return 'C:/test/output';
        if(command==='write_text'){files[args.name]=args.text;return;}
        if(command==='append_text'){files[args.name]+=args.text;appendCount++;return;}
        throw Error('Unexpected native command: '+command);
      }};
    });
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.waitForSelector('#labelPreview svg');await page.waitForSelector('#openHistory');
    await page.locator('[data-tab="format"]').click();
    assert.equal(await page.locator('[data-key="width"]').getAttribute('aria-description'),'mm');
    assert.equal(await page.locator('[data-key="width"]').locator('..').locator('.field-unit').textContent(),'mm');
    await page.locator('#nextPanel').click();assert.equal(await page.locator('.tabs .active').getAttribute('data-tab'),'design');
    await page.locator('[data-tab="data"]').click();await page.locator('[data-key="quantity"]').fill('1000000');await page.locator('[data-key="digits"]').fill('8');
    await page.waitForFunction(()=>document.querySelector('#totalMetric').textContent.replace(/\D/g,'')==='1000000');
    await page.locator('#lastLabel').click();await page.waitForFunction(()=>document.querySelector('#currentValue').textContent==='01000000');
    await page.locator('[data-key="quantity"]').fill('100001');await page.locator('[data-tab="export"]').click();await page.locator('#exportFormat').selectOption('txt');
    await page.locator('#exportButton').click();await page.waitForFunction(()=>Object.keys(files).some(name=>name.endsWith('.txt')&&name!=='Specifiche.txt')&&Boolean(files['Specifiche.txt']));
    const text=await page.evaluate(()=>Object.entries(files).find(([name])=>name.endsWith('.txt')&&name!=='Specifiche.txt')[1]);
    const values=text.split('\r\n');assert.equal(values.length,100001);assert.equal(values[0],'00000001');assert.equal(values.at(-1),'00100001');assert(await page.evaluate(()=>appendCount)>10);
    for(const format of ['csv','json']){
      const result=await page.evaluate(async format=>{window.files={};const result=await window.studio.export({...window.EtichetteEngine.DEFAULTS,format,quantity:100001,digits:8});const text=Object.entries(files).find(([name])=>name.endsWith('.'+format))[1];if(format==='json'){const data=JSON.parse(text);return {total:result.total,rows:data.etichette.length,last:data.etichette.at(-1).valore};}const lines=text.trim().split('\r\n');return {total:result.total,rows:lines.length-1,last:lines.at(-1).split(';')[2].replaceAll('"','')};},format);
      assert.deepEqual(result,{total:100001,rows:100001,last:'00100001'});
    }
    await page.locator('#openHistory').click();await page.waitForFunction(()=>document.querySelectorAll('.history-card').length===3);assert.equal(await page.locator('.history-card').count(),3);
    await page.locator('#searchHistory').fill('00100001');assert.equal(await page.locator('.history-card').count(),3);
    await page.locator('#closeHistory').click();await page.reload();await page.waitForSelector('#openHistory');await page.locator('#openHistory').click();await page.waitForSelector('.history-card');
    await page.locator('.history-card button.primary').first().click();await page.waitForFunction(()=>document.querySelector('[data-key="quantity"]').value==='100001');
    await page.locator('[data-key="quantity"]').fill('1000');await page.locator('[data-tab="export"]').click();await page.locator('#exportFormat').selectOption('svg');
    await page.evaluate(()=>{window.files={};window.appendCount=0;});
    const start=Date.now();await page.locator('#exportButton').click();await page.waitForFunction(()=>Boolean(files['Specifiche.txt']),{},{timeout:60000});
    const svg=await page.evaluate(()=>Object.entries(files).find(([name])=>name.endsWith('.svg'))?.[1]);assert(svg?.includes('NIS'));assert.equal((svg.match(/<g transform="translate\(/g)||[]).length,1000);
    fs.writeFileSync(path.join(out,'streamed-1000.svg'),svg);
    console.log('Parallel SVG export, 1,000 labels:',Date.now()-start,'ms');
    await page.locator('#openHistory').click();await page.waitForFunction(()=>document.querySelectorAll('.history-card').length===4);await page.locator('#closeHistory').click();
    await page.locator('[data-tab="data"]').click();await page.locator('#presetInventory').click();
    const languages=await page.evaluate(()=>window.EtichetteI18n.languages);
    for(const language of languages){
      await page.setViewportSize({width:1020,height:740});await page.locator('#languageSelect').selectOption(language);await page.waitForTimeout(100);
      assert.equal(await page.getAttribute('html','dir'),['ar','ur'].includes(language)?'rtl':'ltr');
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,language+' page overflow');
      const badButtons=await page.locator('.header-actions button,.tabs button,.panel-navigation button').evaluateAll(buttons=>buttons.filter(button=>button.scrollWidth>button.clientWidth+2||button.scrollHeight>button.clientHeight+2).map(button=>button.id||button.textContent));
      assert.deepEqual(badButtons,[],language+' clipped buttons');
      assert(!await page.locator('#exportSummary').textContent().then(text=>text.includes('{')));
      if(['it','en','de','ar','bn'].includes(language))await page.screenshot({path:path.join(out,'ui-'+language+'.png')});
    }
    await page.locator('#languageSelect').selectOption('en');await page.waitForTimeout(100);
    assert.equal(await page.locator('#openHistory').textContent(),'↶History');
    await page.locator('#checkUpdates').click();await page.waitForFunction(()=>document.querySelector('#updateStatus').textContent.includes('latest'));
    await page.locator('#disableUpdates').click();assert.equal(await page.evaluate(()=>localStorage.getItem('etichette-studio-auto-updates')),'false');
    await page.locator('#languageSelect').selectOption('it');await page.setViewportSize({width:1440,height:960});await page.locator('[data-tab="design"]').click();
    await page.locator('#labelPreview [data-edit="header"]').click();assert.equal(await page.locator('.inline-editor .field-unit').count(),3);await page.locator('.inline-value').fill('NIS test');await page.locator('.inline-apply').click();
    await page.waitForFunction(()=>document.querySelector('[data-key="header"]').value==='NIS test');
    await page.screenshot({path:path.join(out,'ui-final.png')});
    assert.deepEqual(errors,[]);
    console.log('UI: million-label preview, streamed 100,001-value export, real worker SVG generation, persistent history, reopen, units, navigation, 14 languages, RTL and small-window layout passed.');
  }finally{await browser.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
