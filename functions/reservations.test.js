import assert from 'node:assert/strict';
import test from 'node:test';
import { reserveTestCells, releaseTestReservation } from './reservations.js';

class MemoryFirestore {
  constructor(){this.documents=new Map();}
  collection(collection){return{doc:id=>({key:`${collection}/${id}`})};}
  async runTransaction(work){const transaction={get:async ref=>({exists:this.documents.has(ref.key),data:()=>this.documents.get(ref.key)}),set:(ref,value,options)=>this.documents.set(ref.key,options?.merge?{...this.documents.get(ref.key),...value}:value),create:(ref,value)=>{if(this.documents.has(ref.key))throw new Error('exists');this.documents.set(ref.key,value);},update:(ref,value)=>this.documents.set(ref.key,{...this.documents.get(ref.key),...value})};return work(transaction);}
}

test('atomically reserves and releases the 100,000-cell launch maximum',async()=>{
  const db=new MemoryFirestore(),cells=Array.from({length:100_000},(_,index)=>index+100_001);
  const reserved=await reserveTestCells(db,{ownerId:'owner',topologyVersion:'geodesic-v1',cells},1000,900_000,'large');
  assert.equal(reserved.cellCount,100_000);
  await assert.rejects(reserveTestCells(db,{ownerId:'other',topologyVersion:'geodesic-v1',cells:[150_000]},1001,900_000,'conflict'),error=>error.code==='cells-unavailable');
  const released=await releaseTestReservation(db,'large','owner',2000);
  assert.equal(released.releasedCells,100_000);
  assert.equal((await reserveTestCells(db,{ownerId:'other',topologyVersion:'geodesic-v1',cells:[150_000]},2001,900_000,'reuse')).status,'active');
});

test('rejects early expiry and makes repeated expiry idempotent',async()=>{
  const db=new MemoryFirestore();await reserveTestCells(db,{ownerId:'owner',topologyVersion:'geodesic-v1',cells:[42]},1000,100,'expiry');
  await assert.rejects(releaseTestReservation(db,'expiry','owner',1099,{expiredOnly:true}),error=>error.code==='reservation-not-expired');
  assert.equal((await releaseTestReservation(db,'expiry','owner',1100,{expiredOnly:true})).status,'expired');
  assert.equal((await releaseTestReservation(db,'expiry','owner',1101,{expiredOnly:true})).releasedCells,0);
});
