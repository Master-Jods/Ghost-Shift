import {NetworkTransport} from './network-transport';
import type {Action} from './engine';
export const transport=new NetworkTransport();
export const network=transport;
export const send=(type:string,role:'A'|'B'|'control',value?:unknown)=>transport.dispatch({type,role,value});
