export type BattleMove={id:string;name:string;type:string;category:string;power:number;accuracy:number|true;pp:number;maxpp:number;disabled:boolean;index:number};
export type BattleMon={renderId?:number;id:number;name:string;species:string;hp:number;maxhp:number;status:string;fainted:boolean;types:string[]};
export type BattleCue={side:'player'|'opponent';kind:'attack'|'hit'|'guard'|'recover'|'faint';move?:string;type?:string;at:number;until:number};
export type BattleView={owner:'A'|'B';requestId:number;turn:number;readyAt:number;outcome:'active'|'won'|'lost';active:BattleMon;opponent:BattleMon;party:BattleMon[];moves:BattleMove[];forceSwitch:boolean;canSwitch:boolean;log:string[];cues:BattleCue[];mappingNotes:string[]};
