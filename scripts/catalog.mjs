import {writeFileSync,mkdirSync} from 'node:fs';
const entries=[];let url='https://pokeapi.co/api/v2/pokemon?limit=500';let count=0;
while(url){const response=await fetch(url,{signal:AbortSignal.timeout(20000)});if(!response.ok)throw Error('Catalog download failed '+response.status);const page=await response.json();count=page.count;entries.push(...page.results.map(p=>({id:Number(p.url.split('/').filter(Boolean).pop()),name:p.name})));url=page.next;}
if(entries.length!==count||new Set(entries.map(e=>e.id)).size!==count)throw Error('Incomplete catalog');
mkdirSync('public/catalog',{recursive:true});writeFileSync('public/catalog/index.json',JSON.stringify({source:'https://pokeapi.co/api/v2/pokemon',scope:'All pokemon resource entries including alternate varieties/forms. Species are not separate selectable duplicates.',fetchedAt:new Date().toISOString(),count,entries}));console.log('Complete catalog cached: '+count+' entries.');
