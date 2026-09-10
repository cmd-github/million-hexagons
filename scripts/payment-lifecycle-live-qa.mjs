import assert from 'node:assert/strict';
import fs from 'node:fs';
import Stripe from '../functions/node_modules/stripe/esm/stripe.esm.node.js';
import sharp from 'sharp';

const env=Object.fromEntries(fs.readFileSync('.env.staging.local','utf8').split(/\r?\n/).filter(line=>line&&!line.startsWith('#')).map(line=>{const at=line.indexOf('=');return[line.slice(0,at).trim(),line.slice(at+1).trim()];}));
const qaKey=env.MH_STAGING_QA_KEY||env.MH_R2_SECRET_ACCESS_KEY,secret=process.env.STRIPE_SECRET_KEY;
assert.ok(qaKey,'Set MH_STAGING_QA_KEY in ignored .env.staging.local');assert.match(secret||'',/^sk_test_/,'Provide STRIPE_SECRET_KEY test secret');
const stripe=new Stripe(secret),placementsApi='https://europe-west1-million-hexagons.cloudfunctions.net/stagingPlacements',checkoutApi='https://europe-west1-million-hexagons.cloudfunctions.net/stagingCheckout',reconcileApi='https://europe-west1-million-hexagons.cloudfunctions.net/reconcileStagingPaymentsNow',origin='https://million-hexagons-staging.million-hexagons.workers.dev';
const post=async(url,body,headers={})=>{const response=await fetch(url,{method:'POST',headers:{'content-type':'application/json',origin,...headers},body:JSON.stringify(body)}),text=await response.text();let result;try{result=JSON.parse(text);}catch{result={raw:text};}return{response,result};};
const waitFor=async predicate=>{for(let attempt=0;attempt<30;attempt++){const status=await post(placementsApi,{action:'admin-payment-status',orderId},{'X-MH-QA-Key':qaKey,'X-MH-QA-Owner':`staging-qa-${crypto.randomUUID()}`});if(status.response.ok&&predicate(status.result))return status.result;await new Promise(resolve=>setTimeout(resolve,1000));}throw Error('Timed out waiting for signed Stripe webhook processing');};
const artwork=await sharp({create:{width:32,height:32,channels:4,background:'#d7ff55'}}).webp().toBuffer(),artworkDataUrl=`data:image/webp;base64,${artwork.toString('base64')}`;
let reservation,orderId,reconciliation;
try{
  for(let attempt=0;attempt<30&&!reservation;attempt++){const cell=720000+Math.floor(Math.random()*30000),candidate=await post(placementsApi,{action:'quote-reserve',reservation:{topologyVersion:'geodesic-v1',cells:[cell]}});if(candidate.response.status===409)continue;assert.ok(candidate.response.ok,JSON.stringify(candidate.result));reservation={...candidate.result,cell};}
  assert.ok(reservation,'Could not reserve a payment lifecycle QA cell');
  const placement={topologyVersion:'geodesic-v1',anchor:reservation.cell,cells:[reservation.cell],title:'Payment lifecycle QA',description:'Disposable webhook test',destinationUrl:'https://example.com/',artworkDataUrl,sourceArtworkDataUrl:artworkDataUrl};
  const checkout=await post(checkoutApi,{reservationId:reservation.reservation.reservationId,checkoutToken:reservation.checkoutToken,placement});assert.ok(checkout.response.ok,JSON.stringify(checkout.result));orderId=checkout.result.checkout.orderId;
  const sessionId=checkout.result.checkout.clientSecret.split('_secret_')[0];await stripe.checkout.sessions.expire(sessionId);
  reconciliation=await post(reconcileApi,{}, {'X-MH-QA-Key':qaKey});assert.ok(reconciliation.response.ok,JSON.stringify(reconciliation.result));assert.equal(reconciliation.result.failed,0);assert.ok(reconciliation.result.closed>=1,JSON.stringify(reconciliation.result));reservation=null;
  await stripe.paymentIntents.create({amount:100,currency:'usd',payment_method:'pm_card_visa_chargeDeclined',payment_method_types:['card'],confirm:true,metadata:{orderId}},{idempotencyKey:`${orderId}-declined`}).catch(error=>assert.equal(error.type,'StripeCardError'));
  await waitFor(result=>result.events.some(event=>event.type==='payment_intent.payment_failed'&&event.status==='processed')&&result.orders.some(order=>order.orderId===orderId&&order.paymentStatus==='failed-attempt'));
  const payment=await stripe.paymentIntents.create({amount:100,currency:'usd',payment_method:'pm_card_visa',payment_method_types:['card'],confirm:true,metadata:{orderId}},{idempotencyKey:`${orderId}-paid`});assert.equal(payment.status,'succeeded');
  const refund=await stripe.refunds.create({payment_intent:payment.id,metadata:{orderId}},{idempotencyKey:`${orderId}-refund`});assert.equal(refund.status,'succeeded');
  const finalStatus=await waitFor(result=>result.events.some(event=>event.type==='charge.refunded'&&event.status==='processed')&&result.orders.some(order=>order.orderId===orderId&&order.paymentStatus==='refunded'&&order.ownershipOutcome==='retained-pending-policy'));
  console.log(JSON.stringify({declinedWebhook:true,refundWebhook:true,ownershipOutcome:'retained-pending-policy',reconciliation:reconciliation.result,orderId,refundId:refund.id,eventCount:finalStatus.events.length},null,2));
}finally{
  if(reservation)await post(placementsApi,{action:'release-checkout-reservation',reservationId:reservation.reservation.reservationId,checkoutToken:reservation.checkoutToken}).catch(()=>{});
}
