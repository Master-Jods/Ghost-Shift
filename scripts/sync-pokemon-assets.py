"""Pinned, permission-audited full PokeAPI catalog -> original community directional assets.
No inferred permission for official/mixed commercial-game sheets. PNG artwork is copied unmodified.
Refresh needs Python 3 + Pillow; the game consumes generated local JSON/PNG without Python.
"""
import argparse,csv,hashlib,html,io,json,math,re,shutil,time,urllib.request,xml.etree.ElementTree as ET
from concurrent.futures import ThreadPoolExecutor,as_completed
from pathlib import Path
from PIL import Image,ImageChops
from asset_model_validation import approved_models
ROOT=Path(__file__).resolve().parents[1]
CACHE=ROOT/'.qa/catalog-assets';OUT=ROOT/'public/pokemon-sprites';CATALOG=ROOT/'public/catalog'
SOURCE_REVS={'sprite':'27da8bb6f0d5c11134127a8fccd50080c51d030a','pokeapi':'2bf639e5572812a67d2b94903fdcb9d095f5aeb2'}
BASE='https://raw.githubusercontent.com/PMDCollab/SpriteCollab/'+SOURCE_REVS['sprite']+'/'
LOGICAL={'idle':['Idle'],'run':['Walk'],'follow':['Walk'],'attack':['Attack','Strike','SpAttack','Shoot','Punch','Bite'],'assist':['Nod','DeepBreath','Pose'],'guard':['Protect','Withdraw','Brace','Pose'],'hit':['Hurt','Pain','Cringe'],'recover':['DeepBreath','Nod','Idle'],'resolve':['Faint','Bow','Pose','Idle']}
STYLE={'alternate'}
ALIAS={'alola':'alolan','galar':'galarian','hisuian':'hisui','paldea':'paldean','low-key':'lowkey','pom-pom':'pompom','pa-u':'pau','sand-cloak':'sand','trash-cloak':'trash','blue-striped':'blue','white-striped':'white','family-of-three':'three','three-segment':'three','crowned-sword':'crownedsword','crowned-shield':'crownedshield','10-power-construct':'10powerconstruct','50-power-construct':'50powerconstruct'}
def norm(value):
 value=value.lower().replace('?','e').replace('%','percent')
 tokens=[t for t in re.split(r'[-_ ]+',value) if t]
 regional={'alolan':'alola','galarian':'galar','hisuian':'hisui','paldean':'paldea'}
 value='-'.join(regional.get(t,t) for t in tokens)
 aliases={'low-key':'lowkey','pom-pom':'pompom','pa-u':'pau','sandy':'sand','sand-cloak':'sand','trash-cloak':'trash','blue-striped':'blue','white-striped':'white','family-of-three':'three','three-segment':'three','crowned-sword':'crowned','crowned-shield':'crowned'}
 value=aliases.get(value,value)
 return re.sub('[^a-z0-9]','',value)

def get(url,path):
 if path.exists():return path.read_bytes()
 err=None
 for attempt in range(3):
  try:
   with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'GhostShiftAssetAudit/1.0'}),timeout=25) as response:data=response.read()
   path.parent.mkdir(parents=True,exist_ok=True);tmp=path.with_suffix(path.suffix+'.tmp');tmp.write_bytes(data);tmp.replace(path);return data
  except Exception as e:err=e;time.sleep(.2*(attempt+1))
 raise RuntimeError(str(err))
def fetch_source(name,kind='sprite'):
 url=BASE+name if kind=='sprite' else 'https://raw.githubusercontent.com/PokeAPI/pokeapi/'+SOURCE_REVS['pokeapi']+'/data/v2/csv/'+name
 return get(url,CACHE/('pinned-'+name.replace('/','_')))
def csvrows(name):return list(csv.DictReader(io.StringIO(fetch_source(name,'pokeapi').decode('utf-8-sig'))))
def flatten(node,path,form=(),styles=()):
 if node.get('sprite_files') and (node.get('canon',True) or styles):yield {'node':node,'path':path,'form':norm('-'.join(form)),'style':styles}
 for key,child in node.get('subgroups',{}).items():
  label=child.get('name','');parts=[p.lower() for p in re.split('[_ ]+',label) if p]
  if any(p in ['shiny','altcolor','cutscene','beta','skytemple'] for p in parts):continue
  newstyles=tuple(p for p in parts if p in STYLE);newform=tuple(p for p in parts if p not in STYLE)
  yield from flatten(child,path+'/'+key,form+newform,styles+newstyles)
def candidates(pokemon,tracker,forms):
 species=int(pokemon['species_id']);root=tracker.get(str(species).zfill(4))
 if not root:return []
 identifier=pokemon['identifier'];species_name=root['name'];suffix=identifier
 # Canonical species ID is authoritative; names only normalize form descriptors.
 base=SPECIES_BY_ID[species]['identifier']
 if identifier.startswith(base+'-'):suffix=identifier[len(base)+1:]
 elif identifier==base:suffix=''
 wants={norm(suffix)}
 for f in forms.get(pokemon['id'],[]):
  if f['is_default']=='1':wants.add(norm(f['form_identifier']))
 default=pokemon['is_default']=='1'
 rows=[]
 for row in flatten(root,str(species).zfill(4)):
  if row['form'] in wants or default and row['form']=='':
   authors=[row['node']['sprite_credit']['primary']]+row['node']['sprite_credit'].get('secondary',[])
   row['permissionCandidate']=bool(authors[0]) and not any(re.search('CHUNSOFT|GAME.?FREAK|NINTENDO',a,re.I) for a in authors)
   row['match']='default canonical variety' if row['form']=='' else 'exact normalized form/gender'
   rows.append(row)
 return sorted(rows,key=lambda x:(not x['permissionCandidate'],bool(x['style']),x['path']))
def author_record(key,artists):
 return artists.get(key,{'id':key,'name':key,'contact':''})
def parse_clip(path,name,node,sheet_nodes,cache):
 seen=set();resolved=name
 while sheet_nodes[resolved].find('CopyOf') is not None:
  if resolved in seen:raise ValueError('cyclic animation alias')
  seen.add(resolved);resolved=sheet_nodes[resolved].findtext('CopyOf')
  if resolved not in sheet_nodes:raise ValueError('missing animation alias')
 n=sheet_nodes[resolved];w=int(n.findtext('FrameWidth','0'));h=int(n.findtext('FrameHeight','0'));dur=[int(d.text) for d in n.findall('Durations/Duration')]
 if not w or not h or not dur or any(d<=0 or d>3600 for d in dur):raise ValueError('invalid frame dimensions/durations')
 png_path=cache/(resolved+'-Anim.png');shadow_path=cache/(resolved+'-Shadow.png')
 png=get(BASE+'sprite/'+path+'/'+resolved+'-Anim.png',png_path);shadow=get(BASE+'sprite/'+path+'/'+resolved+'-Shadow.png',shadow_path)
 with Image.open(io.BytesIO(png)) as original:
  original.load();im=original.convert('RGBA');sw,sh=im.size
 if max(sw,sh)>4096 or sw%w or sh%h or sw//w<len(dur) or sh//h not in [1,8]:raise ValueError('unsupported or inconsistent directional sheet bounds')
 with Image.open(io.BytesIO(shadow)) as original:
  original.load();ground=original.convert('RGBA')
 if ground.size!=im.size:raise ValueError('shadow dimensions do not match')
 channels=ground.split();white_mask=ImageChops.multiply(ImageChops.darker(ImageChops.darker(channels[0],channels[1]),channels[2]),channels[3]).point(lambda v:255 if v==255 else 0)
 anchors=[];unique=set();maxheight=0;feet=0;rows=sh//h
 for row in range(rows):
  line=[]
  for frame in range(len(dur)):
   rect=(frame*w,row*h,(frame+1)*w,(row+1)*h);tile=im.crop(rect);bbox=tile.getbbox()
   if not bbox:raise ValueError('empty declared frame')
   unique.add(hashlib.sha256(tile.tobytes()).hexdigest());maxheight=max(maxheight,bbox[3]-bbox[1]);mark=white_mask.crop(rect);mb=mark.getbbox()
   if mb is None or mark.histogram()[255]!=1:raise ValueError('missing/ambiguous native ground anchor')
   anchor=[mb[0],mb[1]];line.append(anchor);feet=max(feet,bbox[3]-anchor[1])
  anchors.append(line)
 if name=='Walk' and (rows!=8 or len(dur)<2 or len(unique)<=rows):raise ValueError('no genuine eight-direction animated locomotion')
 return {'name':name,'sheet':resolved,'path':'/pokemon-sprites/'+path+'/'+resolved+'-Anim.png','width':sw,'height':sh,'frameWidth':w,'frameHeight':h,'frames':len(dur),'rows':rows,'durations':dur,'ticksPerSecond':60,'anchors':anchors,'opaqueHeight':maxheight,'groundPad':max(0,feet),'hitFrame':n.findtext('HitFrame'),'returnFrame':n.findtext('ReturnFrame'),'sha256':hashlib.sha256(png).hexdigest(),'shadowSha256':hashlib.sha256(shadow).hexdigest(),'animated':len(unique)>rows}
def inspect_candidate(row,artists):
 path=row['path'];cache=CACHE/'sheets'/path
 credit=get(BASE+'sprite/'+path+'/credits.txt',cache/'credits.txt').decode('utf-8-sig')
 if re.search('CHUNSOFT|GAME.?FREAK|NINTENDO',credit,re.I):raise ValueError('official/mixed credit ledger: redistribution permission not established')
 keys=set()
 for line in credit.splitlines():
  fields=line.split('\t')
  if len(fields)>=2 and fields[1]:keys.add(fields[1])
 if not keys:raise ValueError('missing asset-specific artist attribution')
 xml=get(BASE+'sprite/'+path+'/AnimData.xml',cache/'AnimData.xml');tree=ET.fromstring(xml);nodes={a.findtext('Name'):a for a in tree.findall('Anims/Anim')}
 clips={};mappings={};limitations=[];parsed={}
 for state,options in LOGICAL.items():
  for name in options:
   if name not in nodes:continue
   try:
    if name not in parsed:parsed[name]=parse_clip(path,name,row['node'],nodes,cache)
    clip=parsed[name];clips[name]=clip;mappings[state]=name;break
   except Exception as ex:limitations.append(state+': '+name+' unavailable: '+str(ex))
 if 'run' not in mappings:raise ValueError('no verified directional locomotion: '+'; '.join(limitations[:3]))
 if 'idle' not in mappings:mappings['idle']=mappings['run'];limitations.append('Idle holds the first native Walk frame; no verified Idle clip.')
 for state in LOGICAL:
  if state not in mappings:limitations.append('No verified '+state+' action; use the native idle pose plus confirmed effects, not a claimed '+state+' animation.')
 if mappings.get('guard') in ['Charge','Pose']:limitations.append('Guard uses native '+mappings['guard']+' ready/charging pose with a shield effect; no dedicated defensive clip.')
 if mappings.get('resolve') in ['Pose','Idle']:limitations.append('Resolution uses native '+mappings['resolve']+' plus authoritative fade; no dedicated resolution action.')
 destination=OUT/path;destination.mkdir(parents=True,exist_ok=True)
 for filename in ['credits.txt','AnimData.xml']+sorted({c['sheet']+suffix for c in clips.values() for suffix in ['-Anim.png','-Shadow.png']}):shutil.copy2(cache/filename,destination/filename)
 return {'sourcePath':path,'sourceUrl':'https://github.com/PMDCollab/SpriteCollab/tree/'+SOURCE_REVS['sprite']+'/sprite/'+path,'revision':SOURCE_REVS['sprite'],'license':'CC-BY-NC-4.0','permission':'Community submissions under the asset-specific submission/use policy; non-commercial use with artist credit. Official/mixed credits and recolors are excluded. Pokemon IP is not granted by the project license.','permissionUrl':'https://github.com/PMDCollab/SpriteCollab/blob/'+SOURCE_REVS['sprite']+'/README.md#submission-and-use-policy','artists':[author_record(k,artists) for k in sorted(keys)],'clips':clips,'mappings':mappings,'limitations':limitations,'match':row['match'],'artStyle':'community-original alternate' if row['style'] else 'community-original'}
def validate_registry(manifest,offline=True):
 errors=[];seen=set();parsed=0
 for entry in manifest['entries']:
  id=entry['id']
  if id in seen:errors.append(str(id)+': duplicate identity')
  seen.add(id)
  if not all(math.isfinite(entry[k]) for k in ['scale','groundOffset','facingCorrection']) or not 16<=entry['scale']<=50:errors.append(str(id)+': invalid transform')
  asset=entry.get('sprite')
  if not asset:continue
  if asset['license']!='CC-BY-NC-4.0' or not asset['artists']:errors.append(str(id)+': missing rights/attribution')
  for key,name in asset['mappings'].items():
   if name not in asset['clips']:errors.append(str(id)+': missing clip '+key)
  for name,clip in asset['clips'].items():
   path=ROOT/'public'/clip['path'].lstrip('/')
   try:
    raw=path.read_bytes()
    if hashlib.sha256(raw).hexdigest()!=clip['sha256']:raise ValueError('hash mismatch')
    with Image.open(io.BytesIO(raw)) as im:
     im.load()
     if list(im.size)!=[clip['width'],clip['height']]:raise ValueError('dimension mismatch')
    parsed+=1
   except Exception as ex:errors.append(str(id)+' / '+name+': '+str(ex))
 if len(seen)!=manifest['catalogCount']:errors.append('incomplete catalog')
 return {'checkedEntries':len(seen),'parsedClipReferences':parsed,'errors':errors,'success':not errors}
def main():
 global SPECIES_BY_ID
 arg=argparse.ArgumentParser();arg.add_argument('--offline',action='store_true');arg.add_argument('--workers',type=int,default=8);arg.add_argument('--models',default='assets.approved-models.json');opts=arg.parse_args()
 if opts.offline:
  manifest=json.loads((CATALOG/'pokemon-assets.json').read_text());v=validate_registry(manifest);print(json.dumps(v));return 0 if v['success'] else 1
 CACHE.mkdir(parents=True,exist_ok=True);OUT.mkdir(parents=True,exist_ok=True)
 tracker=json.loads(fetch_source('tracker.json'));SPECIES_BY_ID={int(r['id']):r for r in csvrows('pokemon_species.csv')};pokemon={int(r['id']):r for r in csvrows('pokemon.csv')};shapes={r['id']:r['identifier'] for r in csvrows('pokemon_shapes.csv')};forms={}
 for r in csvrows('pokemon_forms.csv'):forms.setdefault(r['pokemon_id'],[]).append(r)
 artists={}
 for r in csv.DictReader(io.StringIO(fetch_source('credit_names.txt').decode('utf-8-sig')),delimiter='\t'):
  artists[r['Discord']]={'id':r['Discord'],'name':r['Name'] or r['Discord'],'contact':r['Contact']}
 for name in ['LICENSE.md','README.md']: (OUT/name).write_bytes(fetch_source(name))
 catalog=json.loads((CATALOG/'index.json').read_text());plan={};all_candidates={};outcomes={}
 for c in catalog['entries']:
  p=pokemon.get(c['id']);rows=candidates(p,tracker,forms) if p else []
  plan[c['id']]=(p,rows)
  for row in rows:
   if row['permissionCandidate']:all_candidates[row['path']]=row
 print('AUDIT '+str(len(catalog['entries']))+' exact catalog IDs; '+str(len(all_candidates))+' community candidate folders',flush=True)
 with ThreadPoolExecutor(max_workers=min(12,max(1,opts.workers))) as pool:
  futures={pool.submit(inspect_candidate,row,artists):path for path,row in all_candidates.items()}
  for i,f in enumerate(as_completed(futures),1):
   path=futures[f]
   try:outcomes[path]={'asset':f.result()}
   except Exception as ex:outcomes[path]={'error':str(ex)}
   if i%40==0 or i==len(futures):print('AUDITED '+str(i)+'/'+str(len(futures)),flush=True)
 entries=[]
 for c in catalog['entries']:
  p,rows=plan[c['id']];asset=None;attempts=[]
  for row in rows:
   result=outcomes.get(row['path'],{'error':'official/mixed origin excluded'})
   if result.get('asset'):asset=result['asset'];break
   attempts.append({'sourcePath':row['path'],'reason':result['error']})
  species=SPECIES_BY_ID.get(int(p['species_id'])) if p else None;shape=shapes.get(species['shape_id'],'unknown') if species else 'unknown';movement={'quadruped':'quadruped','upright':'biped','humanoid':'biped','legs':'biped','wings':'flight','bug-wings':'flight','squiggle':'serpentine','fish':'aquatic','blob':'amorphous'}.get(shape,'species-authored')
  height=int(p['height']) if p else 7;scale=round(min(42,max(23,30+4*math.log2(max(1,height)/7))),2)
  failure=None if asset else 'identity-metadata-missing' if not p else 'missing-exact-variant' if not rows else 'permission-not-established' if not any(r['permissionCandidate'] for r in rows) else 'broken-or-incompatible-native-animation'
  entries.append({'failureCategory':failure,'id':c['id'],'name':c['name'],'speciesId':int(p['species_id']) if p else None,'species':species['identifier'] if species else None,'form':p['identifier'] if p else c['name'],'isDefault':p['is_default']=='1' if p else None,'representation':'directional-sprite' if asset else 'portrait','movement':movement,'movementEvidence':'Species shape '+shape+'; movement artwork is the species-specific source Walk, not a retargeted gait.','scale':scale,'groundOffset':0,'facingCorrection':0,'referenceSpeed':185,'sprite':asset,'availability':'verified-local' if asset else 'static-fallback','fallbackReason':None if asset else 'No compatible community-original asset with established permission and verified locomotion for this exact form.','attempts':attempts,'referenceArtwork':{'id':c['id'],'source':'Existing PokeAPI exact-ID reference artwork; no new official game assets bundled.'}})
 models,model_issues=approved_models(ROOT,catalog['entries'],opts.models)
 manifest={'schema':2,'version':'authentic-catalog-sprites-1','usage':'non-commercial school/community project confirmed by user 2026-10-25','sourceRevisions':SOURCE_REVS,'catalogCount':len(entries),'entries':entries,'models':models}

 used={e['sprite']['sourcePath'] for e in entries if e['sprite']}
 # Remove only this importer's unselected source files; never delete a parent containing a selected variant.
 for source_path in all_candidates:
  folder=(OUT/source_path).resolve()
  if not folder.is_relative_to(OUT.resolve()) or not re.fullmatch(r'\d{4}(?:/\d{4})*',source_path):raise ValueError('unsafe generated asset directory')
  if source_path not in used and folder.exists():
   for f in folder.iterdir():
    if f.is_file() and (f.suffix=='.png' or f.name in ['AnimData.xml','credits.txt']):f.unlink()
 credits=['<!doctype html><html lang="en"><meta charset="utf-8"><title>Pokemon animation artist credits</title><body><h1>Community animation credits</h1><p>For this non-commercial school/community project. Original sprite PNGs are unmodified; XML and native ground anchors are parsed for rendering. Source revisions are pinned in the catalog registry.</p><p><a href="https://creativecommons.org/licenses/by-nc/4.0/">CC BY-NC 4.0 terms</a> | <a href="LICENSE.md">License copy</a> | <a href="README.md">Source submission/use policy</a>. Pokemon character rights remain with their respective owners. No official/mixed-credit sprite assets are included under an assumed code license.</p><ul>']
 for e in entries:
  a=e['sprite']
  if a:credits.append('<li>#'+str(e['id'])+' '+html.escape(e['name'])+': '+html.escape(', '.join(r['name'] for r in a['artists']))+' / <a href="'+html.escape(a['sourceUrl'])+'">original source and artist ledger</a> / '+html.escape(a['artStyle'])+'</li>')
 
 for m in models:credits.append('<li>3D #'+str(m['id'])+' '+html.escape(m['name'])+' / '+html.escape(m['sourcePermission']['author'])+' / '+html.escape(m['license'])+' / <a href="'+html.escape(m['sourcePermission']['termsUrl'])+'">asset-specific permission</a></li>')
 credits.append('</ul></body></html>');(OUT/'CREDITS.html').write_text('\n'.join(credits),encoding='utf-8')
 temporary=CATALOG/'pokemon-assets.json.tmp';temporary.write_text(json.dumps(manifest,separators=(',',':')),encoding='utf-8');temporary.replace(CATALOG/'pokemon-assets.json')
 validation=validate_registry(manifest);animated=[r for r in entries if r['sprite']];summary={'version':manifest['version'],'sourceRevisions':SOURCE_REVS,'catalogCount':len(entries),'animated3DLocomotion':len(models),'animated3DAttacks':sum(bool(m['clips'].get('attack')) for m in models),'animatedSprites':len(animated),'spriteLocomotion':len(animated),'spriteAttacks':sum('attack'in r['sprite']['mappings'] for r in animated),'staticFallback':len(entries)-len(animated),'fallbackCategories':{key:sum(e['failureCategory']==key for e in entries) for key in sorted({e['failureCategory'] for e in entries if e['failureCategory']})},'missingOrBrokenCandidates':sum('error'in r for r in outcomes.values())+len(model_issues),'modelRejections':model_issues,'validation':validation,'entries':[{'id':r['id'],'name':r['name'],'speciesId':r['speciesId'],'form':r['form'],'availability':r['availability'],'failureCategory':r['failureCategory'],'representation':r['representation'],'sourcePath':r['sprite']['sourcePath'] if r['sprite'] else None,'clips':r['sprite']['mappings'] if r['sprite'] else {},'fallbackReason':r['fallbackReason'],'attempts':r['attempts']} for r in entries]}
 (ROOT/'reports/authentic-catalog-coverage.json').write_text(json.dumps(summary,indent=2),encoding='utf-8');(ROOT/'assets.sources.lock.json').write_text(json.dumps({'sources':SOURCE_REVS,'usage':manifest['usage']},indent=2),encoding='utf-8');print('RESULT '+json.dumps({k:v for k,v in summary.items() if k!='entries'}),flush=True)
 return 0 if validation['success'] else 1
if __name__=='__main__':raise SystemExit(main())
