from pathlib import Path
from html.parser import HTMLParser
from concurrent.futures import ThreadPoolExecutor,as_completed
import urllib.request,urllib.parse,json,re,time,sys
sys.stdout.reconfigure(encoding='utf-8')
root=Path(__file__).resolve().parent
class Labels(HTMLParser):
    def __init__(self):super().__init__();self.skip=0;self.items=[]
    def handle_starttag(self,tag,attrs):
        if tag in ['script','style']:self.skip+=1
        for key,value in attrs:
            if key in ['title','placeholder','aria-label'] and value:self.items.append(value.strip())
    def handle_endtag(self,tag):
        if tag in ['script','style']:self.skip=max(0,self.skip-1)
    def handle_data(self,text):
        text=text.strip()
        if not self.skip and text and any(c.isalpha() for c in text):self.items.append(text)
items=[]
for file in ['app/index.html','app/print.html']:
    parser=Labels();parser.feed((root/file).read_text(encoding='utf-8'));items+=parser.items
for file in ['app/renderer.js','app/import-design.js','app/updates.js','app/history.js','app/navigation.js','src/engine.cjs']:
    source=(root/file).read_text(encoding='utf-8')
    for match in re.finditer(r"'((?:[^'\\]|\\.)*)'",source):
        text=match.group(1)
        if '<' in text and '>' in text:
            fragment=Labels();fragment.feed(text);items+=fragment.items
        if len(text)>6 and ' ' in text and not any(t in text for t in ['<','>','{','}','=>','querySelector','data-','\\','=','function',';','path','./']):items.append(text)
items+=['Lingua','Modifica intestazione','Modifica valore','Applica','Annulla','Grassetto','Posizione orizzontale','Continua comunque','Continua senza codice a barre','Modifica','Attenzione','Esportazione completata','Configurazione valida','Da verificare','Correggere prima di esportare','Codice a barre non generabile: continuando verrà esportata la grafica senza quel codice.','Nome file','Stampa','etichetta','etichette','file','di','millimetri · scala 100%','Un valore per riga','Rileva tutte le stampanti','Importa design','Il progetto contiene avvisi. Vuoi continuare comunque?','Vettoriale, misure reali.','Immagine alla risoluzione impostata.','Dati senza impaginazione.','Comandi per stampanti compatibili.','Nessuna sovrapposizione rilevata.','Cerca un formato…']
items+=['di {count}','{files} file {format} · {count} etichette','{count} etichette per bobina','{count} formati di codice','{done} di {total} completati','Esportazione completata: {files} file, {count} etichette.','Codice {width} × {height} mm · modulo {module} mm · nessun elemento fuori formato.','Zona libera inferiore a {size} mm: verificare lo standard del codice.','Formato rilevato: {width} × {height} mm','Pagina PDF (1–{pages})','Immagine: {width} × {height} pixel. Verrà usato il formato attuale dell’etichetta.']
keys=list(dict.fromkeys(s for s in items if len(s)<700 and s not in ['A4','A3','SVG','PDF','Etichette Studio','ETICHETTE','STUDIO','OFFLINE','NIS','mm']))
languages=['en','es','fr','pt','de','ru','zh-CN','hi','bn','ar','ur','id','ja']
dest=root/'assets/translations.json'
existing=json.loads(dest.read_text(encoding='utf-8'))if dest.exists()else{}
def translate(lang):
    mapping=existing.get(lang,{})
    mapping={key:value for key,value in mapping.items() if sorted(re.findall(r'\{\w+\}',key))==sorted(re.findall(r'\{\w+\}',value))}
    def protect(key):
        count=iter(range(100))
        return re.sub(r'\{\w+\}',lambda match:f'ZXQ{next(count)}QXZ',key)
    def restore(key,value):
        placeholders=re.findall(r'\{\w+\}',key)
        value=re.sub(r'ZXQ\s*(\d+)\s*QXZ',lambda match:placeholders[int(match.group(1))]if int(match.group(1))<len(placeholders)else match.group(0),value,flags=re.I)
        if sorted(re.findall(r'\{\w+\}',key))!=sorted(re.findall(r'\{\w+\}',value)):
            parts=re.split(r'(\{\w+\})',key)
            for position,part in enumerate(parts):
                if not part.strip() or re.fullmatch(r'\{\w+\}',part):continue
                url='https://translate.googleapis.com/translate_a/single?'+urllib.parse.urlencode({'client':'gtx','sl':'it','tl':lang,'dt':'t','q':part})
                with urllib.request.urlopen(url,timeout=20)as response:data=json.load(response)
                translated=''.join(item[0]or''for item in data[0])
                parts[position]=(' 'if part.startswith(' ')else'')+translated.strip()+(' 'if part.endswith(' ')else'')
            value=''.join(parts)
        return value
    pending=[(i,key)for i,key in enumerate(keys)if key not in mapping]
    batches=[];batch=[];length=0
    for i,key in pending:
        if length+len(key)>3000 and batch:batches.append(batch);batch=[];length=0
        batch.append((i,key));length+=len(key)+15
    if batch:batches.append(batch)
    for batch in batches:
        text='\n'.join(f'{i}|||{protect(key)}'for i,key in batch)
        url='https://translate.googleapis.com/translate_a/single?'+urllib.parse.urlencode({'client':'gtx','sl':'it','tl':lang,'dt':'t','q':text})
        for attempt in range(3):
            try:
                with urllib.request.urlopen(url,timeout=20)as response:data=json.load(response)
                translated=''.join(part[0]or''for part in data[0])
                found={int(i):v.strip()for i,v in re.findall(r'(\d+)\s*\|\s*\|\s*\|\s*(.*?)(?=\n\s*\d+\s*\|\s*\|\s*\||\Z)',translated,re.S)}
                for i,key in batch:
                    if i in found:
                        mapping[key]=restore(key,found[i])
                    else:
                        single='https://translate.googleapis.com/translate_a/single?'+urllib.parse.urlencode({'client':'gtx','sl':'it','tl':lang,'dt':'t','q':protect(key)})
                        with urllib.request.urlopen(single,timeout=20)as response:part=json.load(response)
                        mapping[key]=restore(key,''.join(v[0]or''for v in part[0]))
                break
            except Exception:
                if attempt==2:raise
                time.sleep(.5)
    return lang,mapping
results={**existing,'it':{key:key for key in keys}}
with ThreadPoolExecutor(max_workers=4)as pool:
    for future in as_completed([pool.submit(translate,language)for language in languages]):
        lang,mapping=future.result();results[lang]=mapping;print(lang,len(mapping),flush=True)
dest.write_text(json.dumps(results,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
print('Lingue totali',len(results),'testi',len(keys),flush=True)
