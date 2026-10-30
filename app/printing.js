/* Tauri: Tauri Programme e collaboratori — https://github.com/tauri-apps/tauri
   Sistema di stampa Windows/WebView2: Microsoft — https://learn.microsoft.com/microsoft-edge/webview2/how-to/print */
import {invoke} from '@tauri-apps/api/core';
import * as E from '../src/engine-browser.js';
export async function printJob(input,all=false){const c=E.config(input),values=E.valueSource(c);const list=all?values:values.slice(0,1);const layout=all&&c.layout==='sheet'?'sheet':'single';const plans=E.pageSource({...c,layout},list);let html='';for(let i=0;i<plans.length;i++){const scene=E.compose({...c,layout},list,plans[i]);html+=`<section class="print-page">${E.sceneSVG(scene).replace(/<\?xml[^>]+>/,'')}</section>`;if(i%20===0)await new Promise(r=>setTimeout(r,0));}await invoke('prepare_print',{html,width:plans[0].width,height:plans[0].height});window.dispatchEvent(new CustomEvent('studio-created',{detail:{config:c,total:list.length,first:list[0],last:list.at(-1),kind:'print',format:'print',files:plans.length}}));}
export async function printerList(){return invoke('list_printers');}
export async function printerSettings(){return invoke('printer_settings');}
