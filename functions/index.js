import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { randomUUID } from 'node:crypto';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { logger } from 'firebase-functions';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { onRequest } from 'firebase-functions/v2/https';
import { defineBoolean, defineSecret, defineString } from 'firebase-functions/params';
import { normaliseSignup } from './signup.js';
import { createTestPlacement, decodeCells, deleteTestPlacement, normalisePlacementClaim, placementClaimDiagnostics } from './placements.js';
import { decodeArtworkSource, publicationObjects, sourceObjectPath } from './publication.js';

initializeApp();
const stagingSandboxEnabled = defineBoolean('MH_STAGING_SANDBOX', { default: false });
const r2AccountId = defineSecret('MH_R2_ACCOUNT_ID');
const r2AccessKeyId = defineSecret('MH_R2_ACCESS_KEY_ID');
const r2SecretAccessKey = defineSecret('MH_R2_SECRET_ACCESS_KEY');
const stagingQaKey = defineSecret('MH_STAGING_QA_KEY');
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

    let identity;
    const qaOwner = request.get('X-MH-QA-Owner');
    if (request.get('X-MH-QA-Key') === stagingQaKey.value() && /^staging-qa-[0-9a-f-]{36}$/.test(String(qaOwner || ''))) {
      identity = { uid: qaOwner, email_verified: true, stagingAdmin: false };
    }
    else {
      const token = request.get('Authorization')?.match(/^Bearer (.+)$/)?.[1];
      if (!token) { response.status(401).json({ ok: false, error: 'authentication-required' }); return; }
      try { identity = await getAuth().verifyIdToken(token); }
      catch { response.status(401).json({ ok: false, error: 'invalid-authentication' }); return; }
    }
    if (!identity.email_verified) { response.status(403).json({ ok: false, error: 'verified-email-required' }); return; }

    try {
      const action = request.body?.action;
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
        try { result = await createTestPlacement(getFirestore(), candidate, FieldValue.serverTimestamp(), { placementId, source: sourceReference }); }
        catch (error) { await sourceFile.delete({ ignoreNotFound: true }).catch(cleanupError => logger.warn('Could not remove unclaimed staging source', cleanupError)); throw error; }
        response.status(201).json({ ok: true, placement: result });
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
      if (action === 'list') {
        const snapshot = await getFirestore().collection('stagingPlacements').where('ownerId', '==', identity.uid).get();
        const active = snapshot.docs.map(document => document.data()).filter(placement => placement.status !== 'deleted');
        const versions = await Promise.all(active.map(placement => getFirestore().collection('stagingPlacementVersions').doc(`${placement.placementId}-v${placement.currentVersion || 1}`).get()));
        const placements = active.map((placement, index) => { const content = versions[index].data() || {}; return { placementId: placement.placementId, topologyVersion: placement.topologyVersion, anchor: placement.anchor, cells: decodeCells(placement.cellsData), cellCount: placement.cellCount, title: content.title || placement.title, description: content.description || '', destinationUrl: content.destinationUrl || '', artworkDataUrl: content.publication?.artworkUrl || content.artworkDataUrl || '', publicationStatus: content.publication?.status || 'preview-only', status: placement.status, createdAt: placement.createdAt?.toMillis?.() || null }; });
        response.status(200).json({ ok: true, placements });
        return;
      }
      response.status(400).json({ ok: false, error: 'unknown-action' });
    } catch (error) {
      const status = error.code === 'cells-unavailable' ? 409 : error.code === 'placement-not-found' ? 404 : error.code === 'placement-forbidden' ? 403 : error.code === 'invalid-placement' ? 400 : 500;
      if (status === 500) logger.error('Staging placement request failed', error);
      response.status(status).json({ ok: false, error: status === 500 ? 'request-failed' : error.code, ...(error.cellId ? { cellId: error.cellId } : {}) });
    }
  }
);

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
