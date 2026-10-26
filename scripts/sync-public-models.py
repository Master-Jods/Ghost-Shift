"""Public game-derived GLBs for the user's explicitly chosen non-commercial prototype.
Technical verification is NOT a grant of Pokemon asset rights. No source binaries are executed.
"""
import argparse,concurrent.futures,hashlib,json,math,re,struct,time,urllib.request,urllib.parse
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];CACHE=ROOT/'.qa/model-import';CACHE.mkdir(parents=True,exist_ok=True)
SOURCES={'animated':{'repo':'06wj/pokemon','revision':'00d96f7f18894055e7f1db44fa0df6462e5e4c8a'},'broad':{'repo':'Pokemon-3D-api/assets','revision':'429de1288cea0d43f5b4f56305d2276e94239d65'}}
NOTICE='Public game-derived Pokemon assets, enabled by explicit user choice for a non-commercial prototype. Pokemon/Nintendo/Creatures/Game Freak retain asset rights. Repository code licenses do not license these models; no owner redistribution permission is claimed.'
def readurl(url,headers=None):
 for attempt in range(3):
  try:
   with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'GhostShiftPrototypeAssets/1.0',**(headers or {})}),timeout=35) as r:return r.read()
  except Exception:
   if attempt==2:raise
   time.sleep(.5)
def tree(key,offline):
 s=SOURCES[key];f=CACHE/(key+'-tree.json')
 if not f.exists():
  if offline:raise ValueError('Run online model sync first')
  f.write_bytes(readurl('https://api.github.com/repos/'+s['repo']+'/git/trees/'+s['revision']+'?recursive=1'))
 j=json.loads(f.read_text());assert not j.get('truncated');return {r['path']:r for r in j['tree'] if r['type']=='blob'}
def match(e,files):
 sid=e['speciesId'];name=e['name'];base=e.get('species') or '';prefix='models/opt/'
 # Default PokeAPI variety IDs equal species IDs. Never reuse these for an alternate form.
 if e['id']==sid:return prefix+'regular/'+str(sid)+'.glb'
 for suffix,category in [('alola','alolan'),('galar','galar'),('hisui','hisuian'),('mega','mega'),('mega-x','x'),('mega-y','y'),('primal','primal'),('origin','origin'),('gmax','gmax')]:
  if name==base+'-'+suffix:return prefix+category+'/'+str(sid)+'.glb'
 # Only unambiguous named variants; opaque numeric source suffixes are deliberately not guessed.
 exact={'greninja-ash':'unique/658','necrozma-ultra':'unique/800','eternatus-eternamax':'unique/890','koraidon-sprinting-build':'multiform/Koraidon_Drive','miraidon-aquatic-mode':'multiform/Miraidon_Aquatic','deoxys-attack':'multiform/386-1','deoxys-defense':'multiform/386-2','deoxys-speed':'multiform/386-3','tauros-paldea-combat-breed':'multiform/128-1','tauros-paldea-blaze-breed':'multiform/128-2','tauros-paldea-aqua-breed':'multiform/128-3','eiscue-noice':'multiform/875','gimmighoul-roaming':'multiform/999','rotom-heat':'multiform/RotomHeat','rotom-frost':'multiform/RotomFrost','rotom-fan':'multiform/RotomFan','rotom-mow':'multiform/RotomMow','shaymin-sky':'multiform/ShayminSky','basculin-blue-striped':'multiform/BasculinBlueStripe','lycanroc-midnight':'multiform/LycanrocMidnightForm','lycanroc-dusk':'multiform/LycanrocDuskForm','enamorus-therian':'multiform/EnamorusTherian','wishiwashi-school':'multiform/WishiwashiSchool','kyurem-black':'fusion/Black_Kyurem','kyurem-white':'fusion/White_Kyurem','necrozma-dusk':'fusion/Dusk_Mane','necrozma-dawn':'fusion/Dawn_Wings','calyrex-ice':'fusion/Ice_Rider','calyrex-shadow':'fusion/Shadow_Rider'}
 return prefix+exact[name]+'.glb' if name in exact else None
def clips(g):
 names=[a.get('name','') for a in g.get('animations',[]) if a.get('channels')]
 patterns={'idle':r'(^|[|_ -])(idle|aidle|defaultwait|battlewait|defaultidle|wait[a-z]?|standby)(\d|[|_ .-]|$)','run':r'(^|[|_ -])(run|walk|walking|running|fly|swim)(\d|[|_ .-]|$)','attack':r'(^|[|_ -])(attack|fight|strike|bite|punch|shoot|buturi|tokusyu)(\d|[|_ .-]|$)','hit':r'(^|[|_ -])(hurt|hit|damage|pain)(\d|[|_ .-]|$)','guard':r'(^|[|_ -])(guard|protect|defend|block)(\d|[|_ .-]|$)','resolve':r'(^|[|_ -])(faint|ko|death|die)(\d|[|_ .-]|$)'}
 out={}
 for state,pattern in patterns.items():
  found=[n for n in names if re.search(pattern,n.lower())]
  if found:out[state]=found[0]
 if 'run'in out:out['follow']=out['run']
 return out,names
def metadata(key,path,row,offline):
 src=SOURCES[key];url='https://raw.githubusercontent.com/'+src['repo']+'/'+src['revision']+'/'+urllib.parse.quote(path);f=CACHE/(row['sha']+'.json')
 if not f.exists():
  if offline:raise ValueError('Missing cached GLB header')
  header=readurl(url,{'Range':'bytes=0-19'})
  if header[:4]!=b'glTF' or struct.unpack_from('<I',header,4)[0]!=2 or struct.unpack_from('<I',header,8)[0]!=row['size']:raise ValueError('Invalid GLB2 header/size')
  n,kind=struct.unpack_from('<II',header,12)
  if kind!=0x4e4f534a or n>8*1024*1024 or n+20>row['size']:raise ValueError('Invalid JSON chunk')
  data=header[20:20+n] if len(header)>=20+n else readurl(url,{'Range':f'bytes=20-{19+n}'})
  # A server ignoring Range may return the complete file.
  if data[:4]==b'glTF':data=data[20:20+n]
  g=json.loads(data);f.write_text(json.dumps(g))
 else:g=json.loads(f.read_text())
 if any(v.get('uri')and not v['uri'].startswith('data:')for v in g.get('buffers',[])+g.get('images',[])):raise ValueError('External model resources are not supported')
 if not g.get('images')and all(set(m)<= {'name'}for m in g.get('materials',[])):raise ValueError('Untextured model with placeholder-only materials rejected')
 supported={'KHR_draco_mesh_compression','EXT_texture_webp','KHR_materials_unlit'}
 if set(g.get('extensionsRequired',[]))-supported:raise ValueError('Unsupported required extension')
 positions=[]
 for m in g.get('meshes',[]):
  for p in m.get('primitives',[]):
   a=g['accessors'][p['attributes']['POSITION']];lo=a.get('min');hi=a.get('max')
   if not lo or not hi or len(lo)!=3 or any(not math.isfinite(v)for v in lo+hi)or any(x>y for x,y in zip(lo,hi)):raise ValueError('Invalid position bounds')
   positions.append((lo,hi))
 if not positions:raise ValueError('No model meshes')
 for node in g.get('nodes',[]):
  if any(not math.isfinite(v) for k in ['matrix','translation','rotation','scale']for v in node.get(k,[])):raise ValueError('Nonfinite node transform')
 mapping,names=clips(g)
 return url,mapping,names,g

def main():
 parser=argparse.ArgumentParser();parser.add_argument('--offline',action='store_true');args=parser.parse_args();trees={k:tree(k,args.offline)for k in SOURCES};catalog=json.loads((ROOT/'public/catalog/pokemon-assets.json').read_text())['entries'];jobs=[];missing=[]
 for e in catalog:
  choices=[];sid=e['speciesId']
  if e['id']==sid and sid<=151:choices.append(('animated',f'public/models/{sid:03d}/model.glb'))
  path=match(e,trees['broad'])
  if path:choices.append(('broad',path))
  choices=[(k,p)for k,p in choices if p in trees[k]and trees[k][p]['size']<=32*1024*1024]
  if choices:jobs.append((e,choices))
  else:missing.append({'id':e['id'],'name':e['name'],'reason':'No unambiguous exact species/form file in pinned sources; existing sprite/reference retained.'})
 def inspect(job):
  e,choices=job;errors=[]
  for key,path in choices:
   row=trees[key][path]
   try:
    url,mapping,names,g=metadata(key,path,row,args.offline);size=34 if e['id']in[1,4,7,25,133]else 38;limits=[]
    if not mapping.get('run'):limits.append('No verified native locomotion clip; original runtime rig locomotion is used while following.')
    if not mapping.get('attack'):limits.append('No verified native attack clip; original runtime rig attack and confirmed FX follow server battle cues.')
    return {'id':e['id'],'name':e['name'],'speciesId':e['speciesId'],'species':e.get('species'),'form':e['name'],'path':url,'representation':'gltf','clips':mapping,'scale':size,'groundOffset':0,'facingCorrection':math.pi/2,'movement':e['movement'],'referenceSpeed':185,'source':'https://github.com/'+SOURCES[key]['repo'],'license':'Pokemon assets: original owners retain rights; prototype source, NOT an asset redistribution license.','verified':True,'availability':'validated-remote-glb-header','model':{'permissionStatus':'prototype-acknowledged','clipMeanings':{s:'Native source animation named '+n for s,n in mapping.items()},'availableClips':names,'limitations':limits,'bytes':row['size'],'gitBlobSha1':row['sha'],'sourceRevision':SOURCES[key]['revision'],'sourceFile':path,'sourceKey':key},'sourcePermission':{'status':'prototype-acknowledged','notice':NOTICE}},None
   except Exception as ex:errors.append(str(ex))
  return None,{'id':e['id'],'name':e['name'],'reason':'; '.join(errors)}
 models=[];errors=[]
 with concurrent.futures.ThreadPoolExecutor(max_workers=8)as pool:
  for i,(model,error)in enumerate(pool.map(inspect,jobs),1):
   if model:models.append(model)
   if error:errors.append(error)
   if i%100==0:print('MODELS',i,'/',len(jobs),flush=True)
 models.sort(key=lambda e:e['id'])
 # Bundle a small representative team; all other exact models remain pinned lazy downloads.
 for e in models:
  if e['id']not in[1,4,6,7,25,133,197,609,10001,10117]:continue
  f=ROOT/'public/pokemon-models'/f"{e['id']}.glb";f.parent.mkdir(exist_ok=True)
  if not f.exists():
   if args.offline:continue
   f.write_bytes(readurl(e['path']))
  raw=f.read_bytes();digest=hashlib.sha1(('blob '+str(len(raw))+'\0').encode()+raw).hexdigest()
  if digest!=e['model']['gitBlobSha1']:
   if args.offline:raise ValueError('Bundled GLB differs from pinned source '+str(e['id']))
   raw=readurl(e['path']);digest=hashlib.sha1(('blob '+str(len(raw))+'\0').encode()+raw).hexdigest()
   if digest!=e['model']['gitBlobSha1']:raise ValueError('Source download checksum mismatch')
   f.write_bytes(raw)
  e['remotePath']=e['path'];e['path']='/pokemon-models/'+f.name;e['availability']='verified-local-prototype-glb'
 manifest={'schema':1,'version':'public-prototype-models-2-rigged','enabled':True,'usage':'non-commercial-prototype-explicit-user-choice','notice':NOTICE,'sources':SOURCES,'models':models}
 out=ROOT/'public/catalog/pokemon-models.json';temp=out.with_suffix('.json.tmp');temp.write_text(json.dumps(manifest,separators=(',',':')));temp.replace(out)
 report={'catalogCount':len(catalog),'exact3DModels':len(models),'animated3DLocomotion':sum('run'in e['clips']for e in models),'animated3DAttacks':sum('attack'in e['clips']for e in models),'staticOrIdleOnly3D':sum('run'not in e['clips']for e in models),'runtimeMotionAvailable3D':len(models),'runtimeLocomotionFallback':sum('run'not in e['clips']for e in models),'runtimeMotionMeaning':'Original runtime skeletal motion where joints exist; bounded root motion for unrigged meshes. Native clips always take priority.','retainedSpriteOrReference':len(catalog)-len(models),'bundledModels':[e['id']for e in models if e['path'].startswith('/')],'sources':SOURCES,'rightsNotice':NOTICE,'verification':'All GLB JSON chunks, named animation channels, finite bounds/transforms and required extensions parsed; binary geometry is decoded on demand. Representative browser decoding/rendering is recorded separately in reports/public-3d-browser.json.','missing':missing,'rejected':errors,'entries':[{'id':e['id'],'name':e['name'],'clips':e['clips'],'sourceFile':e['model']['sourceFile'],'limitations':e['model']['limitations']}for e in models]}
 (ROOT/'reports/public-3d-model-coverage.json').write_text(json.dumps(report,indent=2));print('RESULT',json.dumps({k:v for k,v in report.items()if k not in['entries','missing','rejected']}),flush=True)
if __name__=='__main__':main()
