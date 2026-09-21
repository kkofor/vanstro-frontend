export type S08ReadinessTimerScheduler<Handle=ReturnType<typeof setTimeout>>={set(callback:()=>void,delayMs:number):Handle;clear(handle:Handle):void};
export type S08ReadinessConsumer<Handle=ReturnType<typeof setTimeout>>={install(generation:number,reload:()=>void):number;appliedGeneration():number|null;dispose():void};
export function createS08ReadinessConsumer<Handle>(scheduler:S08ReadinessTimerScheduler<Handle>):S08ReadinessConsumer<Handle>{
 let timer:Handle|undefined;let generation:number|null=null;let installation=0;
 const dispose=()=>{installation+=1;if(timer!==undefined)scheduler.clear(timer);timer=undefined;generation=null;};
 return{install(nextGeneration,reload){if(!Number.isSafeInteger(nextGeneration)||nextGeneration<0||nextGeneration>2147483647)throw new TypeError("Invalid S08 published generation.");dispose();const current=installation;timer=scheduler.set(()=>{if(current===installation)reload();},30000);generation=nextGeneration;return nextGeneration;},appliedGeneration:()=>generation,dispose};
}
