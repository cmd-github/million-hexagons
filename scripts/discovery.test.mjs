import test from 'node:test';
import assert from 'node:assert/strict';
import { closestPlacements, milestoneStatus, newestPlacements, recommendedMilestones } from '../src/placements/discovery.js';

const records = [
  { placementId: 'current', anchor: 1, publicationStatus: 'published', createdAt: 10 },
  { placementId: 'near', anchor: 2, publicationStatus: 'published', createdAt: 20 },
  { placementId: 'far', anchor: 3, publicationStatus: 'published', createdAt: 30 },
  { placementId: 'draft', anchor: 2, publicationStatus: 'preview-only', createdAt: 40 },
  { placementId: 'suspended', anchor: 2, publicationStatus: 'published', moderationStatus: 'suspended', createdAt: 50 },
  { placementId: 'revoked', anchor: 2, publicationStatus: 'published', status: 'revoked', createdAt: 60 },
];
const centres = new Map([[1, [1, 0, 0]], [2, [.9, .1, 0]], [3, [-1, 0, 0]]]);

test('activity contains only real live placements in newest-first order', () => {
  assert.deepEqual(newestPlacements(records).map(item => item.placementId), ['far', 'near', 'current']);
});

test('nearby excludes the current and non-live placements and sorts geographically', () => {
  assert.deepEqual(closestPlacements(records, records[0], id => centres.get(id)).map(item => item.placementId), ['near', 'far']);
});

test('milestone catalogue reports progress and recommends the next target per metric', () => {
  const statuses = milestoneStatus({ placements: 12, claimedCells: 2_000, views: 0, clicks: 100 });
  assert.equal(statuses.find(item => item.id === 'placements-10').achieved, true);
  assert.deepEqual(recommendedMilestones({ placements: 12, claimedCells: 2_000, views: 0, clicks: 100 }).map(item => item.id), ['placements-50', 'claimed-10000', 'views-1000', 'clicks-1000']);
});
