// Public snapshot ownership lookup is loaded only for the inspected region.
// The initial occupancy bitset is fixed at 125 KB before gzip, even at 1M owners.
export function decodeOccupancy(bytes,count=1_000_000){
  if(bytes.length!==Math.ceil(count/8))throw Error('Incomplete snapshot inventory');
  const output=new Uint8Array(count);for(let i=0;i<count;i++)if(bytes[i>>3]&(1<<(i&7)))output[i]=255;return output;
}
export class SnapshotOwners {
  constructor(base,fetchJson,limit=8){this.base=base;this.fetchJson=fetchJson;this.limit=limit;this.cache=new Map();this.pending=new Map();}
  async owner(region,id){
    let data=this.cache.get(region);
    if(!data){
      if(!this.pending.has(region))this.pending.set(region,this.fetchJson(`${this.base}/owners/${region}.json`).then(value=>{if(value.region!==region||!Array.isArray(value.cells)||!Array.isArray(value.placements))throw Error('Invalid snapshot ownership region');this.cache.set(region,value);while(this.cache.size>this.limit)this.cache.delete(this.cache.keys().next().value);return value;}).finally(()=>this.pending.delete(region)));
      data=await this.pending.get(region);
    }
    this.cache.delete(region);this.cache.set(region,data);
    const entry=data.cells.find(entry=>entry[0]===id);return entry?data.placements[entry[1]]:null;
  }
}
