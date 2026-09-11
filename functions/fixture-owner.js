// Staging fixtures create new holdings; this never transfers an existing one.
export async function resolveFixtureOwner(identity, email, lookup) {
  if (identity.stagingAdmin !== true) return {status:403,error:'administrator-required'};
  let owner;
  try { owner = await lookup(String(email || '').trim().toLowerCase()); }
  catch { return {status:400,error:'verified-owner-required'}; }
  if (!owner?.emailVerified || owner.disabled) return {status:400,error:'verified-owner-required'};
  return {ownerId:owner.uid};
}

export function fixtureRetry(existing, ownerId) {
  if (!existing) return null;
  if (existing.ownerId !== ownerId || ['deleted','revoked'].includes(existing.status)) return {status:409,error:'fixture-id-unavailable'};
  return {placement:{placementId:existing.placementId,cellCount:existing.cellCount,status:existing.status},existing:true};
}
