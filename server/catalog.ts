import {readFileSync} from 'node:fs';
import type {Store} from './database.js';
import {neutralRecord,type PokemonRecord} from '../src/data.js';
const fullCatalog=JSON.parse(readFileSync(new URL('../public/catalog/index.json',import.meta.url),'utf8')) as {count:number;fetchedAt:string;source:string;scope:string;entries:{id:number;name:string}[]};
const models=JSON.parse(readFileSync(new URL('../public/catalog/pokemon-models.json',import.meta.url),'utf8'));const supported=new Set<number>(models.models.filter((m:any)=>m.verified&&m.representation==='gltf').map((m:any)=>m.id));
export const catalog={...fullCatalog,entries:fullCatalog.entries.filter(p=>supported.has(p.id)),count:supported.size,scope:'Verified textured 3D models with native or runtime motion'};
const bundledRecords=JSON.parse(readFileSync(new URL('../public/catalog/records.json',import.meta.url),'utf8')) as PokemonRecord[];
const index=new Map(catalog.entries.map(p=>[p.id,p]));
export const validPokemon=(id:unknown)=>Number.isInteger(id)&&index.has(id as number);
const pending=new Map<number,Promise<PokemonRecord>>();
export async function pokemonRecord(store:Store,id:number):Promise<PokemonRecord>{
 const entry=index.get(id);if(!entry)throw Error('Pokémon ID is outside the cached complete catalog.');
 const row=store.db.prepare('SELECT record_json,cached_at FROM pokemon_records WHERE id=?').get(id) as any;if(row&&Date.now()-row.cached_at<7*86400000)return JSON.parse(row.record_json);
 const bundled=bundledRecords.find(r=>r.id===id);if(!row&&bundled){store.db.prepare('INSERT OR IGNORE INTO pokemon_records VALUES(?,?,?)').run(id,JSON.stringify(bundled),Date.parse(catalog.fetchedAt));return bundled;}
 if(pending.has(id))return pending.get(id)!;
 const task=(async()=>{try{const response=await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`,{signal:AbortSignal.timeout(4500)});if(!response.ok)throw Error('PokéAPI unavailable');const value=await response.json();const record:PokemonRecord={id:value.id,name:value.name,types:value.types.map((v:any)=>v.type.name),stats:value.stats.map((v:any)=>v.base_stat),isDefault:value.is_default,species:value.species.name,source:'pokeapi'};store.db.prepare('INSERT INTO pokemon_records VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET record_json=excluded.record_json,cached_at=excluded.cached_at').run(id,JSON.stringify(record),Date.now());return record;}catch{return row?JSON.parse(row.record_json):bundledRecords.find(r=>r.id===id)||neutralRecord(id,entry.name);}finally{pending.delete(id);}})();pending.set(id,task);return task;
}
export async function selectedRecords(store:Store,ids:unknown){if(!Array.isArray(ids)||ids.length!==3||new Set(ids).size!==3||!ids.every(validPokemon))throw Error('Select exactly three distinct entries from the complete catalog.');return Promise.all(ids.map(id=>pokemonRecord(store,id)));}

export function cachedRecord(store:Store,id:number):PokemonRecord{const entry=index.get(id);if(!entry)throw Error('Unknown catalog ID.');const row=store.db.prepare('SELECT record_json FROM pokemon_records WHERE id=?').get(id) as any;return row?JSON.parse(row.record_json):bundledRecords.find(r=>r.id===id)||neutralRecord(id,entry.name);}

const injectionIdentities=JSON.parse(readFileSync(new URL('../public/catalog/identities.json',import.meta.url),'utf8')) as {entries:Pick<PokemonRecord,'id'|'name'|'types'>[]};
const injectionIndex=new Map(injectionIdentities.entries.map(r=>[r.id,r]));
export function injectionRecord(id:number){const record=injectionIndex.get(id);if(!record||record.name!==index.get(id)?.name)throw Error('Exact injection metadata unavailable.');return record;}

export function publicRecord(id:number):PokemonRecord{const e=index.get(id);if(!e)throw Error('Unknown supported 3D Pokemon');const identity=injectionRecord(id);return bundledRecords.find(r=>r.id===id)||{...neutralRecord(id,e.name),types:identity.types};}
