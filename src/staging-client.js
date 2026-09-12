import { initializeApp } from 'firebase/app';
import { browserLocalPersistence, getAuth, isSignInWithEmailLink, onAuthStateChanged, sendSignInLinkToEmail, setPersistence, signInWithEmailLink, signOut } from 'firebase/auth';

const app = initializeApp({ projectId: 'million-hexagons', appId: '1:715305748057:web:c43a163c413acf4e7a9348', storageBucket: 'million-hexagons.firebasestorage.app', apiKey: 'AIzaSyCaOqQr12ck-mZQm5m73d6wn6F83rBWZmY', authDomain: 'million-hexagons.firebaseapp.com', messagingSenderId: '715305748057' });
const auth = getAuth(app);
await setPersistence(auth, browserLocalPersistence);
const qa = import.meta.env.DEV ? globalThis.__MH_OWNER_QA__ : null;

export function hasPendingEmailSignIn() { return isSignInWithEmailLink(auth, location.href); }
export async function completeEmailSignIn(providedEmail = '') {
  if (!isSignInWithEmailLink(auth, location.href)) return null;
  const email = String(providedEmail || localStorage.getItem('mh-staging-sign-in-email') || '').trim().toLowerCase();
  if (!email) throw Object.assign(new Error('Enter the email address that received this link to finish signing in.'), { code: 'email-required' });
  const result = await signInWithEmailLink(auth, email, location.href);
  localStorage.removeItem('mh-staging-sign-in-email'); history.replaceState(null, '', location.pathname);
  return result.user;
}
export async function currentUser() {
  if (qa) return qa.user || null;
  await auth.authStateReady();
  return auth.currentUser;
}
export function watchOwner(callback) { if(qa){queueMicrotask(()=>callback(qa.user||null));return()=>{};} return onAuthStateChanged(auth, callback); }
export async function signOutOwner() { if(qa){qa.user=null;return;} await signOut(auth); }
export async function sendOwnerLink(email) {
  const normalised = String(email || '').trim().toLowerCase();
  await sendSignInLinkToEmail(auth, normalised, { url: `${location.origin}${location.pathname}?ownerSignIn=complete`, handleCodeInApp: true });
  localStorage.setItem('mh-staging-sign-in-email', normalised);
}
export async function createTestClaim(placement, checkout = null) {
  const user = await currentUser();
  if (!user) throw Object.assign(new Error('Sign in before creating a test placement.'), { code: 'authentication-required' });
  const response = await fetch(import.meta.env.VITE_STAGING_API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await user.getIdToken()}` }, body: JSON.stringify({ action: 'create', placement, ...(checkout||{}) }) });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(result.error || 'Could not create the test placement.'), { code: result.error, cellId: result.cellId });
  return result.placement;
}
async function publicRequest(body){const response=await fetch(import.meta.env.VITE_STAGING_API_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const result=await response.json().catch(()=>({}));if(!response.ok)throw Object.assign(new Error(result.error||'request-failed'),{code:result.error,cellId:result.cellId});return result;}
export async function artworkRequest(body){const response=await fetch(import.meta.env.DEV?import.meta.env.VITE_STAGING_API_URL:'/api/artwork/state',import.meta.env.DEV?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(10000)}:{signal:AbortSignal.timeout(10000)});if(!response.ok)throw Error('Artwork state unavailable');return response.json();}
export async function quoteAndReserve(cells){return publicRequest({action:'quote-reserve',reservation:{topologyVersion:'geodesic-v1',cells}});}
export async function releaseCheckoutReservation(reservationId,checkoutToken){return(await publicRequest({action:'release-checkout-reservation',reservationId,checkoutToken})).reservation;}
export async function listPublicClaims(){return(await publicRequest({action:'public-list'})).placements;}
export async function getPublicPlacement(placementId){return(await publicRequest({action:'public-placement',placementId})).placement;}
export async function getPublicStats(){return publicRequest({action:'public-stats'});}
export async function searchPublicPlacements(query){return(await publicRequest({action:'public-search',query})).placements;}
export async function trackEvent(event){return publicRequest({action:'record-event',event});}
export async function recordPlacementEvent(placementId,type,sessionId){return(await trackEvent({placementId,type:type==='view'?'placement_viewed':'outbound_link_clicked',sessionId})).metrics;}
export async function createStripeCheckout(placement,reservationId,checkoutToken){const response=await fetch(import.meta.env.VITE_STAGING_CHECKOUT_URL||'https://europe-west1-million-hexagons.cloudfunctions.net/stagingCheckout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({placement,reservationId,checkoutToken})});const result=await response.json().catch(()=>({}));if(!response.ok)throw Object.assign(new Error(result.error||'checkout-failed'),{code:result.error});return result.checkout;}
async function ownerRequest(body) {
  const user = await currentUser(); if (!user) throw new Error('authentication-required');
  const response = await fetch(import.meta.env.VITE_STAGING_API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await user.getIdToken()}` }, body: JSON.stringify(body) });
  const result = await response.json().catch(() => ({})); if (!response.ok) throw Object.assign(new Error(result.error || 'request-failed'), { code: result.error }); return result;
}
export async function listTestClaims() { return (await ownerRequest({ action: 'list' })).placements; }
export async function deleteTestClaim(placementId) { return (await ownerRequest({ action: 'delete', placementId })).placement; }
export async function getAccountSummary() { return (await ownerRequest({ action: 'account-summary' })).summary; }
export async function updatePlacementMetadata(placementId, content) { return (await ownerRequest({ action: 'update-metadata', placementId, content })).placement; }
export async function getPlacementContentSource(placementId,version) { return (await ownerRequest({ action: 'get-content-source', placementId, version })).placement; }
export async function updatePlacementContent(placementId,content) { return (await ownerRequest({ action: 'update-content', placementId, content })).placement; }
export async function adminLookup(query) { return (await ownerRequest({ action: 'admin-lookup', query })).result; }
export async function moderateTestClaim(placementId, command) { return (await ownerRequest({ action: 'moderate', placementId, command })).placement; }
export async function grantTestCredits(ownerId, amount, reason) { return (await ownerRequest({ action: 'grant-credits', ownerId, amount, reason, idempotencyKey: crypto.randomUUID() })).credits; }
export async function revokeTestClaim(placementId, reason, creditAmount) { return (await ownerRequest({ action: 'revoke', placementId, reason, creditAmount })).placement; }
export async function refundTestPayment(placementId, amountMinor, reason) { return (await ownerRequest({ action: 'admin-refund', placementId, amountMinor, reason })).refund; }
