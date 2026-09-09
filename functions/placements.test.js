import assert from 'node:assert/strict';
import test from 'node:test';
import { createTestPlacement, decodeCells, decodeInventory, deleteTestPlacement, encodeCells, groupCellsByShard, mutateInventory, normalisePlacementClaim } from './placements.js';

const valid = { ownerId: 'test-owner', title: 'Test placement', description: 'A durable test.', destinationUrl: 'https://example.com', topologyVersion: 'geodesic-v1', anchor: 2, cells: [1, 2, 4097] };

test('normalises a valid placement without changing its exact cells', () => {
  const claim = normalisePlacementClaim(valid);
  assert.deepEqual(claim.cells, [1, 2, 4097]);
  assert.equal(claim.destinationUrl, 'https://example.com/');
});

test('rejects duplicates, invalid topology, unsafe URLs and oversized claims', () => {
  assert.equal(normalisePlacementClaim({ ...valid, cells: [1, 1] }), null);
  assert.equal(normalisePlacementClaim({ ...valid, topologyVersion: 'other' }), null);
  assert.equal(normalisePlacementClaim({ ...valid, destinationUrl: 'javascript:alert(1)' }), null);
  assert.equal(normalisePlacementClaim({ ...valid, cells: Array.from({ length: 100_001 }, (_, index) => index + 1) }), null);
});

test('groups the complete million-cell inventory into at most 245 transaction shards', () => {
  const cells = Array.from({ length: 1_000_000 }, (_, index) => index + 1);
  assert.equal(groupCellsByShard(cells).size, 245);
});

test('claims, detects conflicts and releases inventory bits', () => {
  const claimed = mutateInventory(decodeInventory(), 0, [1, 8, 4096], true);
  assert.throws(() => mutateInventory(claimed, 0, [8], true), error => error.code === 'cells-unavailable' && error.cellId === 8);
  const released = mutateInventory(claimed, 0, [1, 8, 4096], false);
  assert.deepEqual(released, decodeInventory());
});

test('round trips exact ordered cell membership compactly', () => {
  const cells = [1, 12, 4097, 500_000, 1_000_000];
  assert.deepEqual(decodeCells(encodeCells(cells)), cells);
});

class MemoryFirestore {
  constructor() { this.documents = new Map(); }
  collection(collection) { return { doc: id => ({ id, key: `${collection}/${id}` }) }; }
  async runTransaction(work) {
    const transaction = {
      get: async reference => ({ exists: this.documents.has(reference.key), data: () => this.documents.get(reference.key) }),
      set: (reference, value, options) => this.documents.set(reference.key, options?.merge ? { ...this.documents.get(reference.key), ...value } : value),
      create: (reference, value) => { if (this.documents.has(reference.key)) throw new Error('already-exists'); this.documents.set(reference.key, value); },
      update: (reference, value) => this.documents.set(reference.key, { ...this.documents.get(reference.key), ...value })
    };
    return work(transaction);
  }
}

test('creates durable domain records, rejects conflicts, then releases a deleted test claim', async () => {
  const db = new MemoryFirestore(), timestamp = 'test-time';
  const first = await createTestPlacement(db, valid, timestamp);
  assert.equal(db.documents.get(`stagingPlacements/${first.placementId}`).cellCount, 3);
  assert.equal(db.documents.get(`stagingPlacementVersions/${first.placementId}-v1`).description, 'A durable test.');
  assert.equal(db.documents.get(`stagingOwnershipGrants/${first.placementId}`).status, 'active');
  assert.equal(db.documents.get(`stagingDomainEvents/${first.placementId}-created`).type, 'placement_created');
  await assert.rejects(createTestPlacement(db, { ...valid, ownerId: 'other-owner' }, timestamp), error => error.code === 'cells-unavailable');
  const deleted = await deleteTestPlacement(db, first.placementId, timestamp);
  assert.equal(deleted.releasedCells, 3);
  assert.equal(db.documents.get(`stagingPlacements/${first.placementId}`).status, 'deleted');
  const replacement = await createTestPlacement(db, { ...valid, ownerId: 'other-owner' }, timestamp);
  assert.equal(replacement.cellCount, 3);
});
