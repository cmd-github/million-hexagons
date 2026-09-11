import { randomUUID } from 'node:crypto';

export const TOPOLOGY_VERSION = 'geodesic-v1';
export const CELL_COUNT = 1_000_000;
export const INVENTORY_SHARD_SIZE = 4096;
export const PLACEMENT_SCHEMA_VERSION = 1;

function cleanText(value, maximum) {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/\s+/g, ' ').slice(0, maximum);
}

function cleanUrl(value) {
  if (!value) return '';
  try {
    const url = new URL(String(value).trim());
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    return url.href.slice(0, 2048);
  } catch { return null; }
}

export function normalisePlacementClaim(input) {
  if (!input || typeof input !== 'object') return null;
  if (input.topologyVersion !== TOPOLOGY_VERSION) return null;
  if (!Array.isArray(input.cells) || input.cells.length < 1 || input.cells.length > 100_000) return null;
  const cells = [...new Set(input.cells.map(Number))].sort((a, b) => a - b);
  if (cells.length !== input.cells.length || cells.some(id => !Number.isSafeInteger(id) || id < 1 || id > CELL_COUNT)) return null;
  const ownerId = cleanText(input.ownerId, 128);
  const title = cleanText(input.title, 120);
  const description = cleanText(input.description, 500);
  const destinationUrl = cleanUrl(input.destinationUrl);
  const artworkDataUrl = typeof input.artworkDataUrl === 'string' && /^data:image\/(png|webp);base64,[A-Za-z0-9+/=]+$/.test(input.artworkDataUrl) && input.artworkDataUrl.length <= 700_000 ? input.artworkDataUrl : '';
  const anchor = Number(input.anchor);
  if (!ownerId || !title || destinationUrl === null || !Number.isSafeInteger(anchor) || !cells.includes(anchor)) return null;
  if (input.artworkDataUrl && !artworkDataUrl) return null;
  return { ownerId, title, description, destinationUrl, artworkDataUrl, anchor, topologyVersion: TOPOLOGY_VERSION, cells };
}

export function placementClaimDiagnostics(input) {
  const cells=Array.isArray(input?.cells)?input.cells:[];
  return {
    hasObject:Boolean(input&&typeof input==='object'),topologyVersion:String(input?.topologyVersion||''),
    cellCount:cells.length,uniqueCellCount:new Set(cells.map(Number)).size,anchor:Number(input?.anchor),
    anchorIncluded:cells.map(Number).includes(Number(input?.anchor)),titleLength:typeof input?.title==='string'?input.title.trim().length:-1,
    destinationProtocol:(()=>{try{return new URL(String(input?.destinationUrl||'')).protocol;}catch{return input?.destinationUrl?'invalid':'empty';}})(),
    fallbackArtworkLength:typeof input?.artworkDataUrl==='string'?input.artworkDataUrl.length:-1
  };
}

export function shardNumber(cellId) { return Math.floor((cellId - 1) / INVENTORY_SHARD_SIZE); }
export function shardId(number) { return String(number).padStart(3, '0'); }

export function groupCellsByShard(cells) {
  const grouped = new Map();
  for (const cellId of cells) {
    const number = shardNumber(cellId);
    if (!grouped.has(number)) grouped.set(number, []);
    grouped.get(number).push(cellId);
  }
  return grouped;
}

export function decodeInventory(value = '') {
  const bytes = Buffer.alloc(INVENTORY_SHARD_SIZE / 8);
  if (!value) return bytes;
  const stored = Buffer.from(value, 'base64');
  stored.copy(bytes, 0, 0, Math.min(bytes.length, stored.length));
  return bytes;
}

export function mutateInventory(bitmap, shard, cells, claimed) {
  const next = Buffer.from(bitmap);
  for (const cellId of cells) {
    const offset = (cellId - 1) - shard * INVENTORY_SHARD_SIZE;
    const byte = offset >> 3, mask = 1 << (offset & 7);
    if (claimed && (next[byte] & mask)) throw Object.assign(new Error('cells-unavailable'), { code: 'cells-unavailable', cellId });
    if (claimed) next[byte] |= mask;
    else next[byte] &= ~mask;
  }
  return next;
}

export function encodeCells(cells) {
  const bytes = Buffer.allocUnsafe(cells.length * 4);
  cells.forEach((cell, index) => bytes.writeUInt32LE(cell, index * 4));
  return bytes.toString('base64');
}

export function decodeCells(encoded) {
  const bytes = Buffer.from(encoded || '', 'base64'), cells = [];
  if (bytes.length % 4) throw new Error('invalid-cell-data');
  for (let offset = 0; offset < bytes.length; offset += 4) cells.push(bytes.readUInt32LE(offset));
  return cells;
}

export async function createTestPlacement(db, input, timestamp, options = {}) {
  const claim = normalisePlacementClaim(input);
  if (!claim) throw Object.assign(new Error('invalid-placement'), { code: 'invalid-placement' });
  const placementId = options.placementId || randomUUID(), groups = groupCellsByShard(claim.cells);
  const placementRef = db.collection('stagingPlacements').doc(placementId);
  const contentRef = db.collection('stagingPlacementVersions').doc(`${placementId}-v1`);
  const grantRef = db.collection('stagingOwnershipGrants').doc(placementId);
  const eventRef = db.collection('stagingDomainEvents').doc(`${placementId}-created`);
  const shardRefs = [...groups].map(([number]) => [number, db.collection('stagingInventory').doc(shardId(number))]);
  await db.runTransaction(async transaction => {
    let quote=null;
    if(options.reservationId){
      const reservationRef=db.collection('stagingReservations').doc(options.reservationId),snapshot=await transaction.get(reservationRef),reservation=snapshot.data();
      if(!snapshot.exists||reservation.status!=='active'||reservation.ownerId!==options.reservationOwnerId||Number(reservation.expiresAtMs)<=Number(options.nowMs))throw Object.assign(new Error('reservation-invalid'),{code:'reservation-invalid'});
      if(decodeCells(reservation.cellsData).join(',')!==claim.cells.join(','))throw Object.assign(new Error('reservation-mismatch'),{code:'reservation-mismatch'});
      quote=reservation.quote||null;transaction.update(reservationRef,{status:'fulfilled',placementId,fulfilledAtMs:options.nowMs});
    }else{
      const snapshots = await Promise.all(shardRefs.map(([, reference]) => transaction.get(reference)));
      const updates = shardRefs.map(([number, reference], index) => [reference,mutateInventory(decodeInventory(snapshots[index].data()?.bitmap),number,groups.get(number),true).toString('base64')]);
      for (const [reference, bitmap] of updates) transaction.set(reference, { bitmap, topologyVersion: TOPOLOGY_VERSION, updatedAt: timestamp }, { merge: true });
    }
    transaction.create(placementRef, {
      schemaVersion: PLACEMENT_SCHEMA_VERSION, placementId, ownerId: claim.ownerId,
      topologyVersion: claim.topologyVersion, cellCount: claim.cells.length, anchor: claim.anchor,
      cellsEncoding: 'uint32le-base64', cellsData: encodeCells(claim.cells),
      title: claim.title, currentVersion: 1,
      status: 'draft', environment: 'staging', quote, createdAt: timestamp, updatedAt: timestamp
    });
    transaction.create(contentRef, { schemaVersion: 1, placementId, version: 1, topologyVersion: claim.topologyVersion, anchor: claim.anchor, cellCount: claim.cells.length, title: claim.title, description: claim.description, destinationUrl: claim.destinationUrl, artworkDataUrl: claim.artworkDataUrl, source: options.source || null, designSource: options.designSource || null, publication: options.source ? { status: 'queued', attempts: 0 } : { status: 'preview-only', attempts: 0 }, status: 'current', environment: 'staging', createdAt: timestamp });
    transaction.create(grantRef, { placementId, ownerId: claim.ownerId, topologyVersion: claim.topologyVersion, status: 'active', environment: 'staging', grantedAt: timestamp });
    transaction.create(eventRef, { schemaVersion: 1, eventId: eventRef.id, type: 'placement_created', placementId, ownerId: claim.ownerId, environment: 'staging', occurredAt: timestamp });
  });
  return { placementId, cellCount: claim.cells.length, status: 'draft' };
}

export async function updateTestPlacementContent(db, placementId, ownerId, input, timestamp, source, designSource = null) {
  const placementRef = db.collection('stagingPlacements').doc(placementId);
  return db.runTransaction(async transaction => {
    const placement = await transaction.get(placementRef);
    if (!placement.exists || placement.data().status === 'deleted') throw Object.assign(new Error('placement-not-found'), { code: 'placement-not-found' });
    const current = placement.data();
    if (current.ownerId !== ownerId) throw Object.assign(new Error('placement-forbidden'), { code: 'placement-forbidden' });
    const claim = normalisePlacementClaim({ ...input, ownerId, topologyVersion: current.topologyVersion, anchor: current.anchor, cells: decodeCells(current.cellsData) });
    if (!claim || !source) throw Object.assign(new Error('invalid-placement'), { code: 'invalid-placement' });
    const version = Number(current.currentVersion || 1) + 1;
    const contentRef = db.collection('stagingPlacementVersions').doc(`${placementId}-v${version}`);
    transaction.create(contentRef, { schemaVersion: 1, placementId, version, topologyVersion: current.topologyVersion, anchor: current.anchor, cellCount: current.cellCount, title: claim.title, description: claim.description, destinationUrl: claim.destinationUrl, source, designSource, publication: { status: 'queued', attempts: 0 }, status: 'current', environment: 'staging', createdAt: timestamp });
    transaction.update(placementRef, { title: claim.title, currentVersion: version, updatedAt: timestamp });
    transaction.set(db.collection('stagingDomainEvents').doc(`${placementId}-content-v${version}`), { schemaVersion: 1, eventId: `${placementId}-content-v${version}`, type: 'placement_content_updated', placementId, ownerId, version, environment: 'staging', occurredAt: timestamp });
    return { placementId, version, status: 'draft', cellCount: current.cellCount };
  });
}

export async function deleteTestPlacement(db, placementId, timestamp, ownerId = null) {
  const placementRef = db.collection('stagingPlacements').doc(placementId);
  const grantRef = db.collection('stagingOwnershipGrants').doc(placementId);
  const eventRef = db.collection('stagingDomainEvents').doc(`${placementId}-deleted`);
  return db.runTransaction(async transaction => {
    const placement = await transaction.get(placementRef);
    if (!placement.exists) throw Object.assign(new Error('placement-not-found'), { code: 'placement-not-found' });
    const data = placement.data();
    if (data.environment !== 'staging') throw Object.assign(new Error('not-staging-placement'), { code: 'not-staging-placement' });
    if (ownerId && data.ownerId !== ownerId) throw Object.assign(new Error('placement-forbidden'), { code: 'placement-forbidden' });
    if (data.status === 'deleted') return { placementId, status: 'deleted' };
    const cells = decodeCells(data.cellsData), groups = groupCellsByShard(cells);
    const shardRefs = [...groups].map(([number]) => [number, db.collection('stagingInventory').doc(shardId(number))]);
    const snapshots = await Promise.all(shardRefs.map(([, reference]) => transaction.get(reference)));
    shardRefs.forEach(([number, reference], index) => {
      const bitmap = mutateInventory(decodeInventory(snapshots[index].data()?.bitmap), number, groups.get(number), false);
      transaction.set(reference, { bitmap: bitmap.toString('base64'), topologyVersion: TOPOLOGY_VERSION, updatedAt: timestamp }, { merge: true });
    });
    transaction.update(placementRef, { status: 'deleted', deletedAt: timestamp, updatedAt: timestamp });
    transaction.set(db.collection('stagingPlacementVersions').doc(`${placementId}-v${data.currentVersion || 1}`), { status: 'placement-deleted', updatedAt: timestamp }, { merge: true });
    transaction.set(grantRef, { status: 'revoked-for-test-reset', revokedAt: timestamp }, { merge: true });
    transaction.create(eventRef, { schemaVersion: 1, eventId: eventRef.id, type: 'test_placement_deleted', placementId, ownerId: data.ownerId, environment: 'staging', occurredAt: timestamp });
    return { placementId, status: 'deleted', releasedCells: cells.length };
  });
}
