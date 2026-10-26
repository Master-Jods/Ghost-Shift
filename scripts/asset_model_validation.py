import json,math,struct
from pathlib import Path

def approved_models(root,catalog,provider_path):
 """Only explicitly reviewed, self-contained GLBs with asset-specific distribution permission.
 Missing/rejected records are reported; a code-repo LICENSE is not asset permission.
 """
 models=[];issues=[];seen=set();path=root/provider_path
 if not path.exists():return models,issues
 data=json.loads(path.read_text(encoding='utf-8-sig'));by_id={e['id']:e for e in catalog};by_name={e['name'].lower():e for e in catalog}
 for item in data.get('models',[]):
  try:
   entry=by_id.get(item.get('id')) or by_name.get(item.get('name','').lower())
   if not entry or item.get('name','').lower()!=entry['name'].lower():raise ValueError('exact canonical species/form association required')
   if entry['id'] in seen:raise ValueError('duplicate exact model ID')
   seen.add(entry['id'])
   rights=item.get('permission',{})
   if rights.get('status')!='approved' or rights.get('distribution')!='redistribution-permitted' or not rights.get('assetSpecificEvidence') or not rights.get('author') or not rights.get('termsUrl'):raise ValueError('asset-specific redistribution permission and attribution not established')
   asset=(root/'public'/item['path'].lstrip('/')).resolve()
   if not asset.is_relative_to((root/'public').resolve()) or asset.suffix.lower()!='.glb':raise ValueError('invalid local GLB path')
   raw=asset.read_bytes()
   if len(raw)>32*1024*1024 or raw[:4]!=b'glTF' or struct.unpack_from('<I',raw,4)[0]!=2 or struct.unpack_from('<I',raw,8)[0]!=len(raw):raise ValueError('invalid/oversized GLB')
   size,kind=struct.unpack_from('<II',raw,12)
   if kind!=0x4e4f534a:raise ValueError('missing GLB JSON chunk')
   gltf=json.loads(raw[20:20+size]);animations={a.get('name'):a for a in gltf.get('animations',[])}
   if any(v.get('uri') and not v['uri'].startswith('data:') for v in gltf.get('buffers',[])+gltf.get('images',[])):raise ValueError('model must be self-contained; external files are not implicitly licensed')
   if gltf.get('extensionsRequired'):raise ValueError('required extensions must be explicitly supported/reviewed')
   for state in ['idle','run']:
    if not item.get('clips',{}).get(state):raise ValueError('genuine idle and locomotion mappings required')
   for state,name in item['clips'].items():
    if name not in animations or not animations[name].get('channels') or not item.get('clipMeanings',{}).get(state):raise ValueError('missing animation/verified meaning for '+state)
   bounds=[]
   for mesh in gltf.get('meshes',[]):
    for primitive in mesh.get('primitives',[]):
     accessor=gltf['accessors'][primitive['attributes']['POSITION']];lo=accessor.get('min');hi=accessor.get('max')
     if not lo or not hi or any(not math.isfinite(v) for v in lo+hi) or any(a>b for a,b in zip(lo,hi)):raise ValueError('invalid/non-finite model bounds')
     bounds.append((lo,hi))
   if not bounds or max(b[1][1] for b in bounds)<=min(b[0][1] for b in bounds):raise ValueError('zero-sized model')
   scale=item.get('scale',32);ground=item.get('groundOffset',0);facing=item.get('facingCorrection',0)
   if not all(math.isfinite(v) for v in [scale,ground,facing]) or not 16<=scale<=50:raise ValueError('invalid bounded transform')
   models.append({**item,'id':entry['id'],'name':entry['name'],'representation':'gltf','source':item['source'],'license':item['license'],'verified':True,'scale':scale,'groundOffset':ground,'facingCorrection':facing,'referenceSpeed':item.get('referenceSpeed',185),'movement':item.get('movement','species-authored'),'availability':'verified-local','model':{'permissionStatus':'approved','clipMeanings':item['clipMeanings']},'sourcePermission':rights})
  except Exception as e:issues.append({'id':item.get('id'),'name':item.get('name'),'path':item.get('path'),'reason':str(e)})
 return models,issues
