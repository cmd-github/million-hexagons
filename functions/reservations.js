import { randomUUID } from 'node:crypto';
import { CELL_COUNT, TOPOLOGY_VERSION, decodeCells, decodeInventory, encodeCells, groupCellsByShard, mutateInventory, shardId } from './placements.js';

export function normaliseReservation(input) {
  if (!input || input.topologyVersion !== TOPOLOGY_VERSION || !Array.isArray(input.cells) || input.cells.length < 1 || input.cells.length > 100_000) return null;
  const cells=[...new Set(input.cells.map(Number))].sort((a,b)=>a-b);
  if (cells.length !== input.cells.length || cells.some(id=>!Number.isSafeInteger(id)||id<1||id>CELL_COUNT)) return null;
  const ownerId=typeof input.ownerId==='string'?input.ownerId.trim().slice(0,128):'';
  return ownerId?{ownerId,topologyVersion:TOPOLOGY_VERSION,cells}:null;
}

export async function reserveTestCells(db, input, nowMs, ttlMs = 15 * 60_000, reservationId = randomUUID(), metadata = {}) {
  const reservation=normaliseReservation(input);
  if (!reservation) throw Object.assign(new Error('invalid-reservation'),{code:'invalid-reservation'});
  const groups=groupCellsByShard(reservation.cells),reference=db.collection('stagingReservations').doc(reservationId);
  const shardRefs=[...groups].map(([number])=>[number,db.collection('stagingInventory').doc(shardId(number))]);
  await db.runTransaction(async transaction=>{
    const existing=await transaction.get(reference);
    if(existing.exists)throw Object.assign(new Error('reservation-exists'),{code:'reservation-exists'});
    const snapshots=await Promise.all(shardRefs.map(([,ref])=>transaction.get(ref)));
    shardRefs.forEach(([number,ref],index)=>transaction.set(ref,{bitmap:mutateInventory(decodeInventory(snapshots[index].data()?.bitmap),number,groups.get(number),true).toString('base64'),topologyVersion:TOPOLOGY_VERSION,updatedAtMs:nowMs},{merge:true}));
    transaction.create(reference,{reservationId,ownerId:reservation.ownerId,topologyVersion:TOPOLOGY_VERSION,cellsEncoding:'uint32le-base64',cellsData:encodeCells(reservation.cells),cellCount:reservation.cells.length,status:'active',createdAtMs:nowMs,expiresAtMs:nowMs+ttlMs,...metadata});
  });
  return {reservationId,cellCount:reservation.cells.length,status:'active',expiresAtMs:nowMs+ttlMs};
}

export async function releaseTestReservation(db,reservationId,ownerId,nowMs,{expiredOnly=false}={}){
  const reference=db.collection('stagingReservations').doc(reservationId);
  return db.runTransaction(async transaction=>{
    const snapshot=await transaction.get(reference);
    if(!snapshot.exists)throw Object.assign(new Error('reservation-not-found'),{code:'reservation-not-found'});
    const reservation=snapshot.data();
    if(reservation.ownerId!==ownerId)throw Object.assign(new Error('reservation-forbidden'),{code:'reservation-forbidden'});
    if(reservation.status!=='active')return {reservationId,status:reservation.status,releasedCells:0};
    if(expiredOnly&&Number(reservation.expiresAtMs)>nowMs)throw Object.assign(new Error('reservation-not-expired'),{code:'reservation-not-expired'});
    const cells=decodeCells(reservation.cellsData),groups=groupCellsByShard(cells),shardRefs=[...groups].map(([number])=>[number,db.collection('stagingInventory').doc(shardId(number))]);
    const shards=await Promise.all(shardRefs.map(([,ref])=>transaction.get(ref)));
    shardRefs.forEach(([number,ref],index)=>transaction.set(ref,{bitmap:mutateInventory(decodeInventory(shards[index].data()?.bitmap),number,groups.get(number),false).toString('base64'),topologyVersion:TOPOLOGY_VERSION,updatedAtMs:nowMs},{merge:true}));
    transaction.update(reference,{status:expiredOnly?'expired':'released',releasedAtMs:nowMs});
    return {reservationId,status:expiredOnly?'expired':'released',releasedCells:cells.length};
  });
}
