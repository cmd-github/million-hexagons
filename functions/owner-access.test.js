import test from 'node:test';
import assert from 'node:assert/strict';
import { paidEmailOwnerId } from './payments.js';
import { ownerIdsForIdentity } from './owner-access.js';

test('verified email sign-in recovers UID-owned and Stripe-email-owned placements', () => {
  assert.deepEqual(ownerIdsForIdentity({ uid: 'firebase-user', email: 'Buyer@Example.com', email_verified: true }), [
    'firebase-user',
    paidEmailOwnerId('buyer@example.com')
  ]);
});

test('unverified identities cannot claim an email ownership principal', () => {
  assert.deepEqual(ownerIdsForIdentity({ uid: 'firebase-user', email: 'buyer@example.com', email_verified: false }), ['firebase-user']);
});
