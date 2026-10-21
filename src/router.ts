import {useSyncExternalStore} from 'react';
const subscribe=(cb:()=>void)=>{window.addEventListener('popstate',cb);return()=>window.removeEventListener('popstate',cb);};
export const useRoute=()=>useSyncExternalStore(subscribe,()=>location.pathname+location.search);
export function navigate(path:string){history.pushState({},'',path);window.dispatchEvent(new PopStateEvent('popstate'));}
