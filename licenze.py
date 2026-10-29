from pathlib import Path
import json
import tomllib
import shutil

root=Path(__file__).resolve().parent
out=root/'assets/LICENZE'
out.mkdir(exist_ok=True)
lines=['ETICHETTE STUDIO - AUTORI E LICENZE','',
       'Il codice applicativo è stato scritto per questo progetto.',
       'La generazione dei codici, i caratteri, il runtime e alcuni formati usano librerie open source.',
       'Le licenze originali sono incluse nella cartella LICENZE e riportate sotto.', '',
       'bwip-js: Mark Warren - https://github.com/metafloor/bwip-js',
       'Barcode Writer in Pure PostScript (BWIPP): Terry Burton - https://github.com/bwipp/postscriptbarcode',
       'Tauri Programme e collaboratori - https://github.com/tauri-apps/tauri',
       'Bitstream Vera: Bitstream Inc. - https://www.gnome.org/fonts/', '']
for name in ['@bwip-js/browser','bwip-js','opentype.js','svgpath','csv-parse','@tauri-apps/api','@tauri-apps/plugin-dialog','@tauri-apps/plugin-opener','@xmldom/xmldom','pdfkit','sharp','esbuild','pdfjs-dist']:
    folder=root/'node_modules'/name
    data=json.loads((folder/'package.json').read_text(encoding='utf-8'))
    dest=out/name.replace('/','_')
    dest.mkdir(exist_ok=True)
    repository=data.get('repository',{})
    if isinstance(repository,dict):repository=repository.get('url','')
    lines.extend([f"{name} {data['version']}",f"Autore: {data.get('author','Collaboratori del progetto')}",f"Progetto: {repository or data.get('homepage','')}",f"Licenza: {data.get('license','Vedere testo originale')}"])
    for pattern in ['LICENSE*','LICENCE*','COPYING*','NOTICE*']:
        for file in folder.glob(pattern):
            if file.is_file():
                shutil.copy2(file,dest/file.name)
                lines.append(file.read_text(encoding='utf-8',errors='replace'))
    lines.append('')
font=root/'assets/bitstream-vera-license.txt'
shutil.copy2(font,out/font.name)
lines.append(font.read_text())
lines.extend(['Traduzioni iniziali interfaccia assistite da Google Translate, archiviate localmente.','https://translate.google.com/'])
lock=root/'src-tauri/Cargo.lock'
if lock.exists():
    packages=tomllib.loads(lock.read_text())['package']
    registries=list((Path.home()/'.cargo/registry/src').glob('*'))
    for package in packages:
        for registry in registries:
            folder=registry/f"{package['name']}-{package['version']}"
            if not folder.exists():continue
            cargo=tomllib.loads((folder/'Cargo.toml').read_text(encoding='utf-8'))['package']
            lines.extend([f"{package['name']} {package['version']}",f"Autori: {', '.join(cargo.get('authors',[])) or 'Collaboratori del progetto'}",f"Progetto: {cargo.get('repository',cargo.get('homepage',''))}",f"Licenza: {cargo.get('license','Vedere file originali')}"])
            dest=out/f"rust_{package['name']}_{package['version']}"
            for pattern in ['LICENSE*','LICENCE*','COPYING*','NOTICE*']:
                for file in folder.glob(pattern):
                    if file.is_file():
                        dest.mkdir(exist_ok=True)
                        shutil.copy2(file,dest/file.name)
                        lines.append(file.read_text(encoding='utf-8',errors='replace'))
            lines.append('')
            break
(root/'assets/ATTRIBUZIONI.txt').write_text('\n'.join(lines),encoding='utf-8')
print('Attribuzioni e licenze conservate:',len(lines),'voci.')
