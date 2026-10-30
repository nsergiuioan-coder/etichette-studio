from pathlib import Path
import argparse,datetime,hashlib,json,os,subprocess,urllib.request,urllib.parse,urllib.error

root=Path(__file__).resolve().parent.parent
parser=argparse.ArgumentParser()
parser.add_argument('--installer',required=True)
parser.add_argument('--commit',default=os.environ.get('GITHUB_SHA','main'))
args=parser.parse_args()
version=json.loads((root/'package.json').read_text())['version']
assert json.loads((root/'src-tauri/tauri.conf.json').read_text())['version']==version
assert not os.environ.get('GITHUB_REF_NAME','').startswith('v') or os.environ['GITHUB_REF_NAME']=='v'+version
installer=Path(args.installer).resolve()
signature=Path(str(installer)+'.sig').read_text().strip()
assert installer.stat().st_size>1000000 and signature
repository=os.environ.get('GITHUB_REPOSITORY','nsergiuioan-coder/etichette-studio')
token=os.environ.get('GITHUB_TOKEN')
if not token:
    credential=subprocess.run(['git','credential','fill'],input='protocol=https\nhost=github.com\n\n',text=True,capture_output=True,check=True,env={**os.environ,'GCM_INTERACTIVE':'Never','GIT_TERMINAL_PROMPT':'0'})
    token=dict(line.split('=',1)for line in credential.stdout.splitlines()if '='in line)['password']
headers={'Authorization':'Bearer '+token,'Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','User-Agent':'Etichette-Studio-Release'}
def api(url,method='GET',data=None,raw=None,content_type='application/json'):
    if data is not None:raw=json.dumps(data).encode()
    request=urllib.request.Request(url,data=raw,method=method,headers={**headers,'Content-Type':content_type})
    try:
        with urllib.request.urlopen(request,timeout=120)as response:
            body=response.read()
            return json.loads(body)if body else None
    except urllib.error.HTTPError as error:
        raise RuntimeError(f'GitHub request failed: HTTP {error.code}')from None
base='https://api.github.com/repos/'+repository
filename='Etichette_Studio_Setup_Windows_x64.exe'
notes_file=root/'releases'/f'{version}.md'
notes=notes_file.read_text(encoding='utf-8')if notes_file.exists()else f'Etichette Studio {version}\n\nDownload the Windows installer below.\n\nVibe coded.'
try:release=api(base+'/releases/tags/v'+version)
except RuntimeError as error:
    if 'HTTP 404'not in str(error):raise
    release=api(base+'/releases','POST',{'tag_name':'v'+version,'target_commitish':args.commit,'name':'Etichette Studio '+version,'body':notes,'draft':True,'prerelease':False})
if not release['draft']:raise RuntimeError('This version is already public. Use a new version instead of replacing published updates.')
manifest={'version':version,'notes':notes,'pub_date':datetime.datetime.now(datetime.timezone.utc).isoformat(),'platforms':{'windows-x86_64':{'signature':signature,'url':f'https://github.com/{repository}/releases/download/v{version}/{filename}'}}}
digest=hashlib.sha256(installer.read_bytes()).hexdigest()
files={filename:installer.read_bytes(),filename+'.sig':(signature+'\n').encode(),'latest.json':(json.dumps(manifest,indent=2)+'\n').encode(),'SHA256SUMS.txt':f'{digest}  {filename}\n'.encode()}
for asset in api(release['assets_url']):
    if asset['name']in files:api(asset['url'],'DELETE')
for name,data in files.items():
    url=release['upload_url'].split('{')[0]+'?'+urllib.parse.urlencode({'name':name})
    asset=api(url,'POST',raw=data,content_type='application/octet-stream')
    assert asset['state']=='uploaded'and asset['size']==len(data)
    if name==filename and asset.get('digest'):assert asset['digest']=='sha256:'+digest
api(release['url'],'PATCH',{'draft':False,'make_latest':'true'})
print('Published:',release['html_url'])
print('SHA-256:',digest)
