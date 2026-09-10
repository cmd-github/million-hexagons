import { paidEmailOwnerId } from './payments.js';

export function ownerIdsForIdentity(identity) {
  const ids = [identity.uid];
  if (identity.email_verified && identity.email) ids.push(paidEmailOwnerId(identity.email));
  return [...new Set(ids)];
}
