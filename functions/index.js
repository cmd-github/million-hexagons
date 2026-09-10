import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { logger } from 'firebase-functions';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { onRequest } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { defineBoolean, defineSecret, defineString } from 'firebase-functions/params';
import { normaliseSignup } from './signup.js';
import { normaliseDesignState, normaliseDraft } from './drafts.js';
import { issueCredits, redeemCredits } from './credits.js';
import { applyModeration, normaliseModeration, publicPlacement } from './moderation.js';
import { createTestPlacement, decodeCells, deleteTestPlacement, normalisePlacementClaim, placementClaimDiagnostics, updateTestPlacementContent } from './placements.js';
import { decodeArtworkSource, designObjectPath, publicationObjects, sourceObjectPath } from './publication.js';
import { releaseTestReservation, reserveTestCells } from './reservations.js';
import { quoteCells } from './pricing.js';
import Stripe from 'stripe';
import { checkoutLineItem, checkoutOrderId, checkoutOwnerId, paidCheckoutEmail } from './payments.js';

initializeApp();
const stagingSandboxEnabled = defineBoolean('MH_STAGING_SANDBOX', { default: false });
const r2AccountId = defineSecret('MH_R2_ACCOUNT_ID');
const r2AccessKeyId = defineSecret('MH_R2_ACCESS_KEY_ID');
const r2SecretAccessKey = defineSecret('MH_R2_SECRET_ACCESS_KEY');
const stagingQaKey = defineSecret('MH_STAGING_QA_KEY');
const stripeSecretKey = defineSecret('STRIPE_SECRET_KEY');
const stripeWebhookSecret = defineSecret('STRIPE_WEBHOOK_SECRET');
const stagingPublicBucket = defineString('MH_STAGING_PUBLIC_BUCKET', { default: 'million-hexagons-staging-public' });
const stagingAssetOrigin = defineString('MH_STAGING_ASSET_ORIGIN', { default: 'https://assets-staging.millionhexagons.com' });
const privateSourceBucket = 'million-hexagons.firebasestorage.app';

export const launchSignup = onRequest(
  { region: 'europe-west1', maxInstances: 3 },
  async (request, response) => {
    response.set('Cache-Control', 'no-store');

    if (request.method !== 'POST') {
      response.set('Allow', 'POST');
      response.status(405).json({ ok: false });
      return;
    }

    const signup = normaliseSignup(request.body);
    if (signup?.trapped) {
      response.status(200).json({ ok: true });
      return;
    }
    if (!signup) {
      response.status(400).json({ ok: false, error: 'invalid-email' });
      return;
    }

    try {
      const reference = getFirestore().collection('launchSignups').doc(signup.id);
      await getFirestore().runTransaction(async transaction => {
        const existing = await transaction.get(reference);
        const timestamp = FieldValue.serverTimestamp();
        transaction.set(reference, existing.exists ? {
          lastRequestedAt: timestamp
        } : {
          email: signup.email,
          source: 'coming-soon',
          createdAt: timestamp,
          lastRequestedAt: timestamp
        }, { merge: true });
      });
      response.status(200).json({ ok: true });
    } catch (error) {
      logger.error('Launch signup failed', error);
      response.status(500).json({ ok: false });
    }
  }
);

function stagingOrigin(origin) {
  return !origin || origin === 'https://million-hexagons-staging.million-hexagons.workers.dev' || /^https:\/\/([a-z0-9-]+\.)*millionhexagons\.com$/.test(origin) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
}

async function savePrivateArtwork(path, artworkDataUrl, metadata = {}) {
  const source = decodeArtworkSource(artworkDataUrl);
  if (!source) return null;
  const reference = { bucket: privateSourceBucket, path: `${path}.${source.extension}`, mimeType: source.mimeType, extension: source.extension, size: source.bytes.length, sha256: source.sha256 };
  await getStorage().bucket(privateSourceBucket).file(reference.path).save(source.bytes, { resumable: false, contentType: source.mimeType, metadata: { cacheControl: 'private,no-store', metadata: { ...metadata, sha256: source.sha256 } } });
  return reference;
}

async function savePrivateDesign(ownerId, identity, designState, originalArtworkDataUrl = '') {
  const state = normaliseDesignState(designState);
  if (!state) return null;
  const base = designObjectPath(ownerId, identity, 1).replace(/\/design\.json$/, '');
  const original = originalArtworkDataUrl ? await savePrivateArtwork(`${base}/original`, originalArtworkDataUrl, { ownerId, identity }) : null;
  if (originalArtworkDataUrl && !original) return null;
  const bytes = Buffer.from(JSON.stringify({ schemaVersion: 1, designState: state, original }));
  const path = `${base}/design.json`, sha256 = createHash('sha256').update(bytes).digest('hex');
  await getStorage().bucket(privateSourceBucket).file(path).save(bytes, { resumable: false, contentType: 'application/json', metadata: { cacheControl: 'private,no-store', metadata: { ownerId, identity, sha256 } } });
  return { bucket: privateSourceBucket, path, size: bytes.length, sha256, hasOriginal: Boolean(original) };
}

async function loadPrivateDesign(reference) {
  if (!reference?.bucket || !reference?.path) return null;
  const [bytes] = await getStorage().bucket(reference.bucket).file(reference.path).download();
  if (createHash('sha256').update(bytes).digest('hex') !== reference.sha256) throw new Error('private-design-checksum-mismatch');
  const bundle = JSON.parse(bytes.toString('utf8'));
  if (bundle.original) {
    const [original] = await getStorage().bucket(bundle.original.bucket).file(bundle.original.path).download();
    if (createHash('sha256').update(original).digest('hex') !== bundle.original.sha256) throw new Error('private-original-checksum-mismatch');
    bundle.originalArtworkDataUrl = `data:${bundle.original.mimeType};base64,${original.toString('base64')}`;
  }
  delete bundle.original;
  return bundle;
}

export const stagingPlacements = onRequest(
  { region: 'europe-west1', maxInstances: 3, timeoutSeconds: 60, memory: '512MiB', secrets: [stagingQaKey] },
  async (request, response) => {
    response.set('Cache-Control', 'no-store');
    const origin = request.get('Origin');
    if (!stagingOrigin(origin)) { response.status(403).json({ ok: false, error: 'origin-not-allowed' }); return; }
    if (origin) response.set('Access-Control-Allow-Origin', origin).set('Vary', 'Origin');
    response.set('Access-Control-Allow-Headers', 'authorization, content-type');
    response.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    if (request.method === 'OPTIONS') { response.status(204).send(''); return; }
    if (request.method !== 'POST') { response.set('Allow', 'POST, OPTIONS'); response.status(405).json({ ok: false, error: 'method-not-allowed' }); return; }
    if (!stagingSandboxEnabled.value()) { response.status(404).json({ ok: false, error: 'sandbox-disabled' }); return; }

    const action=request.body?.action;
    if(action==='quote-reserve'||action==='release-checkout-reservation'){
      try{
        const token=String(request.body.checkoutToken||'');
        if(action==='release-checkout-reservation'){
          if(token.length<32){response.status(400).json({ok:false,error:'invalid-checkout-token'});return;}
          const ownerId=`checkout:${createHash('sha256').update(token).digest('hex')}`;
          const reservation=await releaseTestReservation(getFirestore(),String(request.body.reservationId||''),ownerId,Date.now());response.status(200).json({ok:true,reservation});return;
        }
        const now=Date.now(),ttlMs=15*60_000,checkoutToken=randomBytes(32).toString('base64url'),ownerId=`checkout:${createHash('sha256').update(checkoutToken).digest('hex')}`,reservationId=randomUUID();
        const cells=request.body.reservation?.cells,quote=quoteCells(Array.isArray(cells)?cells.length:0,now,ttlMs,randomUUID());
        const reservation=await reserveTestCells(getFirestore(),{...request.body.reservation,ownerId},now,ttlMs,reservationId,{quote});
        response.status(201).json({ok:true,quote,reservation,checkoutToken});return;
      }catch(error){const status=error.code==='cells-unavailable'?409:400;response.status(status).json({ok:false,error:error.code||'invalid-reservation',...(error.cellId?{cellId:error.cellId}:{})});return;}
    }

    let identity;
    const qaOwner = request.get('X-MH-QA-Owner');
    if (request.get('X-MH-QA-Key') === stagingQaKey.value() && /^staging-qa-[0-9a-f-]{36}$/.test(String(qaOwner || ''))) {
      identity = { uid: qaOwner, email_verified: true, stagingAdmin: true };
    }
    else {
      const token = request.get('Authorization')?.match(/^Bearer (.+)$/)?.[1];
      if (!token) { response.status(401).json({ ok: false, error: 'authentication-required' }); return; }
      try { identity = await getAuth().verifyIdToken(token); }
      catch { response.status(401).json({ ok: false, error: 'invalid-authentication' }); return; }
    }
    if (!identity.email_verified) { response.status(403).json({ ok: false, error: 'verified-email-required' }); return; }

    try {
      if (action === 'create') {
        const candidate = { ...request.body.placement, ownerId: identity.uid };
        // Older staging clients send only the bounded fallback rendition. Keep
        // them operational during rolling deploys; new clients send the full source.
        const source = decodeArtworkSource(request.body?.placement?.sourceArtworkDataUrl || request.body?.placement?.artworkDataUrl);
        if (!source) { response.status(400).json({ ok: false, error: 'invalid-artwork-source' }); return; }
        if (!normalisePlacementClaim(candidate)) { logger.warn('Rejected invalid staging placement', placementClaimDiagnostics(candidate)); response.status(400).json({ ok: false, error: 'invalid-placement' }); return; }
        const placementId = randomUUID(), path = sourceObjectPath(placementId, 1, source.extension);
        const sourceReference = { bucket: privateSourceBucket, path, mimeType: source.mimeType, extension: source.extension, size: source.bytes.length, sha256: source.sha256 };
        const sourceFile = getStorage().bucket(privateSourceBucket).file(path);
        await sourceFile.save(source.bytes, { resumable: false, contentType: source.mimeType, metadata: { cacheControl: 'private,no-store', metadata: { placementId, version: '1', ownerId: identity.uid, sha256: source.sha256 } } });
        let result;
        const checkoutToken=String(request.body.checkoutToken||''),reservationOwnerId=checkoutToken?`checkout:${createHash('sha256').update(checkoutToken).digest('hex')}`:'';
        try { result = await createTestPlacement(getFirestore(), candidate, FieldValue.serverTimestamp(), { placementId, source: sourceReference, reservationId:String(request.body.reservationId||''), reservationOwnerId, nowMs:Date.now() }); }
        catch (error) { await sourceFile.delete({ ignoreNotFound: true }).catch(cleanupError => logger.warn('Could not remove unclaimed staging source', cleanupError)); throw error; }
        response.status(201).json({ ok: true, placement: result });
        return;
      }
      if (action === 'save-draft') {
        const draft = normaliseDraft(request.body.draft);
        if (!draft) { response.status(400).json({ ok: false, error: 'invalid-draft' }); return; }
        const designSource = await savePrivateDesign(identity.uid, `draft-${draft.draftId}`, draft.designState, request.body.draft.originalArtworkDataUrl);
        if (!designSource) { response.status(400).json({ ok: false, error: 'invalid-design-source' }); return; }
        await getFirestore().collection('stagingDrafts').doc(`${identity.uid}-${draft.draftId}`).set({ ...draft, ownerId: identity.uid, designState: FieldValue.delete(), designSource, environment: 'staging', updatedAt: FieldValue.serverTimestamp(), createdAt: FieldValue.serverTimestamp() }, { merge: true });
        response.status(200).json({ ok: true, draft: { draftId: draft.draftId, title: draft.title, updated: true } });
        return;
      }
      if (action === 'get-draft') {
        const draftId = String(request.body.draftId || ''), document = await getFirestore().collection('stagingDrafts').doc(`${identity.uid}-${draftId}`).get();
        if (!document.exists || document.data().ownerId !== identity.uid || document.data().status === 'deleted') { response.status(404).json({ ok: false, error: 'draft-not-found' }); return; }
        const data = document.data(), bundle = await loadPrivateDesign(data.designSource);
        response.status(200).json({ ok: true, draft: { draftId: data.draftId, title: data.title, description: data.description, destinationUrl: data.destinationUrl, ...bundle } });
        return;
      }
      if (action === 'delete-draft') {
        const draftId = String(request.body.draftId || ''), reference = getFirestore().collection('stagingDrafts').doc(`${identity.uid}-${draftId}`), document = await reference.get();
        if (!document.exists || document.data().ownerId !== identity.uid) { response.status(404).json({ ok: false, error: 'draft-not-found' }); return; }
        await reference.set({ status: 'deleted', deletedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
        response.status(200).json({ ok: true, draft: { draftId, status: 'deleted' } });
        return;
      }
      if (action === 'update-content') {
        const placementId = String(request.body.placementId || ''), operationId = randomUUID();
        const source = await savePrivateArtwork(`staging-placement-sources/${placementId}/pending/${operationId}/artwork`, request.body.content?.sourceArtworkDataUrl || request.body.content?.artworkDataUrl, { placementId, ownerId: identity.uid });
        const designSource = await savePrivateDesign(identity.uid, `placement-${placementId}-${operationId}`, request.body.content?.designState, request.body.content?.originalArtworkDataUrl);
        if (!source || !designSource) { response.status(400).json({ ok: false, error: 'invalid-design-source' }); return; }
        const result = await updateTestPlacementContent(getFirestore(), placementId, identity.uid, request.body.content, FieldValue.serverTimestamp(), source, designSource);
        response.status(200).json({ ok: true, placement: result });
        return;
      }
      if (action === 'get-content-source') {
        const placementId = String(request.body.placementId || ''), placement = await getFirestore().collection('stagingPlacements').doc(placementId).get();
        if (!placement.exists || placement.data().ownerId !== identity.uid || placement.data().status === 'deleted') { response.status(404).json({ ok: false, error: 'placement-not-found' }); return; }
        const version = Number(request.body.version || placement.data().currentVersion || 1), content = await getFirestore().collection('stagingPlacementVersions').doc(`${placementId}-v${version}`).get();
        if (!content.exists || !content.data().designSource) { response.status(404).json({ ok: false, error: 'design-source-not-found' }); return; }
        response.status(200).json({ ok: true, placement: { placementId, version, ...(await loadPrivateDesign(content.data().designSource)) } });
        return;
      }
      if (action === 'reserve') {
        const ttlMs = identity.uid.startsWith('staging-qa-') ? Math.max(1000, Math.min(15 * 60_000, Number(request.body.ttlMs) || 15 * 60_000)) : 15 * 60_000;
        const result = await reserveTestCells(getFirestore(), { ...request.body.reservation, ownerId: identity.uid }, Date.now(), ttlMs);
        response.status(201).json({ ok: true, reservation: result });
        return;
      }
      if (action === 'moderate') {
        if(identity.stagingAdmin!==true){response.status(403).json({ok:false,error:'administrator-required'});return;}
        const command=normaliseModeration(request.body.command),placementId=String(request.body.placementId||'');if(!command){response.status(400).json({ok:false,error:'invalid-moderation'});return;}
        const reference=getFirestore().collection('stagingPlacements').doc(placementId),placement=await reference.get();if(!placement.exists){response.status(404).json({ok:false,error:'placement-not-found'});return;}
        let versionContent=null;if(command.action==='restore-version'){const version=await getFirestore().collection('stagingPlacementVersions').doc(`${placementId}-v${command.version}`).get();if(!version.exists){response.status(404).json({ok:false,error:'version-not-found'});return;}versionContent=version.data();}
        const publicState=applyModeration(placement.data().publicState,command,versionContent),caseId=randomUUID();await getFirestore().runTransaction(async transaction=>{transaction.set(reference,{publicState,updatedAt:FieldValue.serverTimestamp()},{merge:true});transaction.create(getFirestore().collection('stagingModerationActions').doc(caseId),{caseId,placementId,command,actorId:identity.uid,createdAt:FieldValue.serverTimestamp()});});response.status(200).json({ok:true,placement:{placementId,publicState}});return;
      }
      if (action === 'grant-credits') {if(identity.stagingAdmin!==true){response.status(403).json({ok:false,error:'administrator-required'});return;}const result=await issueCredits(getFirestore(),{ownerId:String(request.body.ownerId||''),amount:request.body.amount,reason:String(request.body.reason||''),actorId:identity.uid,idempotencyKey:String(request.body.idempotencyKey||randomUUID())},FieldValue.serverTimestamp());response.status(200).json({ok:true,credits:result});return;}
      if (action === 'redeem-credits') {const result=await redeemCredits(getFirestore(),{ownerId:identity.uid,amount:request.body.amount,placementId:String(request.body.placementId||''),idempotencyKey:String(request.body.idempotencyKey||randomUUID())},FieldValue.serverTimestamp());response.status(200).json({ok:true,credits:result});return;}
      if (action === 'account-summary') {const [placements,balance]=await Promise.all([getFirestore().collection('stagingPlacements').where('ownerId','==',identity.uid).get(),getFirestore().collection('stagingCreditBalances').doc(identity.uid).get()]);response.status(200).json({ok:true,summary:{placements:placements.docs.filter(doc=>!['deleted','revoked'].includes(doc.data().status)).length,credits:Number(balance.data()?.available||0),administrator:identity.stagingAdmin===true}});return;}
      if (action === 'admin-lookup') {
        if(identity.stagingAdmin!==true){response.status(403).json({ok:false,error:'administrator-required'});return;}
        const query=String(request.body.query||'').trim();if(!query){response.status(400).json({ok:false,error:'query-required'});return;}
        const db=getFirestore();let documents=[];
        const exact=await db.collection('stagingPlacements').doc(query).get();
        if(exact.exists)documents=[exact];
        else {
          let ownerId=query;
          if(query.includes('@')){try{ownerId=(await getAuth().getUserByEmail(query.toLowerCase())).uid;}catch{ownerId='';}}
          if(ownerId)documents=(await db.collection('stagingPlacements').where('ownerId','==',ownerId).get()).docs;
        }
        const placements=await Promise.all(documents.slice(0,25).map(async document=>{
          const placement=document.data(),currentVersion=Number(placement.currentVersion||1);
          const [versions,actions,balance,creditEntries]=await Promise.all([
            Promise.all(Array.from({length:Math.min(currentVersion,50)},(_,index)=>db.collection('stagingPlacementVersions').doc(`${placement.placementId}-v${index+1}`).get())),
            db.collection('stagingModerationActions').where('placementId','==',placement.placementId).get(),
            db.collection('stagingCreditBalances').doc(placement.ownerId).get(),
            db.collection('stagingCreditLedger').where('ownerId','==',placement.ownerId).get()
          ]);
          const versionRows=versions.filter(item=>item.exists).map(item=>{const data=item.data();return{version:Number(data.version||item.id.match(/-v(\d+)$/)?.[1]||0),title:data.title||'',description:data.description||'',destinationUrl:data.destinationUrl||'',publicationStatus:data.publication?.status||'preview-only'};});
          const actionRows=[...actions.docs.map(item=>{const data=item.data();return{caseId:data.caseId||item.id,action:data.command?.action||data.action,reason:data.command?.reason||data.reason||'',actorId:data.actorId||'',createdAt:data.createdAt?.toMillis?.()||null,creditAmount:Number(data.creditAmount||0)};}),...creditEntries.docs.map(item=>{const data=item.data();return{caseId:data.entryId||item.id,action:`credit-${data.type||'entry'}`,reason:data.reason||data.placementId||'',actorId:data.actorId||data.ownerId||'',createdAt:data.createdAt?.toMillis?.()||null,creditAmount:Number(data.delta||0)};})].sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
          return{placementId:placement.placementId,ownerId:placement.ownerId,status:placement.status||'active',cellCount:Number(placement.cellCount||0),currentVersion,publicState:placement.publicState||{},createdAt:placement.createdAt?.toMillis?.()||null,credits:Number(balance.data()?.available||0),versions:versionRows,actions:actionRows};
        }));
        response.status(200).json({ok:true,result:{query,placements}});return;
      }
      if (action === 'release-reservation' || action === 'expire-reservation') {
        const result = await releaseTestReservation(getFirestore(), String(request.body.reservationId || ''), identity.uid, Date.now(), { expiredOnly: action === 'expire-reservation' });
        response.status(200).json({ ok: true, reservation: result });
        return;
      }
      if (action === 'delete') {
        const placementId = String(request.body.placementId || ''), versionRef = getFirestore().collection('stagingPlacementVersions').doc(`${placementId}-v1`), version = await versionRef.get();
        const result = await deleteTestPlacement(getFirestore(), placementId, FieldValue.serverTimestamp(), identity.stagingAdmin === true ? null : identity.uid);
        const source = version.data()?.source;
        if (source?.bucket && source?.path) await getStorage().bucket(source.bucket).file(source.path).delete({ ignoreNotFound: true }).catch(error => logger.warn('Could not remove deleted staging source', { placementId, message: error.message }));
        response.status(200).json({ ok: true, placement: result });
        return;
      }
      if (action === 'revoke') {
        if(identity.stagingAdmin!==true){response.status(403).json({ok:false,error:'administrator-required'});return;}
        const placementId=String(request.body.placementId||''),reference=getFirestore().collection('stagingPlacements').doc(placementId),snapshot=await reference.get();if(!snapshot.exists){response.status(404).json({ok:false,error:'placement-not-found'});return;}
        const reason=String(request.body.reason||'').trim().slice(0,300);if(!reason){response.status(400).json({ok:false,error:'reason-required'});return;}
        const released=await deleteTestPlacement(getFirestore(),placementId,FieldValue.serverTimestamp(),null);await reference.set({status:'revoked',revokedAt:FieldValue.serverTimestamp(),revocationReason:reason},{merge:true});
        let credits=null;if(Number(request.body.creditAmount)>0)credits=await issueCredits(getFirestore(),{ownerId:snapshot.data().ownerId,amount:request.body.creditAmount,reason:`Placement revocation: ${reason}`,actorId:identity.uid,idempotencyKey:`revoke-${placementId}`},FieldValue.serverTimestamp());
        await getFirestore().collection('stagingModerationActions').doc(randomUUID()).set({placementId,action:'revoke',reason,creditAmount:Number(request.body.creditAmount)||0,actorId:identity.uid,createdAt:FieldValue.serverTimestamp()});response.status(200).json({ok:true,placement:{placementId,status:'revoked',releasedCells:released.releasedCells},credits});return;
      }
      if (action === 'list') {
        const snapshot = await getFirestore().collection('stagingPlacements').where('ownerId', '==', identity.uid).get();
        const active = snapshot.docs.map(document => document.data()).filter(placement => !['deleted','revoked'].includes(placement.status));
        const versions = await Promise.all(active.map(placement => getFirestore().collection('stagingPlacementVersions').doc(`${placement.placementId}-v${placement.publicState?.publicVersion || placement.currentVersion || 1}`).get()));
        const placements = active.map((placement, index) => { const content = versions[index].data() || {},visible=publicPlacement(content,placement.publicState); return { placementId: placement.placementId, topologyVersion: placement.topologyVersion, anchor: placement.anchor, cells: decodeCells(placement.cellsData), cellCount: placement.cellCount, ...visible, publicationStatus: content.publication?.status || 'preview-only', status: placement.status, createdAt: placement.createdAt?.toMillis?.() || null }; });
        response.status(200).json({ ok: true, placements });
        return;
      }
      response.status(400).json({ ok: false, error: 'unknown-action' });
    } catch (error) {
      const status = ['cells-unavailable','reservation-not-expired','reservation-exists','insufficient-credits'].includes(error.code) ? 409 : ['placement-not-found','reservation-not-found'].includes(error.code) ? 404 : ['placement-forbidden','reservation-forbidden'].includes(error.code) ? 403 : ['invalid-placement','invalid-reservation','invalid-credit-entry'].includes(error.code) ? 400 : 500;
      if (status === 500) logger.error('Staging placement request failed', error);
      response.status(status).json({ ok: false, error: status === 500 ? 'request-failed' : error.code, ...(error.cellId ? { cellId: error.cellId } : {}) });
    }
  }
);

export const expireStagingReservations=onSchedule({schedule:'every 5 minutes',region:'europe-west1',maxInstances:1},async()=>{
  if(!stagingSandboxEnabled.value())return;
  const now=Date.now(),snapshot=await getFirestore().collection('stagingReservations').where('expiresAtMs','<=',now).limit(100).get();
  await Promise.all(snapshot.docs.filter(document=>document.data().status==='active').map(document=>releaseTestReservation(getFirestore(),document.id,document.data().ownerId,now,{expiredOnly:true}).catch(error=>logger.warn('Could not expire staging reservation',{reservationId:document.id,message:error.message}))));
});

export const stagingCheckout=onRequest({region:'europe-west1',maxInstances:3,timeoutSeconds:60,memory:'512MiB',secrets:[stripeSecretKey]},async(request,response)=>{
  response.set('Cache-Control','no-store');const origin=request.get('Origin');if(!stagingOrigin(origin)){response.status(403).json({ok:false,error:'origin-not-allowed'});return;}if(origin)response.set('Access-Control-Allow-Origin',origin).set('Vary','Origin');response.set('Access-Control-Allow-Headers','content-type').set('Access-Control-Allow-Methods','POST, OPTIONS');if(request.method==='OPTIONS'){response.status(204).send('');return;}if(request.method!=='POST'){response.status(405).json({ok:false,error:'method-not-allowed'});return;}if(!stagingSandboxEnabled.value()){response.status(404).json({ok:false,error:'sandbox-disabled'});return;}
  try{
    const reservationId=String(request.body?.reservationId||''),checkoutToken=String(request.body?.checkoutToken||''),orderId=checkoutOrderId(reservationId),db=getFirestore(),reservationSnapshot=await db.collection('stagingReservations').doc(reservationId).get(),reservation=reservationSnapshot.data();
    if(!reservationSnapshot.exists||reservation.status!=='active'||reservation.ownerId!==checkoutOwnerId(checkoutToken)||Number(reservation.expiresAtMs)<=Date.now()){response.status(409).json({ok:false,error:'reservation-invalid'});return;}
    const candidate={...request.body.placement,ownerId:'pending-payment'};if(!normalisePlacementClaim(candidate)||candidate.cells.map(Number).sort((a,b)=>a-b).join(',')!==decodeCells(reservation.cellsData).join(',')){response.status(400).json({ok:false,error:'invalid-placement'});return;}
    const orderRef=db.collection('stagingOrders').doc(orderId),existing=await orderRef.get();if(existing.exists&&existing.data().checkoutUrl){response.status(200).json({ok:true,checkout:{orderId,url:existing.data().checkoutUrl}});return;}
    let placementId=existing.data()?.placementId,sourceReference=existing.data()?.source,placement=existing.data()?.placement;
    if(!existing.exists){
      const source=decodeArtworkSource(candidate.sourceArtworkDataUrl||candidate.artworkDataUrl);if(!source){response.status(400).json({ok:false,error:'invalid-artwork-source'});return;}
      placementId=randomUUID();const path=sourceObjectPath(placementId,1,source.extension);sourceReference={bucket:privateSourceBucket,path,mimeType:source.mimeType,extension:source.extension,size:source.bytes.length,sha256:source.sha256};
      await getStorage().bucket(privateSourceBucket).file(path).save(source.bytes,{resumable:false,contentType:source.mimeType,metadata:{cacheControl:'private,no-store',metadata:{placementId,orderId,sha256:source.sha256}}});
      placement={topologyVersion:candidate.topologyVersion,anchor:candidate.anchor,cells:candidate.cells,title:candidate.title,description:candidate.description,destinationUrl:candidate.destinationUrl,artworkDataUrl:candidate.artworkDataUrl};
      await orderRef.set({orderId,reservationId,reservationOwnerId:reservation.ownerId,placementId,placement,source:sourceReference,quote:reservation.quote,status:'checkout-creating',environment:'staging',createdAt:FieldValue.serverTimestamp()},{merge:false});
    }
    const stripe=new Stripe(stripeSecretKey.value());const session=await stripe.checkout.sessions.create({mode:'payment',line_items:[checkoutLineItem(reservation.quote)],customer_creation:'always',success_url:'https://million-hexagons-staging.million-hexagons.workers.dev/?checkout=success&session_id={CHECKOUT_SESSION_ID}',cancel_url:'https://million-hexagons-staging.million-hexagons.workers.dev/?checkout=cancelled',metadata:{orderId,reservationId,placementId},payment_intent_data:{metadata:{orderId,reservationId,placementId}}},{idempotencyKey:orderId});
    await orderRef.set({stripeCheckoutSessionId:session.id,checkoutUrl:session.url,status:'checkout-open',updatedAt:FieldValue.serverTimestamp()},{merge:true});response.status(201).json({ok:true,checkout:{orderId,url:session.url}});
  }catch(error){logger.error('Could not create Stripe checkout',error);response.status(500).json({ok:false,error:'checkout-failed'});}
});

export const stripeWebhook=onRequest({region:'europe-west1',maxInstances:3,timeoutSeconds:60,memory:'512MiB',secrets:[stripeSecretKey,stripeWebhookSecret]},async(request,response)=>{
  if(request.method!=='POST'){response.status(405).send('method-not-allowed');return;}let event;try{event=new Stripe(stripeSecretKey.value()).webhooks.constructEvent(request.rawBody,request.get('stripe-signature'),stripeWebhookSecret.value());}catch(error){response.status(400).send(`invalid-signature: ${error.message}`);return;}
  const eventRef=getFirestore().collection('stagingStripeEvents').doc(event.id),existingEvent=await eventRef.get();if(existingEvent.exists&&existingEvent.data().status==='processed'){response.status(200).json({received:true,duplicate:true});return;}
  try{
    await eventRef.set({eventId:event.id,type:event.type,status:'processing',receivedAt:FieldValue.serverTimestamp()},{merge:true});
    if(event.type==='checkout.session.completed'){
      const session=event.data.object,email=paidCheckoutEmail(session),orderId=String(session.metadata?.orderId||'');if(!email||!orderId)throw new Error('invalid-paid-session');
      const db=getFirestore(),orderRef=db.collection('stagingOrders').doc(orderId),orderSnapshot=await orderRef.get();if(!orderSnapshot.exists)throw new Error('order-not-found');const order=orderSnapshot.data();
      let user;try{user=await getAuth().getUserByEmail(email);}catch(error){if(error.code!=='auth/user-not-found')throw error;user=await getAuth().createUser({email,emailVerified:false,displayName:order.placement.title});}
      const result=await createTestPlacement(db,{...order.placement,ownerId:user.uid},FieldValue.serverTimestamp(),{placementId:order.placementId,source:order.source,reservationId:order.reservationId,reservationOwnerId:order.reservationOwnerId,nowMs:Date.now()}).catch(async error=>{const placement=await db.collection('stagingPlacements').doc(order.placementId).get();if(placement.exists)return{placementId:order.placementId,cellCount:placement.data().cellCount,status:placement.data().status};throw error;});
      await orderRef.set({status:'fulfilled',ownerId:user.uid,buyerEmail:email,stripePaymentIntentId:session.payment_intent,paidAmountMinor:session.amount_total,currency:session.currency,fulfilledAt:FieldValue.serverTimestamp(),placement:FieldValue.delete(),result},{merge:true});
    }else if(event.type==='checkout.session.expired'){const orderId=String(event.data.object.metadata?.orderId||'');if(orderId)await getFirestore().collection('stagingOrders').doc(orderId).set({status:'checkout-expired',updatedAt:FieldValue.serverTimestamp()},{merge:true});}
    await eventRef.set({status:'processed',processedAt:FieldValue.serverTimestamp()},{merge:true});response.status(200).json({received:true});
  }catch(error){logger.error('Stripe webhook processing failed',{eventId:event.id,message:error.message});await eventRef.set({status:'failed',error:String(error.message).slice(0,200),updatedAt:FieldValue.serverTimestamp()},{merge:true});response.status(500).send('webhook-processing-failed');}
});

export const publishStagingPlacement = onDocumentCreated(
  { document: 'stagingPlacementVersions/{versionId}', region: 'europe-west1', retry: true, timeoutSeconds: 120, memory: '512MiB', maxInstances: 2, secrets: [r2AccountId, r2AccessKeyId, r2SecretAccessKey] },
  async event => {
    const snapshot = event.data, version = snapshot?.data();
    if (!snapshot || version?.environment !== 'staging' || !version.source || version.publication?.status === 'published') return;
    const attempts = Number(version.publication?.attempts || 0) + 1;
    await snapshot.ref.set({ publication: { ...version.publication, status: 'processing', attempts, startedAt: FieldValue.serverTimestamp() } }, { merge: true });
    try {
      const [bytes] = await getStorage().bucket(version.source.bucket).file(version.source.path).download();
      const decoded = decodeArtworkSource(`data:${version.source.mimeType};base64,${bytes.toString('base64')}`);
      if (!decoded || decoded.sha256 !== version.source.sha256) throw new Error('private-source-checksum-mismatch');
      const objects = publicationObjects(version), client = new S3Client({ region: 'auto', endpoint: `https://${r2AccountId.value()}.r2.cloudflarestorage.com`, credentials: { accessKeyId: r2AccessKeyId.value(), secretAccessKey: r2SecretAccessKey.value() }, maxAttempts: 5 });
      const bucket = stagingPublicBucket.value();
      await client.send(new PutObjectCommand({ Bucket: bucket, Key: objects.artworkKey, Body: bytes, ContentType: version.source.mimeType, CacheControl: 'public,max-age=31536000,immutable', Metadata: { sha256: version.source.sha256, placementid: version.placementId, version: String(version.version) } }));
      await client.send(new PutObjectCommand({ Bucket: bucket, Key: objects.metadataKey, Body: Buffer.from(JSON.stringify(objects.metadata)), ContentType: 'application/json; charset=utf-8', CacheControl: 'public,max-age=31536000,immutable' }));
      const origin = stagingAssetOrigin.value().replace(/\/$/, ''), artworkUrl = `${origin}/${objects.artworkKey}`, metadataUrl = `${origin}/${objects.metadataKey}`;
      await getFirestore().runTransaction(async transaction => {
        const currentVersion = await transaction.get(snapshot.ref);
        if (!currentVersion.exists || currentVersion.data().status === 'placement-deleted') return;
        const placementRef = getFirestore().collection('stagingPlacements').doc(version.placementId), placement = await transaction.get(placementRef);
        transaction.set(snapshot.ref, { publication: { status: 'published', attempts, artworkUrl, metadataUrl, artworkKey: objects.artworkKey, metadataKey: objects.metadataKey, publishedAt: FieldValue.serverTimestamp() } }, { merge: true });
        if (placement.exists && placement.data().status !== 'deleted' && Number(placement.data().currentVersion) === Number(version.version)) transaction.set(placementRef, { currentPublishedVersion: version.version, publishedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      });
    } catch (error) {
      logger.error('Staging placement publication failed', { versionId: event.params.versionId, message: error.message });
      await snapshot.ref.set({ publication: { status: 'failed', attempts, error: String(error.message || 'publication-failed').slice(0, 160), failedAt: FieldValue.serverTimestamp() } }, { merge: true });
      throw error;
    }
  }
);
