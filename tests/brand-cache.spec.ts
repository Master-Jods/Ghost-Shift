import{test,expect}from'@playwright/test';import{createApp}from'../server/app';
test('branding replaces stale cached SVGs and remains available offline',async({browser})=>{
 const app=createApp({dbPath:':memory:',staticDir:'dist'}),base='http://127.0.0.1:'+await app.listen(0,'127.0.0.1'),context=await browser.newContext();
 try{const page=await context.newPage();await page.goto(base+'/play');await expect.poll(()=>page.evaluate(()=>!!navigator.serviceWorker.controller),{timeout:20000}).toBe(true);await expect(page.locator('.horror-title img')).toHaveAttribute('src','/horror/among-the-shadows-title.svg');
 await page.evaluate(async()=>{const cache=await caches.open((await caches.keys()).find(name=>name.startsWith('ghost-shift-'))!);for(const path of ['/horror/title.svg','/horror/among-the-shadows-title.svg'])await cache.put(path,new Response('<svg xmlns="http://www.w3.org/2000/svg"><text>GHOST SHIFT</text></svg>',{headers:{'Content-Type':'image/svg+xml'}}));});
 for(const path of ['/horror/title.svg','/horror/among-the-shadows-title.svg']){const result=await page.evaluate(async path=>(await fetch(path)).text(),path);expect(result).toContain('AMONG THE SHADOWS');expect(result).not.toContain('GHOST SHIFT');}
 await context.setOffline(true);const offline=await page.evaluate(async()=>(await fetch('/horror/among-the-shadows-title.svg')).text());expect(offline).toContain('AMONG THE SHADOWS');
 }finally{await context.close();await app.close();}
});
