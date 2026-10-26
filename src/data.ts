import directional from './directional-manifest.js';
import bundled from './asset-manifest.js';
export type Role='control'|'A'|'B';
export type PokemonRecord={id:number;name:string;types:string[];stats:number[];isDefault:boolean;species:string;source:'pokeapi'|'offline-neutral'};
export const art=(id:number)=>bundled.includes(id)?`/pokemon/${id}-art.png`:`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
export const sprite=(id:number)=>bundled.includes(id)?`/pokemon/${id}-sprite.png`:`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
export const fmt=(n:number)=>Number.isFinite(n)?`${Math.floor(Math.max(0,n)/60).toString().padStart(2,'0')}:${Math.floor(Math.max(0,n)%60).toString().padStart(2,'0')}`:'Not available';
export const neutralRecord=(id:number,name:string):PokemonRecord=>({id,name,types:[],stats:[],isDefault:id<10000,species:'',source:'offline-neutral'});
export const companionModifier=(record:PokemonRecord|undefined)=>record?.stats.length?Math.max(.85,Math.min(1.15,record.stats.reduce((a,b)=>a+b,0)/record.stats.length/85)):1;

export const backSprite=(id:number)=>directional.includes(id)?`/pokemon/${id}-back.png`:`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/${id}.png`;
