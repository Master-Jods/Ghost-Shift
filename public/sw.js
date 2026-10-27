const CACHE='among-shadows-cloud-recovery-29';
const ESSENTIAL=['/','/play','/manifest.webmanifest','/icons/app.svg','/industrial-corners.svg','/horror/aster-night-clean.png','/horror/among-the-shadows-title.svg','/horror/blood.svg','/trainers/a-atlas.svg','/trainers/b-atlas.svg','/catalog/index.json','/fonts/fonts.css',...[25,68,197,9,282,59,609,491,94].flatMap(id=>[`/pokemon/${id}-art.png`,`/pokemon/${id}-sprite.png`]),...Array.from({length:12},(_,i)=>`/fonts/font-${i}.woff2`)];
// Shell updates must not be held hostage by an optional image/font failing.
self.addEventListener('install',event=>{event.waitUntil((async()=>{
 const cache=await caches.open(CACHE),shell=['/','/play','/manifest.webmanifest','/horror/among-the-shadows-title.svg'];
 await Promise.all(shell.map(async path=>{const response=await fetch(path,{cache:'reload'});if(!response.ok)throw Error('Shell unavailable');await cache.put(path,response);}));
 await Promise.allSettled(ESSENTIAL.filter(path=>!shell.includes(path)).map(async path=>{const response=await fetch(path,{cache:'reload'});if(response.ok)await cache.put(path,response);}));
 try{const response=await fetch('/catalog/asset-files.json',{cache:'reload'});if(response.ok){const files=await response.json();await Promise.allSettled(files.map(async path=>{const asset=await fetch(path);if(asset.ok)await cache.put(path,asset);}));}}catch{}
 const html=await(await cache.match('/')).text(),assets=[...html.matchAll(/(?:src|href)="(\/assets\/[^\"]+)"/g)].map(m=>m[1]);
 await Promise.allSettled(assets.map(async path=>{const response=await fetch(path);if(response.ok)await cache.put(path,response);}));
 await self.skipWaiting();
})());});
self.addEventListener('activate',event=>{event.waitUntil((async()=>{for(const name of await caches.keys())if((name.startsWith('jigsaw-shell-')||name.startsWith('ghost-shift-'))&&name!==CACHE)await caches.delete(name);await self.clients.claim();})());});
self.addEventListener('fetch',event=>{const request=event.request,url=new URL(request.url);if(request.method!=='GET'||url.origin!==self.location.origin)return;
 if(url.pathname.startsWith('/api/')||url.pathname==='/ws')return;
 if(['/horror/title.svg','/horror/among-the-shadows-title.svg','/manifest.webmanifest'].includes(url.pathname)){event.respondWith((async()=>{const cache=await caches.open(CACHE);try{const response=await fetch(request,{cache:'no-cache'});if(response.ok)await cache.put(request,response.clone());return response;}catch{return await cache.match(request)||Response.error();}})());return;}
 if(['/catalog/pokemon-assets.json','/catalog/pokemon-models.json'].includes(url.pathname)){event.respondWith((async()=>{const cache=await caches.open(CACHE);try{const response=await fetch(request);if(response.ok)await cache.put(request,response.clone());return response;}catch{return await cache.match(request)||Response.error();}})());return;}
 // Native sheets are cached only when selected/requested, never as a catalog-wide startup download.
 if(url.pathname.startsWith('/pokemon-sprites/')||url.pathname.startsWith('/pokemon-models/')||url.pathname.startsWith('/draco/')){event.respondWith((async()=>{const cache=await caches.open(CACHE),image=/\.(png|glb|wasm)$/.test(url.pathname),cached=await cache.match(request);if(image&&cached)return cached;try{const response=await fetch(request);if(response.ok){await cache.put(request,response.clone());const keys=(await cache.keys()).filter(key=>/^\/(pokemon-sprites|pokemon-models|draco)\//.test(new URL(key.url).pathname));for(const old of keys.slice(0,Math.max(0,keys.length-128)))await cache.delete(old);}return response;}catch{return cached||Response.error();}})());return;}
 if(request.mode==='navigate'){event.respondWith((async()=>{try{const response=await fetch(request);if(response.ok){const cache=await caches.open(CACHE);await cache.put('/',response.clone());}return response;}catch{return await caches.match('/')||Response.error();}})());return;}
 if(['/assets/','/pokemon/','/fonts/','/icons/','/horror/','/trainers/','/audio/footsteps/'].some(prefix=>url.pathname.startsWith(prefix))||url.pathname==='/manifest.webmanifest'){event.respondWith((async()=>{const cached=await caches.match(request);if(cached)return cached;const response=await fetch(request);if(response.ok){const cache=await caches.open(CACHE);await cache.put(request,response.clone());}return response;})());}
});
