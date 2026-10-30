const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..'),version=process.argv[2];
if(!/^\d+\.\d+\.\d+$/.test(version||''))throw Error('Usage: node scripts/version.cjs 1.2.0');
for(const name of ['package.json','src-tauri/tauri.conf.json']){const file=path.join(root,name),data=JSON.parse(fs.readFileSync(file,'utf8'));data.version=version;fs.writeFileSync(file,JSON.stringify(data,null,2)+'\n');}
for(const name of ['src-tauri/Cargo.toml','src-tauri/Cargo.lock']){const file=path.join(root,name);let data=fs.readFileSync(file,'utf8');data=name.endsWith('Cargo.toml')?data.replace(/^(version = ")[^"]+/m,'$1'+version):data.replace(/(name = "etichette-studio"\nversion = ")[^"]+/,'$1'+version);fs.writeFileSync(file,data);}
const bridge=path.join(root,'app/bridge.js');fs.writeFileSync(bridge,fs.readFileSync(bridge,'utf8').replace(/version:'\d+\.\d+\.\d+'/g,`version:'${version}'`));
const html=path.join(root,'app/index.html');fs.writeFileSync(html,fs.readFileSync(html,'utf8').replace(/Windows · v\d+\.\d+\.\d+/g,'Windows · v'+version));
console.log('Version set to',version);
