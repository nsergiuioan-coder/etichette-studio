/* esbuild: Evan Wallace — https://github.com/evanw/esbuild
   Le librerie incluse sono elencate con autori e licenze in assets/ATTRIBUZIONI.txt. */
const fs=require('fs');
const path=require('path');
const esbuild=require('esbuild');
const root=__dirname;
let source=fs.readFileSync(path.join(root,'src/engine.cjs'),'utf8');
source=source.slice(source.indexOf('const DEFAULTS='));
source=source.replace('module.exports={','export {');
const prefix=`/* bwip-js: Mark Warren; BWIPP: Terry Burton — https://github.com/metafloor/bwip-js
opentype.js: Frederik De Bleser — https://github.com/opentypejs/opentype.js
svgpath: Vitaly Puzrin — https://github.com/fontello/svgpath
csv-parse: David Worms, Adaltas — https://github.com/adaltas/node-csv
Bitstream Vera: Bitstream Inc. — https://www.gnome.org/fonts/ */
import bwip from '@bwip-js/browser';
import * as opentype from 'opentype.js';
import svgpath from 'svgpath';
import {parse} from 'csv-parse/browser/esm/sync';
import normalFont from '../assets/Vera.ttf';
import boldFont from '../assets/VeraBd.ttf';
const FONT=opentype.parse(normalFont.buffer);
const BOLD=opentype.parse(boldFont.buffer);
`;
fs.writeFileSync(path.join(root,'src/engine-browser.js'),prefix+source);
let vectors=fs.readFileSync(path.join(root,'src/exporters.cjs'),'utf8');
vectors=vectors.slice(vectors.indexOf('function cubicSegments'),vectors.indexOf('async function mono'));
vectors=vectors.replace(/const \{data,info\}=await sharp\(Buffer\.from\(e\.href\.split\(','\)\[1\],'base64'\)\)\.flatten\(\{background:'#ffffff'\}\)\.removeAlpha\(\)\.toColourspace\('srgb'\)\.raw\(\)\.toBuffer\(\{resolveWithObject:true\}\);const hex=data\.toString\('hex'\);/,`const {data,info}=await imagePixels(e.href);const hex=Array.from(data,v=>v.toString(16).padStart(2,'0')).join('');`);
if(vectors.includes('sharp(')||vectors.includes('Buffer.'))throw Error('Conversione vettoriale browser incompleta');
fs.writeFileSync(path.join(root,'src/vector-browser.js'),`/* svgpath: Vitaly Puzrin — https://github.com/fontello/svgpath */\nimport svgpath from 'svgpath';\nimport * as E from './engine-browser.js';\nconst MM=72/25.4;\nconst rgb=hex=>[1,3,5].map(i=>parseInt(hex.substring(i,i+2),16)/255);\nasync function imagePixels(href){const img=new Image();img.src=href;await img.decode();const canvas=document.createElement('canvas');canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;const ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0);const rgba=ctx.getImageData(0,0,canvas.width,canvas.height).data;const data=new Uint8Array(canvas.width*canvas.height*3);for(let i=0,j=0;i<rgba.length;i+=4){data[j++]=rgba[i];data[j++]=rgba[i+1];data[j++]=rgba[i+2];}return {data,info:{width:canvas.width,height:canvas.height}};}\n`+vectors+'\nexport {postscript,dxf};\n');
fs.mkdirSync(path.join(root,'dist'),{recursive:true});
fs.copyFileSync(path.join(root,'node_modules/pdfjs-dist/build/pdf.worker.min.mjs'),path.join(root,'dist/pdf.worker.min.mjs'));
for(const folder of ['cmaps','standard_fonts','wasm'])fs.cpSync(path.join(root,'node_modules/pdfjs-dist',folder),path.join(root,'dist',folder),{recursive:true});
for(const name of ['style.css','print.html'])fs.copyFileSync(path.join(root,'app',name),path.join(root,'dist',name));
fs.appendFileSync(path.join(root,'dist/style.css'),'\n'+fs.readFileSync(path.join(root,'app/updates.css'),'utf8'));
for(const name of ['Vera.ttf','VeraBd.ttf','ATTRIBUZIONI.txt'])fs.copyFileSync(path.join(root,'assets',name),path.join(root,'dist',name));
let html=fs.readFileSync(path.join(root,'app/index.html'),'utf8').replace('<script src="renderer.js"></script>','<script src="bundle.js"></script>').replace("connect-src 'none'","connect-src ipc: http://ipc.localhost");

fs.writeFileSync(path.join(root,'dist/index.html'),html);
esbuild.build({entryPoints:{bundle:path.join(root,'app/bridge.js'),print:path.join(root,'app/print.js'),'generate-worker':path.join(root,'app/generate-worker.js')},bundle:true,outdir:path.join(root,'dist'),platform:'browser',format:'iife',target:['chrome130'],loader:{'.ttf':'binary','.txt':'text'},external:['fs'],minify:true,legalComments:'linked'}).then(()=>console.log('Interfaccia Tauri compilata.')).catch(error=>{console.error(error);process.exitCode=1;});
