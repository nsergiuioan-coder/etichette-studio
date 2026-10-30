/* Playwright: Microsoft e collaboratori — https://github.com/microsoft/playwright
   esbuild: Evan Wallace — https://github.com/evanw/esbuild */
const {chromium}=require('playwright-core');
const esbuild=require('esbuild');
const http=require('node:http');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const bundle=esbuild.buildSync({entryPoints:[path.join(root,'app/updates.js')],bundle:true,write:false,format:'iife',globalName:'Updater',platform:'browser'}).outputFiles[0].text;
const server=http.createServer((request,response)=>{response.setHeader('Content-Type','text/html');response.end('<!doctype html><html><body><div class="header-actions"></div><span class="version"></span><input id="work" value="project"></body></html>');});
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const browser=await chromium.launch({channel:'msedge',headless:true});
  try{
    const page=await browser.newPage();
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.addScriptTag({content:bundle});
    await page.evaluate(()=>{
      window.calls={check:0,download:0,install:0,closed:0};
      window.result='update';window.block=false;
      window.app=Updater.initUpdater({initialDelay:10,interval:1000000,getVersion:async()=>'1.1.0',prepareInstall:()=>{if(window.block)throw Error('busy');},check:async()=>{
        calls.check++;if(result==='network')throw Error('offline');if(result==='none')return null;
        return {version:'1.2.0',currentVersion:'1.1.0',body:'Release notes',close:async()=>{calls.closed++;},download:async callback=>{calls.download++;callback({event:'Started',data:{contentLength:10}});callback({event:'Progress',data:{chunkLength:10}});callback({event:'Finished'});if(result==='bad-signature')throw Error('signature');if(result==='late-busy')window.block=true;},install:async options=>{calls.install++;window.restart=options.restartAfterInstall;}};
      }});
    });
    await page.waitForSelector('#updateNotice:not([hidden])');
    assert.equal(await page.locator('#updateVersion').textContent(),'v1.1.0 → v1.2.0');
    await page.locator('#work').fill('still editable');assert.equal(await page.evaluate(()=>calls.install),0);
    await page.locator('#laterUpdate').click();assert(await page.locator('#updateNotice').getAttribute('hidden')!==null);
    await page.locator('#checkUpdates').click();await page.waitForSelector('#installUpdate:not([hidden])');
    await page.locator('#disableUpdates').click();
    assert.equal(await page.evaluate(()=>localStorage.getItem('etichette-studio-auto-updates')),'false');
    const calls=await page.evaluate(()=>window.calls.check);await page.evaluate(()=>app.check());assert.equal(await page.evaluate(()=>window.calls.check),calls);
    await page.evaluate(()=>{app.destroy();app=Updater.initUpdater({initialDelay:1,interval:1000000,getVersion:async()=>'1.1.0',check:async()=>{window.calls.check++;return null;}});});
    await page.waitForTimeout(50);assert.equal(await page.evaluate(()=>window.calls.check),calls);
    await page.locator('#checkUpdates').click();await page.waitForFunction(()=>document.querySelector('#updateStatus').textContent.includes('più recente'));
    await page.locator('#automaticUpdates').check();assert.equal(await page.evaluate(()=>localStorage.getItem('etichette-studio-auto-updates')),'true');
    await page.evaluate(()=>app.destroy());
    await page.reload();await page.addScriptTag({content:bundle});
    await page.evaluate(()=>{
      window.result='network';window.calls={check:0,download:0,install:0};window.block=false;
      window.app=Updater.initUpdater({initialDelay:1,interval:1000000,getVersion:async()=>'1.1.0',prepareInstall:()=>{if(block)throw Error('busy');},check:async()=>{calls.check++;if(result==='network')throw Error('offline');return {version:'1.2.0',currentVersion:'1.1.0',close:async()=>{},download:async()=>{calls.download++;if(result==='bad-signature')throw Error('invalid signature');if(result==='late-busy')window.block=true;},install:async opts=>{calls.install++;window.restart=opts.restartAfterInstall;}};}});
    });
    await page.waitForTimeout(80);assert(await page.locator('#updateNotice').getAttribute('hidden')!==null);
    await page.locator('#checkUpdates').click();await page.waitForFunction(()=>document.querySelector('#updateStatus').textContent.includes('connessione'));
    await page.evaluate(()=>{result='update';block=true;});await page.locator('#checkUpdates').click();await page.waitForSelector('#installUpdate:not([hidden])');
    await page.locator('#installUpdate').click();assert.equal(await page.locator('#updateConfirm').evaluate(el=>el.open),false);assert.equal(await page.locator('#updateStatus').textContent(),'busy');
    await page.evaluate(()=>{block=false;result='bad-signature';});await page.locator('#installUpdate').click();assert.equal(await page.locator('#updateConfirm').evaluate(el=>el.open),true);assert.equal(await page.evaluate(()=>calls.download),0);
    await page.locator('#confirmUpdate').click();await page.waitForFunction(()=>document.querySelector('#updateStatus').textContent.includes('non installato'));assert.equal(await page.evaluate(()=>calls.install),0);
    await page.evaluate(()=>result='late-busy');await page.locator('#checkUpdates').click();await page.waitForSelector('#installUpdate:not([hidden])');await page.locator('#installUpdate').click();await page.locator('#confirmUpdate').click();await page.waitForFunction(()=>document.querySelector('#updateStatus').textContent.includes('non installato'));assert.equal(await page.evaluate(()=>calls.install),0);
    await page.evaluate(()=>{result='update';block=false;});await page.locator('#checkUpdates').click();await page.waitForSelector('#installUpdate:not([hidden])');await page.locator('#installUpdate').click();await page.locator('#confirmUpdate').click();await page.waitForFunction(()=>calls.install===1);assert.equal(await page.evaluate(()=>restart),true);
    await page.evaluate(()=>app.destroy());
    console.log('Updater: notification, defer, persistent opt-out, manual check, offline behavior, save confirmation, busy operation and failed verification paths passed.');
  }finally{await browser.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
