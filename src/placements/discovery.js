export function uniqueLivePlacements(records) {
  const placements = new Map();
  for (const record of records || []) {
    if (!record?.placementId || record.publicationStatus !== 'published') continue;
    if (record.status === 'deleted' || record.status === 'revoked' || record.moderationStatus === 'suspended') continue;
    placements.set(record.placementId, record);
  }
  return [...placements.values()];
}

export function newestPlacements(records, limit = 5) {
  return uniqueLivePlacements(records)
    .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0) || a.placementId.localeCompare(b.placementId))
    .slice(0, limit);
}

export function closestPlacements(records, selected, centreFor, limit = 3) {
  if (!selected) return [];
  const origin = centreFor(selected.anchor);
  return uniqueLivePlacements(records)
    .filter(record => record.placementId !== selected.placementId)
    .map(record => ({ record, distance: 1 - centreFor(record.anchor).reduce((sum, value, index) => sum + value * origin[index], 0) }))
    .sort((a, b) => a.distance - b.distance || Number(b.record.createdAt || 0) - Number(a.record.createdAt || 0))
    .slice(0, limit)
    .map(item => item.record);
}

export const milestoneCatalogue = Object.freeze([
  { id: 'placements-10', metric: 'placements', target: 10, label: '10 live placements' },
  { id: 'placements-50', metric: 'placements', target: 50, label: '50 live placements' },
  { id: 'placements-100', metric: 'placements', target: 100, label: '100 live placements' },
  { id: 'claimed-1000', metric: 'claimedCells', target: 1_000, label: '1,000 cells claimed' },
  { id: 'claimed-10000', metric: 'claimedCells', target: 10_000, label: '10,000 cells claimed' },
  { id: 'claimed-100000', metric: 'claimedCells', target: 100_000, label: '100,000 cells claimed' },
  { id: 'views-1000', metric: 'views', target: 1_000, label: '1,000 measured placement views' },
  { id: 'views-10000', metric: 'views', target: 10_000, label: '10,000 measured placement views' },
  { id: 'clicks-100', metric: 'clicks', target: 100, label: '100 website visits sent' },
  { id: 'clicks-1000', metric: 'clicks', target: 1_000, label: '1,000 website visits sent' },
]);

export function milestoneStatus(stats, catalogue = milestoneCatalogue) {
  return catalogue.map(milestone => {
    const current = Math.max(0, Number(stats?.[milestone.metric] || 0));
    return { ...milestone, current, achieved: current >= milestone.target, progress: Math.min(1, current / milestone.target) };
  });
}

export function recommendedMilestones(stats, catalogue = milestoneCatalogue) {
  const statuses = milestoneStatus(stats, catalogue);
  const metrics = [...new Set(catalogue.map(item => item.metric))];
  return metrics.map(metric => statuses.find(item => item.metric === metric && !item.achieved)).filter(Boolean);
}
