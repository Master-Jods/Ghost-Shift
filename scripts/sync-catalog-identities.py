"""Bundle exact catalog names/types so operator injection never waits for PokeAPI."""
import csv,io,json,urllib.request
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];REV='2bf639e5572812a67d2b94903fdcb9d095f5aeb2';BASE='https://raw.githubusercontent.com/PokeAPI/pokeapi/'+REV+'/data/v2/csv/'
def rows(name):
 with urllib.request.urlopen(BASE+name,timeout=30)as r:return list(csv.DictReader(io.StringIO(r.read().decode('utf-8'))))
if __name__=='__main__':
 names={int(r['id']):r['identifier']for r in rows('pokemon.csv')};types={r['id']:r['identifier']for r in rows('types.csv')};mapping={}
 for r in rows('pokemon_types.csv'):mapping.setdefault(int(r['pokemon_id']),[]).append((int(r['slot']),types[r['type_id']]))
 catalog=json.loads((ROOT/'public/catalog/index.json').read_text(encoding='utf-8'))['entries'];entries=[]
 for e in catalog:
  if names.get(e['id'])!=e['name']or not mapping.get(e['id']):raise ValueError('Unverified exact catalog identity/types: '+str(e))
  entries.append({'id':e['id'],'name':e['name'],'types':[v for _,v in sorted(mapping[e['id']])]})
 out=ROOT/'public/catalog/identities.json';tmp=out.with_suffix('.json.tmp');tmp.write_text(json.dumps({'source':BASE,'revision':REV,'entries':entries},separators=(',',':')),encoding='utf-8');tmp.replace(out);print('Bundled',len(entries),'exact names/types')
