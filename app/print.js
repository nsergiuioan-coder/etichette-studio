/* Tauri: Tauri Programme e collaboratori — https://github.com/tauri-apps/tauri */
import {initI18n} from './localization.js';
import {invoke} from '@tauri-apps/api/core';
invoke('get_print_data').then(text=>{const data=JSON.parse(text);document.getElementById('pages').innerHTML=data.html;document.getElementById('paper').textContent=`@page{size:${data.width}mm ${data.height}mm;margin:0}.print-page{width:${data.width}mm;height:${data.height}mm}`;});
document.getElementById('print').onclick=async()=>{try{await invoke('show_print_ui');}catch(e){document.getElementById('message').textContent=String(e);}};

initI18n();
