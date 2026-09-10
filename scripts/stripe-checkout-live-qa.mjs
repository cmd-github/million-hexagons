import assert from 'node:assert/strict';
import sharp from 'sharp';

const placementsApi='https://europe-west1-million-hexagons.cloudfunctions.net/stagingPlacements';
const checkoutApi='https://europe-west1-million-hexagons.cloudfunctions.net/stagingCheckout';
const origin='https://million-hexagons-staging.million-hexagons.workers.dev';
const post=async(url,body)=>{
  const response=await fetch(url,{method:'POST',headers:{'content-type':'application/json',origin},body:JSON.stringify(body)});
  const text=await response.text();let result;try{result=JSON.parse(text);}catch{result={raw:text};}
  return {response,result};
};

const artwork=await sharp({create:{width:64,height:64,channels:4,background:'#d7ff55'}}).webp({quality:90}).toBuffer();
const artworkDataUrl=`data:image/webp;base64,${artwork.toString('base64')}`;
let reservation;
let checkoutCreated=false;
try{
  for(let attempt=0;attempt<30&&!reservation;attempt++){
    const cell=650000+Math.floor(Math.random()*40000);
    const candidate=await post(placementsApi,{action:'quote-reserve',reservation:{topologyVersion:'geodesic-v1',cells:[cell]}});
    if(candidate.response.status===409)continue;
    assert.ok(candidate.response.ok,JSON.stringify(candidate.result));reservation={...candidate.result,cell};
  }
  assert.ok(reservation,'Could not reserve an available checkout QA cell');
  const placement={topologyVersion:'geodesic-v1',anchor:reservation.cell,cells:[reservation.cell],title:'Stripe checkout QA',description:'Disposable checkout-session test',destinationUrl:'https://example.com/',artworkDataUrl,sourceArtworkDataUrl:artworkDataUrl};
  const checkout=await post(checkoutApi,{reservationId:reservation.reservation.reservationId,checkoutToken:reservation.checkoutToken,placement});
  assert.ok(checkout.response.ok,JSON.stringify(checkout.result));
  assert.match(checkout.result.checkout.clientSecret,/^cs_test_.+_secret_/);
  assert.match(checkout.result.checkout.placementId,/^[0-9a-f-]{36}$/);
  checkoutCreated=true;
  const retry=await post(checkoutApi,{reservationId:reservation.reservation.reservationId,checkoutToken:reservation.checkoutToken,placement});
  assert.ok(retry.response.ok,JSON.stringify(retry.result));assert.equal(retry.result.checkout.clientSecret,checkout.result.checkout.clientSecret);assert.equal(retry.result.checkout.placementId,checkout.result.checkout.placementId);
  console.log(JSON.stringify({stripeCheckoutCreated:true,idempotentRetry:true,serverPrice:reservation.quote.displayTotal,orderId:checkout.result.checkout.orderId},null,2));
}finally{
  if(reservation){
    const release=await post(placementsApi,{action:'release-checkout-reservation',reservationId:reservation.reservation.reservationId,checkoutToken:reservation.checkoutToken});
    assert.ok(release.response.ok,JSON.stringify(release.result));
    assert.equal(release.result.checkoutClosed,checkoutCreated);
    console.log(JSON.stringify({reservationReleased:true,checkoutClosed:release.result.checkoutClosed},null,2));
  }
}
