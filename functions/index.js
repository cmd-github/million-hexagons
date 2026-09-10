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
import { checkoutLineItem, checkoutOrderId, checkoutOwnerId, paidCheckoutEmail, paidEmailOwnerId } from './payments.js';
import { ownerIdsForIdentity } from './owner-access.js';
import { checkoutSessionState, paymentFailure, refundState } from './payment-lifecycle.js';

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

async function ownerPlacementDocuments(db, ownerIds) {
  const snapshots = await Promise.all(ownerIds.map(ownerId => db.collection('stagingPlacements').where('ownerId', '==', ownerId).get()));
  const documents = new Map();
  snapshots.forEach(snapshot => snapshot.docs.forEach(document => documents.set(document.id, document)));
  return [...documents.values()];
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
  { region: 'europe-west1', maxInstances: 3, timeoutSeconds: 60, memory: '512MiB', secrets: [stagingQaKey,stripeSecretKey] },
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
    if(action==='public-list'){
      const snapshot=await getFirestore().collection('stagingPlacements').limit(1000).get(),active=snapshot.docs.map(document=>document.data()).filter(placement=>!['deleted','revoked'].includes(placement.status));
      const versions=await Promise.all(active.map(placement=>getFirestore().collection('stagingPlacementVersions').doc(`${placement.placementId}-v${placement.publicState?.publicVersion||placement.currentVersion||1}`).get()));
      const placements=active.map((placement,index)=>{const content=versions[index].data()||{},visible=publicPlacement(content,placement.publicState);return{placementId:placement.placementId,topologyVersion:placement.topologyVersion,anchor:placement.anchor,cells:decodeCells(placement.cellsData),cellCount:placement.cellCount,...visible,publicationStatus:content.publication?.status||'preview-only',status:placement.status,createdAt:placement.createdAt?.toMillis?.()||null};});
      response.status(200).json({ok:true,placements});return;
    }
    if(action==='quote-reserve'||action==='release-checkout-reservation'){
      try{
        const token=String(request.body.checkoutToken||'');
        if(action==='release-checkout-reservation'){
          if(token.length<32){response.status(400).json({ok:false,error:'invalid-checkout-token'});return;}
          const ownerId=`checkout:${createHash('sha256').update(token).digest('hex')}`;
          const db=getFirestore(),reservationId=String(request.body.reservationId||''),snapshot=await db.collection('stagingReservations').doc(reservationId).get(),stored=snapshot.data();if(!snapshot.exists||stored.ownerId!==ownerId){response.status(404).json({ok:false,error:'reservation-not-found'});return;}
          if(stored.checkoutSessionId){const session=await new Stripe(stripeSecretKey.value()).checkout.sessions.retrieve(stored.checkoutSessionId),state=checkoutSessionState(session);if(state==='paid'){await fulfilPaidCheckout(db,session,Number(session.created)*1000);response.status(409).json({ok:false,error:'payment-already-completed'});return;}if(state==='payment-processing'){response.status(409).json({ok:false,error:'payment-processing'});return;}if(state==='checkout-open')await new Stripe(stripeSecretKey.value()).checkout.sessions.expire(stored.checkoutSessionId);}
          const reservation=await releaseTestReservation(db,reservationId,ownerId,Date.now());if(stored.checkoutSessionId){const orderId=checkoutOrderId(reservationId);await db.collection('stagingOrders').doc(orderId).set({status:'checkout-cancelled',paymentStatus:'unpaid',closedAt:FieldValue.serverTimestamp(),updatedAt:FieldValue.serverTimestamp()},{merge:true});}response.status(200).json({ok:true,reservation,checkoutClosed:Boolean(stored.checkoutSessionId)});return;
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
    const ownerIds=ownerIdsForIdentity(identity);

    try {
      if(action==='admin-payment-status'&&identity.stagingAdmin){
        const db=getFirestore(),requestedOrderId=String(request.body.orderId||''),[orders,events,refunds]=await Promise.all([requestedOrderId?db.collection('stagingOrders').where('orderId','==',requestedOrderId).limit(1).get():db.collection('stagingOrders').limit(50).get(),requestedOrderId?db.collection('stagingStripeEvents').where('orderId','==',requestedOrderId).limit(50).get():db.collection('stagingStripeEvents').limit(50).get(),requestedOrderId?db.collection('stagingRefunds').where('orderId','==',requestedOrderId).limit(50).get():db.collection('stagingRefunds').limit(50).get()]);
        response.status(200).json({ok:true,orders:orders.docs.map(document=>{const data=document.data();return{orderId:document.id,status:data.status,paymentStatus:data.paymentStatus,placementId:data.placementId,stripeCheckoutSessionId:data.stripeCheckoutSessionId,lastPaymentError:data.lastPaymentError,ownershipOutcome:data.ownershipOutcome};}),events:events.docs.map(document=>{const data=document.data();return{eventId:document.id,type:data.type,status:data.status,error:data.error};}),refunds:refunds.docs.map(document=>document.data())});return;
      }
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
      if (action === 'update-metadata') {
        const placementId=String(request.body.placementId||''),db=getFirestore(),placementSnapshot=await db.collection('stagingPlacements').doc(placementId).get();
        if(!placementSnapshot.exists||!ownerIds.includes(placementSnapshot.data().ownerId)||['deleted','revoked'].includes(placementSnapshot.data().status)){response.status(404).json({ok:false,error:'placement-not-found'});return;}
        const currentVersion=Number(placementSnapshot.data().currentVersion||1),contentSnapshot=await db.collection('stagingPlacementVersions').doc(`${placementId}-v${currentVersion}`).get(),current=contentSnapshot.data();
        if(!current?.source){response.status(409).json({ok:false,error:'editable-source-unavailable'});return;}
        const content={title:request.body.content?.title,description:request.body.content?.description,destinationUrl:request.body.content?.destinationUrl,artworkDataUrl:'',topologyVersion:placementSnapshot.data().topologyVersion,anchor:placementSnapshot.data().anchor,cells:decodeCells(placementSnapshot.data().cellsData)};
        const result=await updateTestPlacementContent(db,placementId,placementSnapshot.data().ownerId,content,FieldValue.serverTimestamp(),current.source,current.designSource||null);
        response.status(200).json({ok:true,placement:result});return;
      }
      if (action === 'get-content-source') {
        const placementId = String(request.body.placementId || ''), placement = await getFirestore().collection('stagingPlacements').doc(placementId).get();
        if (!placement.exists || !ownerIds.includes(placement.data().ownerId) || placement.data().status === 'deleted') { response.status(404).json({ ok: false, error: 'placement-not-found' }); return; }
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
      if (action === 'account-summary') {const db=getFirestore(),[placements,balances]=await Promise.all([ownerPlacementDocuments(db,ownerIds),Promise.all(ownerIds.map(ownerId=>db.collection('stagingCreditBalances').doc(ownerId).get()))]);response.status(200).json({ok:true,summary:{placements:placements.filter(doc=>!['deleted','revoked'].includes(doc.data().status)).length,credits:balances.reduce((sum,item)=>sum+Number(item.data()?.available||0),0),administrator:identity.stagingAdmin===true}});return;}
      if(action==='admin-refund'){
        if(identity.stagingAdmin!==true){response.status(403).json({ok:false,error:'administrator-required'});return;}
        const placementId=String(request.body.placementId||''),reason=String(request.body.reason||'').trim().slice(0,300),requestedAmount=Number(request.body.amountMinor||0);if(!placementId||!reason){response.status(400).json({ok:false,error:'refund-details-required'});return;}
        const db=getFirestore(),matches=await db.collection('stagingOrders').where('placementId','==',placementId).limit(1).get(),order=matches.docs[0];if(!order||order.data().status!=='fulfilled'||!order.data().stripePaymentIntentId){response.status(409).json({ok:false,error:'refundable-order-not-found'});return;}
        const paid=Number(order.data().paidAmountMinor||0),alreadyRefunded=Number(order.data().refundedAmountMinor||0),remaining=paid-alreadyRefunded,amount=requestedAmount||remaining;if(!Number.isSafeInteger(amount)||amount<1||amount>remaining){response.status(400).json({ok:false,error:'invalid-refund-amount'});return;}
        const idempotencyKey=`refund-${order.id}-${amount}-${createHash('sha256').update(reason).digest('hex').slice(0,16)}`,refund=await new Stripe(stripeSecretKey.value()).refunds.create({payment_intent:order.data().stripePaymentIntentId,amount,reason:'requested_by_customer',metadata:{orderId:order.id,placementId,operatorReason:reason.slice(0,100)}},{idempotencyKey});
        await Promise.all([db.collection('stagingRefundRequests').doc(refund.id).set({refundId:refund.id,orderId:order.id,placementId,amountMinor:amount,currency:order.data().currency,status:refund.status||'pending',reason,actorId:identity.uid,ownershipOutcome:'retained-pending-policy',createdAt:FieldValue.serverTimestamp()}),order.ref.set({paymentStatus:'refund-pending',ownershipOutcome:'retained-pending-policy',updatedAt:FieldValue.serverTimestamp()},{merge:true})]);response.status(200).json({ok:true,refund:{refundId:refund.id,status:refund.status||'pending',amountMinor:amount,ownershipOutcome:'retained-pending-policy'}});return;
      }
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
          const [versions,actions,balance,creditEntries,orders]=await Promise.all([
            Promise.all(Array.from({length:Math.min(currentVersion,50)},(_,index)=>db.collection('stagingPlacementVersions').doc(`${placement.placementId}-v${index+1}`).get())),
            db.collection('stagingModerationActions').where('placementId','==',placement.placementId).get(),
            db.collection('stagingCreditBalances').doc(placement.ownerId).get(),
            db.collection('stagingCreditLedger').where('ownerId','==',placement.ownerId).get(),
            db.collection('stagingOrders').where('placementId','==',placement.placementId).limit(1).get()
          ]);
          const versionRows=versions.filter(item=>item.exists).map(item=>{const data=item.data();return{version:Number(data.version||item.id.match(/-v(\d+)$/)?.[1]||0),title:data.title||'',description:data.description||'',destinationUrl:data.destinationUrl||'',publicationStatus:data.publication?.status||'preview-only'};});
          const actionRows=[...actions.docs.map(item=>{const data=item.data();return{caseId:data.caseId||item.id,action:data.command?.action||data.action,reason:data.command?.reason||data.reason||'',actorId:data.actorId||'',createdAt:data.createdAt?.toMillis?.()||null,creditAmount:Number(data.creditAmount||0)};}),...creditEntries.docs.map(item=>{const data=item.data();return{caseId:data.entryId||item.id,action:`credit-${data.type||'entry'}`,reason:data.reason||data.placementId||'',actorId:data.actorId||data.ownerId||'',createdAt:data.createdAt?.toMillis?.()||null,creditAmount:Number(data.delta||0)};})].sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
          const order=orders.docs[0]?.data();return{placementId:placement.placementId,ownerId:placement.ownerId,status:placement.status||'active',cellCount:Number(placement.cellCount||0),currentVersion,publicState:placement.publicState||{},createdAt:placement.createdAt?.toMillis?.()||null,credits:Number(balance.data()?.available||0),payment:order?{orderId:order.orderId,status:order.status,paymentStatus:order.paymentStatus,paidAmountMinor:Number(order.paidAmountMinor||0),refundedAmountMinor:Number(order.refundedAmountMinor||0),currency:order.currency||''}:null,versions:versionRows,actions:actionRows};
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
        const owned=await getFirestore().collection('stagingPlacements').doc(placementId).get();
        if(identity.stagingAdmin!==true&&(!owned.exists||!ownerIds.includes(owned.data().ownerId))){response.status(404).json({ok:false,error:'placement-not-found'});return;}
        const result = await deleteTestPlacement(getFirestore(), placementId, FieldValue.serverTimestamp(), identity.stagingAdmin === true ? null : owned.data().ownerId);
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
        const documents=await ownerPlacementDocuments(getFirestore(),ownerIds);
        const active = documents.map(document => document.data()).filter(placement => !['deleted','revoked'].includes(placement.status));
        const versions = await Promise.all(active.map(placement => getFirestore().collection('stagingPlacementVersions').doc(`${placement.placementId}-v${placement.currentVersion || 1}`).get()));
        const publishedVersions=await Promise.all(active.map((placement,index)=>Number(placement.currentPublishedVersion||0)&&Number(placement.currentPublishedVersion)!==Number(placement.currentVersion||1)?getFirestore().collection('stagingPlacementVersions').doc(`${placement.placementId}-v${placement.currentPublishedVersion}`).get():versions[index]));
        const placements = active.map((placement, index) => { const content = versions[index].data() || {},published=publishedVersions[index].data()||{}; return { placementId: placement.placementId, topologyVersion: placement.topologyVersion, anchor: placement.anchor, cells: decodeCells(placement.cellsData), cellCount: placement.cellCount,title:content.title||placement.title||'',description:content.description||'',destinationUrl:content.destinationUrl||'',artworkDataUrl:content.publication?.artworkUrl||published.publication?.artworkUrl||content.artworkDataUrl||'',publicationStatus:content.publication?.status||'preview-only',currentVersion:Number(placement.currentVersion||1),publicStatus:placement.publicState?.status||'active', status: placement.status, createdAt: placement.createdAt?.toMillis?.() || null }; });
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

export const expireStagingReservations=onSchedule({schedule:'every 5 minutes',region:'europe-west1',maxInstances:1,secrets:[stripeSecretKey]},async()=>{
  if(!stagingSandboxEnabled.value())return;
  const now=Date.now(),db=getFirestore(),snapshot=await db.collection('stagingReservations').where('expiresAtMs','<=',now).limit(100).get(),stripe=new Stripe(stripeSecretKey.value());
  for(const document of snapshot.docs.filter(item=>item.data().status==='active'))try{const reservation=document.data();if(reservation.checkoutSessionId){const session=await stripe.checkout.sessions.retrieve(reservation.checkoutSessionId),state=checkoutSessionState(session);if(state==='paid'){await fulfilPaidCheckout(db,session,Number(session.created)*1000);continue;}if(state==='payment-processing')continue;if(state==='checkout-open')await stripe.checkout.sessions.expire(reservation.checkoutSessionId);}await releaseTestReservation(db,document.id,reservation.ownerId,now,{expiredOnly:true});if(reservation.checkoutSessionId)await db.collection('stagingOrders').doc(checkoutOrderId(document.id)).set({status:'checkout-expired',paymentStatus:'unpaid',closedAt:FieldValue.serverTimestamp(),updatedAt:FieldValue.serverTimestamp()},{merge:true});}catch(error){logger.warn('Could not expire staging reservation',{reservationId:document.id,message:error.message});}
});

async function fulfilPaidCheckout(db,session,paidAtMs){
  const email=paidCheckoutEmail(session),orderId=String(session.metadata?.orderId||'');if(!email||!orderId)throw new Error('invalid-paid-session');
  const orderRef=db.collection('stagingOrders').doc(orderId),orderSnapshot=await orderRef.get();if(!orderSnapshot.exists)throw new Error('order-not-found');const order=orderSnapshot.data();
  if(order.status==='fulfilled')return order.result;
  const ownerId=paidEmailOwnerId(email);
  const reservation=(await db.collection('stagingReservations').doc(order.reservationId).get()).data(),reservationUsable=reservation?.status==='active'&&Number(reservation.expiresAtMs)>paidAtMs;
  const result=await createTestPlacement(db,{...order.placement,ownerId},FieldValue.serverTimestamp(),{placementId:order.placementId,source:order.source,...(reservationUsable?{reservationId:order.reservationId,reservationOwnerId:order.reservationOwnerId,nowMs:paidAtMs}:{})}).catch(async error=>{const placement=await db.collection('stagingPlacements').doc(order.placementId).get();if(placement.exists)return{placementId:order.placementId,cellCount:placement.data().cellCount,status:placement.data().status};throw error;});
  await orderRef.set({status:'fulfilled',paymentStatus:'paid',ownerId,buyerEmail:email,stripePaymentIntentId:session.payment_intent,paidAmountMinor:session.amount_total,currency:session.currency,fulfilledAt:FieldValue.serverTimestamp(),placement:FieldValue.delete(),result},{merge:true});return result;
}

async function closeUnpaidOrder(db,session,status,details={}){
  const orderId=String(session?.metadata?.orderId||'');if(!orderId)return null;
  const orderRef=db.collection('stagingOrders').doc(orderId),snapshot=await orderRef.get();if(!snapshot.exists)return null;const order=snapshot.data();
  if(order.status==='fulfilled'||['refunded','partially-refunded'].includes(order.paymentStatus))return{orderId,status:order.status,releasedCells:0};
  let releasedCells=0;
  if(order.reservationId&&order.reservationOwnerId)try{releasedCells=(await releaseTestReservation(db,order.reservationId,order.reservationOwnerId,Date.now())).releasedCells||0;}catch(error){if(error.code!=='reservation-not-found')throw error;}
  await orderRef.set({status,paymentStatus:status,lastPaymentError:details,closedAt:FieldValue.serverTimestamp(),updatedAt:FieldValue.serverTimestamp()},{merge:true});
  return{orderId,status,releasedCells};
}

async function orderForPaymentObject(db,object){
  const orderId=String(object?.metadata?.orderId||'');if(orderId){const direct=await db.collection('stagingOrders').doc(orderId).get();if(direct.exists)return direct;}
  const paymentIntentId=String(object?.payment_intent||object?.id||'');if(!paymentIntentId)return null;
  const match=await db.collection('stagingOrders').where('stripePaymentIntentId','==',paymentIntentId).limit(1).get();return match.docs[0]||null;
}

async function recordRefund(db,charge){
  const state=refundState(charge);if(!state)return null;const order=await orderForPaymentObject(db,charge);if(!order)return null;
  const refundId=`charge-${charge.id}`,record={refundId,latestStripeRefundId:String(charge.refunds?.data?.[0]?.id||''),orderId:order.id,placementId:order.data().placementId,stripeChargeId:String(charge.id||''),stripePaymentIntentId:String(charge.payment_intent||''),...state,createdAt:FieldValue.serverTimestamp()};
  await Promise.all([db.collection('stagingRefunds').doc(refundId).set(record,{merge:true}),order.ref.set({paymentStatus:state.status,refundedAmountMinor:state.amountRefundedMinor,ownershipOutcome:state.ownershipOutcome,updatedAt:FieldValue.serverTimestamp()},{merge:true})]);return record;
}

export const stagingCheckout=onRequest({region:'europe-west1',maxInstances:3,timeoutSeconds:60,memory:'512MiB',secrets:[stripeSecretKey]},async(request,response)=>{
  response.set('Cache-Control','no-store');const origin=request.get('Origin');if(!stagingOrigin(origin)){response.status(403).json({ok:false,error:'origin-not-allowed'});return;}if(origin)response.set('Access-Control-Allow-Origin',origin).set('Vary','Origin');response.set('Access-Control-Allow-Headers','content-type').set('Access-Control-Allow-Methods','POST, OPTIONS');if(request.method==='OPTIONS'){response.status(204).send('');return;}if(request.method!=='POST'){response.status(405).json({ok:false,error:'method-not-allowed'});return;}if(!stagingSandboxEnabled.value()){response.status(404).json({ok:false,error:'sandbox-disabled'});return;}
  try{
    const reservationId=String(request.body?.reservationId||''),checkoutToken=String(request.body?.checkoutToken||''),orderId=checkoutOrderId(reservationId),db=getFirestore(),reservationSnapshot=await db.collection('stagingReservations').doc(reservationId).get(),reservation=reservationSnapshot.data();
    if(!reservationSnapshot.exists||reservation.status!=='active'||reservation.ownerId!==checkoutOwnerId(checkoutToken)||Number(reservation.expiresAtMs)<=Date.now()){response.status(409).json({ok:false,error:'reservation-invalid'});return;}
    const candidate={...request.body.placement,ownerId:'pending-payment'};if(!normalisePlacementClaim(candidate)||candidate.cells.map(Number).sort((a,b)=>a-b).join(',')!==decodeCells(reservation.cellsData).join(',')){response.status(400).json({ok:false,error:'invalid-placement'});return;}
    const orderRef=db.collection('stagingOrders').doc(orderId),existing=await orderRef.get();if(existing.exists&&existing.data().checkoutUrl){response.status(200).json({ok:true,checkout:{orderId,placementId:existing.data().placementId,url:existing.data().checkoutUrl}});return;}
    let placementId=existing.data()?.placementId,sourceReference=existing.data()?.source,placement=existing.data()?.placement,checkoutExpiresAt=existing.data()?.checkoutExpiresAt||(existing.exists?Math.floor(Number(reservation.expiresAtMs)/1000):Math.floor(Date.now()/1000)+30*60);
    if(!existing.exists){
      const source=decodeArtworkSource(candidate.sourceArtworkDataUrl||candidate.artworkDataUrl);if(!source){response.status(400).json({ok:false,error:'invalid-artwork-source'});return;}
      placementId=randomUUID();const path=sourceObjectPath(placementId,1,source.extension);sourceReference={bucket:privateSourceBucket,path,mimeType:source.mimeType,extension:source.extension,size:source.bytes.length,sha256:source.sha256};
      await getStorage().bucket(privateSourceBucket).file(path).save(source.bytes,{resumable:false,contentType:source.mimeType,metadata:{cacheControl:'private,no-store',metadata:{placementId,orderId,sha256:source.sha256}}});
      placement={topologyVersion:candidate.topologyVersion,anchor:candidate.anchor,cells:candidate.cells,title:candidate.title,description:candidate.description,destinationUrl:candidate.destinationUrl,artworkDataUrl:candidate.artworkDataUrl};
      await orderRef.set({orderId,reservationId,reservationOwnerId:reservation.ownerId,placementId,placement,source:sourceReference,quote:reservation.quote,checkoutExpiresAt,status:'checkout-creating',environment:'staging',createdAt:FieldValue.serverTimestamp()},{merge:false});
    }
    const stripe=new Stripe(stripeSecretKey.value());const session=await stripe.checkout.sessions.create({mode:'payment',ui_mode:'embedded_page',redirect_on_completion:'never',payment_method_types:['card'],line_items:[checkoutLineItem(reservation.quote)],customer_creation:'always',expires_at:checkoutExpiresAt,metadata:{orderId,reservationId,placementId},payment_intent_data:{metadata:{orderId,reservationId,placementId}}},{idempotencyKey:orderId});
    await Promise.all([orderRef.set({stripeCheckoutSessionId:session.id,status:'checkout-open',paymentStatus:'unpaid',updatedAt:FieldValue.serverTimestamp()},{merge:true}),db.collection('stagingReservations').doc(reservationId).set({expiresAtMs:Number(session.expires_at)*1000,checkoutSessionId:session.id},{merge:true})]);response.status(201).json({ok:true,checkout:{orderId,placementId,clientSecret:session.client_secret,expiresAtMs:Number(session.expires_at)*1000}});
  }catch(error){logger.error('Could not create Stripe checkout',error);response.status(500).json({ok:false,error:'checkout-failed'});}
});

export const stripeWebhook=onRequest({region:'europe-west1',maxInstances:3,timeoutSeconds:60,memory:'512MiB',secrets:[stripeSecretKey,stripeWebhookSecret]},async(request,response)=>{
  if(request.method!=='POST'){response.status(405).send('method-not-allowed');return;}let event;try{event=new Stripe(stripeSecretKey.value()).webhooks.constructEvent(request.rawBody,request.get('stripe-signature'),stripeWebhookSecret.value());}catch(error){response.status(400).send(`invalid-signature: ${error.message}`);return;}
  const eventRef=getFirestore().collection('stagingStripeEvents').doc(event.id),existingEvent=await eventRef.get();if(existingEvent.exists&&existingEvent.data().status==='processed'){response.status(200).json({received:true,duplicate:true});return;}
  try{
    await eventRef.set({eventId:event.id,type:event.type,orderId:String(event.data.object?.metadata?.orderId||''),status:'processing',receivedAt:FieldValue.serverTimestamp()},{merge:true});
    const db=getFirestore(),object=event.data.object;
    if(event.type==='checkout.session.completed'||event.type==='checkout.session.async_payment_succeeded'){
      if(checkoutSessionState(object)==='paid')await fulfilPaidCheckout(db,object,Number(event.created)*1000);
      else {const orderId=String(object.metadata?.orderId||'');if(orderId)await db.collection('stagingOrders').doc(orderId).set({status:'payment-processing',paymentStatus:'processing',updatedAt:FieldValue.serverTimestamp()},{merge:true});}
    }else if(event.type==='checkout.session.expired')await closeUnpaidOrder(db,object,'checkout-expired');
    else if(event.type==='checkout.session.async_payment_failed')await closeUnpaidOrder(db,object,'payment-failed',paymentFailure(object));
    else if(event.type==='payment_intent.payment_failed'){const order=await orderForPaymentObject(db,object);if(order)await order.ref.set({paymentStatus:'failed-attempt',lastPaymentError:paymentFailure(object),updatedAt:FieldValue.serverTimestamp()},{merge:true});}
    else if(event.type==='charge.refunded')await recordRefund(db,object);
    else if(event.type==='charge.dispute.created'){const order=await orderForPaymentObject(db,object);if(order)await order.ref.set({paymentStatus:'disputed',disputeId:object.id,ownershipOutcome:'retained-pending-review',updatedAt:FieldValue.serverTimestamp()},{merge:true});}
    await eventRef.set({status:'processed',processedAt:FieldValue.serverTimestamp()},{merge:true});response.status(200).json({received:true});
  }catch(error){logger.error('Stripe webhook processing failed',{eventId:event.id,errorMessage:error.message,errorCode:error.code,stack:error.stack});await eventRef.set({status:'failed',error:String(error.message).slice(0,200),updatedAt:FieldValue.serverTimestamp()},{merge:true});response.status(500).send('webhook-processing-failed');}
});

async function reconcileOpenStripeOrders(){
  const db=getFirestore(),snapshots=await Promise.all(['checkout-open','payment-processing'].map(status=>db.collection('stagingOrders').where('status','==',status).limit(50).get())),documents=new Map(),stripe=new Stripe(stripeSecretKey.value());snapshots.forEach(snapshot=>snapshot.docs.forEach(document=>documents.set(document.id,document)));let fulfilled=0,closed=0,unchanged=0,failed=0;
  for(const document of documents.values())try{const session=await stripe.checkout.sessions.retrieve(document.data().stripeCheckoutSessionId),state=checkoutSessionState(session);if(state==='paid'){await fulfilPaidCheckout(db,session,Number(session.created)*1000);fulfilled++;}else if(state==='expired'){await closeUnpaidOrder(db,session,'checkout-expired');closed++;}else unchanged++;}catch(error){failed++;logger.error('Could not reconcile Stripe order',{orderId:document.id,errorMessage:error.message,errorCode:error.code});}
  return{checked:documents.size,fulfilled,closed,unchanged,failed};
}
export const reconcileStagingPayments=onSchedule({schedule:'every 5 minutes',region:'europe-west1',maxInstances:1,secrets:[stripeSecretKey]},async()=>{if(stagingSandboxEnabled.value())await reconcileOpenStripeOrders();});
export const reconcileStagingPaymentsNow=onRequest({region:'europe-west1',maxInstances:1,secrets:[stripeSecretKey,stagingQaKey]},async(request,response)=>{if(request.method!=='POST'||request.get('X-MH-QA-Key')!==stagingQaKey.value()){response.status(403).json({ok:false});return;}response.status(200).json({ok:true,...await reconcileOpenStripeOrders()});});

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
