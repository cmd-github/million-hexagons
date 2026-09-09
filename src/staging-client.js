import { initializeApp } from 'firebase/app';
import { browserLocalPersistence, getAuth, isSignInWithEmailLink, onAuthStateChanged, sendSignInLinkToEmail, setPersistence, signInWithEmailLink, signOut } from 'firebase/auth';

const app = initializeApp({ projectId: 'million-hexagons', appId: '1:715305748057:web:c43a163c413acf4e7a9348', storageBucket: 'million-hexagons.firebasestorage.app', apiKey: 'AIzaSyCaOqQr12ck-mZQm5m73d6wn6F83rBWZmY', authDomain: 'million-hexagons.firebaseapp.com', messagingSenderId: '715305748057' });
const auth = getAuth(app);
await setPersistence(auth, browserLocalPersistence);

export async function completeEmailSignIn() {
  if (!isSignInWithEmailLink(auth, location.href)) return null;
  const email = localStorage.getItem('mh-staging-sign-in-email');
  if (!email) throw new Error('Open the sign-in link on the same browser that requested it.');
  const result = await signInWithEmailLink(auth, email, location.href);
  localStorage.removeItem('mh-staging-sign-in-email'); history.replaceState(null, '', location.pathname);
  return result.user;
}
export async function currentUser() {
  await auth.authStateReady();
  return auth.currentUser;
}
export function watchOwner(callback) { return onAuthStateChanged(auth, callback); }
export async function signOutOwner() { await signOut(auth); }
export async function sendOwnerLink(email) {
  const normalised = String(email || '').trim().toLowerCase();
  await sendSignInLinkToEmail(auth, normalised, { url: `${location.origin}${location.pathname}?ownerSignIn=complete`, handleCodeInApp: true });
  localStorage.setItem('mh-staging-sign-in-email', normalised);
}
export async function createTestClaim(placement) {
  const user = await currentUser();
  if (!user) throw Object.assign(new Error('Sign in before creating a test placement.'), { code: 'authentication-required' });
  const response = await fetch(import.meta.env.VITE_STAGING_API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await user.getIdToken()}` }, body: JSON.stringify({ action: 'create', placement }) });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(result.error || 'Could not create the test placement.'), { code: result.error, cellId: result.cellId });
  return result.placement;
}
async function ownerRequest(body) {
  const user = await currentUser(); if (!user) throw new Error('authentication-required');
  const response = await fetch(import.meta.env.VITE_STAGING_API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await user.getIdToken()}` }, body: JSON.stringify(body) });
  const result = await response.json().catch(() => ({})); if (!response.ok) throw Object.assign(new Error(result.error || 'request-failed'), { code: result.error }); return result;
}
export async function listTestClaims() { return (await ownerRequest({ action: 'list' })).placements; }
export async function deleteTestClaim(placementId) { return (await ownerRequest({ action: 'delete', placementId })).placement; }
export async function getAccountSummary() { return (await ownerRequest({ action: 'account-summary' })).summary; }
