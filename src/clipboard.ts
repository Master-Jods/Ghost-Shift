export async function copyText(text:string){
 if(navigator.clipboard?.writeText){try{await navigator.clipboard.writeText(text);return;}catch{/* HTTP LAN and some browser policies require a local fallback. */}}
 const field=document.createElement('textarea');field.value=text;field.style.cssText='position:fixed;opacity:0;left:0;top:0';document.body.append(field);field.focus();field.select();
 try{if(!document.execCommand('copy'))throw Error('Copy unavailable. Copy this text manually: '+text);}finally{field.remove();}
}
