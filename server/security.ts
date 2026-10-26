import {randomBytes,scryptSync,timingSafeEqual,createHash}from 'node:crypto';
export const hashToken=(token:string)=>createHash('sha256').update(token).digest('hex');
export const token=()=>randomBytes(32).toString('base64url');
export function hashPassword(password:string){const salt=randomBytes(16).toString('hex');return `${salt}:${scryptSync(password,salt,64).toString('hex')}`;}
export function checkPassword(password:string,stored:string){const [salt,hash]=stored.split(':');const value=scryptSync(password,salt,64);const expected=Buffer.from(hash,'hex');return expected.length===value.length&&timingSafeEqual(value,expected);}
