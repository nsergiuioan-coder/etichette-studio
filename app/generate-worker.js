/* bwip-js: Mark Warren — https://github.com/metafloor/bwip-js
   opentype.js: Frederik De Bleser — https://github.com/opentypejs/opentype.js
   xmldom: Christopher J. Brody, jindw e collaboratori — https://github.com/xmldom/xmldom */
import * as E from '../src/engine-browser.js';
import {DOMParser} from '@xmldom/xmldom';
globalThis.DOMParser=DOMParser;
let config;const cache=new Map();
self.onmessage=event=>{
  const {id,kind,input,items,plan}=event.data;
  if(kind==='init'){config=input;self.postMessage({id,result:true});return;}
  try{
    let result;
    if(kind==='svg'){
      result=items.map(item=>{let scene=cache.get(item.value);if(!scene){scene=E.label(config,item.value);if(cache.size>=64)cache.delete(cache.keys().next().value);cache.set(item.value,scene);}if(scene.errors.length&&!config.allowWarnings)throw Error(`Etichetta ${item.index+1}: ${scene.errors[0]}`);return `<g transform="translate(${item.x} ${item.y})">${scene.elements.map(E.elementSVG).join('')}</g>`;}).join('');
    }else{
      const values=Object.fromEntries(items.map(item=>[item.index,item.value]));
      result=E.compose(config,values,{...plan,positions:items});
    }
    self.postMessage({id,result});
  }catch(error){self.postMessage({id,error:String(error.message||error)});}
};
