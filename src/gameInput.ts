/** Local keyboard ownership; menus keep normal focus traversal. */
export function journalTabIntent({playing,typing,modified,overlay,gameSurface,journalSurface}:{playing:boolean;typing:boolean;modified:boolean;overlay:string|null;gameSurface:boolean;journalSurface:boolean}):'open'|'close'|null{
 if(!playing||typing||modified)return null;
 if(overlay==='journal')return journalSurface?'close':null;
 return overlay===null&&gameSurface?'open':null;
}
