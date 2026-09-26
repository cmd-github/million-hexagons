import assert from 'node:assert/strict';import test from 'node:test';import { issueCredits,redeemCredits,creditsAvailableForOwners,redeemCreditsAcrossOwners,refundRedeemedCredits } from './credits.js';import { paidEmailOwnerId } from './payments.js';import { ownerIdsForIdentity } from './owner-access.js';
class DB{constructor(){this.documents=new Map();}collection(c){return{doc:id=>({key:`${c}/${id}`,get:async()=>({exists:this.documents.has(`${c}/${id}`),data:()=>this.documents.get(`${c}/${id}`)})})};}async runTransaction(work){const t={get:async r=>({exists:this.documents.has(r.key),data:()=>this.documents.get(r.key)}),set:(r,v,o)=>this.documents.set(r.key,o?.merge?{...this.documents.get(r.key),...v}:v),create:(r,v)=>{if(this.documents.has(r.key))throw Error('exists');this.documents.set(r.key,v);}};return work(t);}}
test('issues audited idempotent credits and redeems one per hex through an actor',async()=>{const db=new DB();assert.equal((await issueCredits(db,{ownerId:'o',amount:15,reason:'service',source:'moderation',actorId:'admin',idempotencyKey:'grant'},'now')).available,15);assert.equal((await issueCredits(db,{ownerId:'o',amount:15,reason:'service',source:'moderation',actorId:'admin',idempotencyKey:'grant'},'later')).available,15);assert.equal(db.documents.get('stagingCreditLedger/grant').unit,'hexagon');assert.equal(db.documents.get('stagingCreditLedger/grant').transferable,false);assert.equal((await redeemCredits(db,{ownerId:'o',amount:12,placementId:'p',actorId:'admin',idempotencyKey:'spend'},'now')).available,3);await assert.rejects(redeemCredits(db,{ownerId:'o',amount:4,placementId:'p2',actorId:'admin'},'now'),e=>e.code==='insufficient-credits');});

// Granting by email must reach an address that has never signed in, so the
// balance is held against the email-derived owner the sign-in path resolves to.
test('credits granted to an email reach that person on their first verified sign in',async()=>{
  const db=new DB(),email='Someone@Example.com ';
  const granted=await issueCredits(db,{ownerId:paidEmailOwnerId(email),amount:25,reason:'Launch promotion',source:'promotion',actorId:'admin',idempotencyKey:'promo'},'now');
  assert.equal(granted.available,25);
  const ids=ownerIdsForIdentity({uid:'firebase-uid',email:'someone@example.com',email_verified:true});
  assert.ok(ids.includes(paidEmailOwnerId('someone@example.com')),'the signed-in identity resolves the credited owner');
  assert.equal(db.documents.get(`stagingCreditBalances/${paidEmailOwnerId('someone@example.com')}`).available,25);
  // An unverified address must not pick the balance up.
  assert.ok(!ownerIdsForIdentity({uid:'other',email:'someone@example.com',email_verified:false}).includes(paidEmailOwnerId('someone@example.com')));
});

test('a part-covered purchase spends credits across both owner ids and returns them if it is abandoned',async()=>{
  const db=new DB(),uid='firebase-uid',emailOwner='paid-email:abc',ids=[uid,emailOwner];
  await issueCredits(db,{ownerId:uid,amount:10,reason:'a',source:'promotion',actorId:'admin',idempotencyKey:'g1'},'now');
  await issueCredits(db,{ownerId:emailOwner,amount:30,reason:'b',source:'promotion',actorId:'admin',idempotencyKey:'g2'},'now');
  assert.equal(await creditsAvailableForOwners(db,ids),40);

  // Buying 100 hexagons with 40 credits spends all 40; Stripe charges for 60.
  const redemptions=await redeemCreditsAcrossOwners(db,{ownerIds:ids,amount:40,placementId:'p1',actorId:'checkout',keyPrefix:'order-1-credit'},'now');
  assert.deepEqual(redemptions,[{ownerId:uid,amount:10},{ownerId:emailOwner,amount:30}]);
  assert.equal(await creditsAvailableForOwners(db,ids),0);

  // Repeating the same order must not spend anything twice.
  const repeat=await redeemCreditsAcrossOwners(db,{ownerIds:ids,amount:40,placementId:'p1',actorId:'checkout',keyPrefix:'order-1-credit'},'now');
  assert.deepEqual(repeat,[]);
  assert.equal(await creditsAvailableForOwners(db,ids),0);

  // Abandoning the checkout gives them back, once.
  await refundRedeemedCredits(db,{redemptions,reason:'Checkout expired',actorId:'checkout',keyPrefix:'order-1-refund'},'now');
  assert.equal(await creditsAvailableForOwners(db,ids),40);
  await refundRedeemedCredits(db,{redemptions,reason:'Checkout expired',actorId:'checkout',keyPrefix:'order-1-refund'},'now');
  assert.equal(await creditsAvailableForOwners(db,ids),40);
});

test('asking for more credits than are held spends only what is there',async()=>{
  const db=new DB();
  await issueCredits(db,{ownerId:'o',amount:5,reason:'a',source:'promotion',actorId:'admin',idempotencyKey:'g'},'now');
  const redemptions=await redeemCreditsAcrossOwners(db,{ownerIds:['o','empty'],amount:12,placementId:'p',actorId:'checkout',keyPrefix:'k'},'now');
  assert.deepEqual(redemptions,[{ownerId:'o',amount:5}]);
  assert.equal(await creditsAvailableForOwners(db,['o','empty']),0);
});
