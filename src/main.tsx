import React from 'react';
import ReactDOM from 'react-dom/client';
import Root from './Root';
import './ghost.css';
import './presentation.css';
import './industrial.css';
import './horror.css';
import './taskEquipment.css';
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><Root/></React.StrictMode>);
if('serviceWorker' in navigator&&import.meta.env.PROD)window.addEventListener('load',()=>{
 let reloading=false;const wasControlled=!!navigator.serviceWorker.controller;
 navigator.serviceWorker.addEventListener('controllerchange',()=>{if(wasControlled&&!reloading){reloading=true;location.reload();}});
 navigator.serviceWorker.register('/sw.js',{updateViaCache:'none'}).then(reg=>{void reg.update();}).catch(()=>{/* Normal online browser gameplay remains available. */});
});
