/** Close codes are transport signals; credentials/ownership failures require user action. */
export function connectionRecovery(code:number,attempt:number){
 if([1008,4001,4003,4008].includes(code))return {retry:false,delay:0};
 if(code===1012)return {retry:true,delay:100};
 return {retry:true,delay:Math.min(8000,500*2**Math.min(attempt,4))};
}
