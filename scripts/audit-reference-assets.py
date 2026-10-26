"""Audit existing reference fallback availability without copying new official artwork."""
import json,urllib.request,datetime,io,sys
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor,as_completed
from PIL import Image
ROOT=Path(__file__).resolve().parents[1];path=ROOT/'public/catalog/pokemon-assets.json';m=json.loads(path.read_text());cache_path=ROOT/'.qa/catalog-assets/reference-availability.json';cache=json.loads(cache_path.read_text()) if cache_path.exists() else {}
def audit(e):
 key=str(e['id'])
 if key in cache and not (ROOT/'public/pokemon'/f"{e['id']}-art.png").exists():return key,cache[key]
 local=ROOT/'public/pokemon'/f"{e['id']}-art.png"
 if local.exists():
  with Image.open(local) as im:im.load();size=list(im.size)
  return key,{'availability':'bundled-parsed','path':'/pokemon/'+local.name,'size':size,'validation':'Existing bundled PNG decoded; no new reference artwork copied.'}
 if '--offline' in sys.argv:return key,{'availability':'unverified-reference','validation':'No cached reference audit; offline mode does not request remote artwork.'}
 urls=[f"https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/{e['id']}.png",f"https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/{e['id']}.png"]
 attempts=[]
 for url in urls:
  try:
   with urllib.request.urlopen(urllib.request.Request(url,method='HEAD',headers={'User-Agent':'GhostShiftReferenceAudit/1.0'}),timeout=12) as r:
    if r.status==200:return key,{'availability':'remote-head-verified','path':url,'validation':'HTTP HEAD availability only; remote artwork not decoded or redistributed.','checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat()}
  except Exception as ex:attempts.append(str(ex))
 return key,{'availability':'missing-reference' if all('404'in s or '410'in s for s in attempts) else 'unverified-reference','attempts':attempts,'validation':'Reference asset unavailable or network status unknown; exact ID placeholder remains usable.'}
entries=[e for e in m['entries'] if e['representation']=='portrait']
with ThreadPoolExecutor(max_workers=8) as pool:
 for i,f in enumerate(as_completed([pool.submit(audit,e) for e in entries]),1):
  k,v=f.result();cache[k]=v
  if i%100==0:print('REFERENCES '+str(i)+'/'+str(len(entries)),flush=True)
for e in entries:e['referenceArtwork'].update(cache[str(e['id'])])
cache_path.write_text(json.dumps(cache,indent=2));temp=path.with_suffix('.json.tmp');temp.write_text(json.dumps(m,separators=(',',':')));temp.replace(path)
report={'checkedEntries':len(entries),'availability':{k:sum(cache[str(e['id'])]['availability']==k for e in entries) for k in sorted({cache[str(e['id'])]['availability'] for e in entries})},'entries':[{'id':e['id'],'name':e['name'],**cache[str(e['id'])]} for e in entries]};(ROOT/'reports/reference-artwork-availability.json').write_text(json.dumps(report,indent=2));print('RESULT '+json.dumps({k:v for k,v in report.items() if k!='entries'}))
