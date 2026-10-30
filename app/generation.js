export function workerCount(mode='auto'){
  const cores=Math.max(1,navigator.hardwareConcurrency||2);
  if(mode==='quiet')return 1;
  if(mode==='fast')return Math.min(8,cores);
  return Math.max(1,Math.min(4,cores-1));
}
export class GenerationPool{
  constructor(config,mode){
    this.next=0;this.id=0;this.jobs=new Map();
    this.workers=Array.from({length:workerCount(mode)},()=>{
      const worker=new Worker(new URL('generate-worker.js',window.location.href));
      worker.onmessage=event=>{const job=this.jobs.get(event.data.id);if(!job)return;this.jobs.delete(event.data.id);if(event.data.error)job.reject(Error(event.data.error));else job.resolve(event.data.result);};
      worker.onerror=()=>{for(const job of this.jobs.values())job.reject(Error('Generazione interrotta. Riprova con meno lavori paralleli.'));this.jobs.clear();};
      worker.postMessage({kind:'init',input:config});return worker;
    });
  }
  submit(kind,payload){const id=++this.id,worker=this.workers[this.next++%this.workers.length];return new Promise((resolve,reject)=>{this.jobs.set(id,{resolve,reject});worker.postMessage({id,kind,...payload});});}
  async *svg(config,values,plan,checkCancel){
    const size=100,pending=[];
    const enqueue=first=>{
      const items=plan.positions.slice(first,first+size).map(item=>({...item,value:values[item.index]}));
      return this.submit('svg',{items}).then(text=>({text,count:items.length}),error=>({error}));
    };
    let next=0;
    while(next<plan.positions.length&&pending.length<this.workers.length){pending.push(enqueue(next));next+=size;}
    while(pending.length){checkCancel();const result=await pending.shift();if(result.error)throw result.error;checkCancel();if(next<plan.positions.length){pending.push(enqueue(next));next+=size;}yield result;}
  }
  page(values,plan){const items=Array.from(plan.positions,item=>({...item,value:values[item.index]}));return this.submit('page',{items,plan:{width:plan.width,height:plan.height,name:plan.name,markers:plan.markers}});}
  close(){for(const worker of this.workers)worker.terminate();for(const job of this.jobs.values())job.reject(Error('Generazione interrotta.'));this.jobs.clear();}
}
