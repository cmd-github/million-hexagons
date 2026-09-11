import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveFixtureOwner, fixtureRetry} from './fixture-owner.js';

test('fixture creation requires administrator access before looking up accounts',async()=>{
  let lookedUp=false;
  assert.deepEqual(await resolveFixtureOwner({uid:'customer'},'owner@example.com',async()=>{lookedUp=true;}),{status:403,error:'administrator-required'});
  assert.equal(lookedUp,false);
});
test('fixtures bind to the verified active account resolved by the server',async()=>{
  const admin={stagingAdmin:true};
  assert.deepEqual(await resolveFixtureOwner(admin,' OWNER@EXAMPLE.COM ',async email=>{assert.equal(email,'owner@example.com');return{uid:'verified-owner',emailVerified:true};}),{ownerId:'verified-owner'});
  for(const account of [{uid:'unverified',emailVerified:false},{uid:'disabled',emailVerified:true,disabled:true}])assert.equal((await resolveFixtureOwner(admin,'owner@example.com',async()=>account)).error,'verified-owner-required');
  assert.equal((await resolveFixtureOwner(admin,'missing@example.com',async()=>{throw Error('not found');})).error,'verified-owner-required');
});
test('fixture retries preserve owner edits and reject another owner or revoked identity',()=>{
  const existing={placementId:'fixture',ownerId:'owner',cellCount:12,status:'active',currentVersion:7,title:'Edited by owner'};
  assert.equal(fixtureRetry(existing,'owner').existing,true);
  assert.equal(existing.currentVersion,7);
  assert.equal(fixtureRetry(existing,'other').status,409);
  for(const status of ['deleted','revoked'])assert.equal(fixtureRetry({...existing,status},'owner').status,409);
  assert.equal(fixtureRetry(null,'owner'),null);
});
