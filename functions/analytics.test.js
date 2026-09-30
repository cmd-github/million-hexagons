import assert from'node:assert/strict';import test from'node:test';import{metricField,normaliseAnalyticsEvent,normalisePlacementEvent,publicGlobalStats,publicMetrics,eventRateKey,overEventLimit,EVENT_LIMIT_PER_HOUR,EVENT_WINDOW_MS}from'./analytics.js';
const placementId='12345678-1234-1234-1234-123456789abc',sessionId='12345678-1234-1234-1234-123456789abc',eventToken=sessionId;
test('accepts typed bounded events and allowlisted context',()=>assert.deepEqual(normaliseAnalyticsEvent({type:'checkout_started',sessionId,context:{cellCount:12,deviceClass:'mobile',source:'studio',email:'private@example.com'}}),{type:'checkout_started',eventToken:sessionId,context:{cellCount:12,deviceClass:'mobile',source:'studio'}}));
test('requires a permanent ID for placement events',()=>{assert.deepEqual(normaliseAnalyticsEvent({placementId,type:'placement_viewed',sessionId}),{type:'placement_viewed',eventToken:sessionId,placementId});assert.equal(normaliseAnalyticsEvent({type:'placement_viewed',eventToken:sessionId}),null);assert.equal(normaliseAnalyticsEvent({type:'unknown',sessionId}),null);});
test('maps legacy placement events onto typed events',()=>assert.equal(normalisePlacementEvent({placementId,type:'view',sessionId}).type,'placement_viewed'));
test('maps counters and publishes non-negative totals',()=>{assert.equal(metricField('outbound_link_clicked'),'clicks');assert.equal(metricField('placement_shared'),null);assert.deepEqual(publicMetrics({views:12,clicks:-3}),{views:12,clicks:0});assert.deepEqual(publicGlobalStats({claimedCells:25,placements:2,views:3,clicks:1}),{claimedCells:25,remainingCells:999975,placements:2,views:3,clicks:1});});


test('an event carries a per-request token, and the old field name still works',()=>{
  assert.equal(normaliseAnalyticsEvent({type:'globe_viewed',eventToken}).eventToken,eventToken);
  // A client mid-deploy still sends sessionId; dropping those would lose counts.
  assert.equal(normaliseAnalyticsEvent({type:'globe_viewed',sessionId}).eventToken,sessionId);
  assert.equal(normaliseAnalyticsEvent({type:'globe_viewed'}),null);
  assert.equal(normaliseAnalyticsEvent({type:'globe_viewed',eventToken:'short'}),null);
});

test('one address is held to a sane number of events per placement each hour',()=>{
  const digest='a'.repeat(64);
  const key=eventRateKey(digest,1_000_000_000);
  assert.equal(typeof key,'string');
  // The window rotates, so a key from the next hour is a different bucket.
  assert.notEqual(key,eventRateKey(digest,1_000_000_000+EVENT_WINDOW_MS));
  assert.equal(key,eventRateKey(digest,1_000_000_000+60_000),'the same hour is the same bucket');
  assert.equal(eventRateKey('not-a-hash',1_000),null);
  assert.equal(eventRateKey(digest,-1),null);
  assert.equal(overEventLimit(0),false);
  assert.equal(overEventLimit(EVENT_LIMIT_PER_HOUR-1),false);
  assert.equal(overEventLimit(EVENT_LIMIT_PER_HOUR),true);
});
