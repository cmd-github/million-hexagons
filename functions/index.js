import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { onRequest } from 'firebase-functions/v2/https';
import { defineBoolean } from 'firebase-functions/params';
import { normaliseSignup } from './signup.js';
import { createTestPlacement, decodeCells, deleteTestPlacement } from './placements.js';

initializeApp();
const stagingSandboxEnabled = defineBoolean('MH_STAGING_SANDBOX', { default: false });

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
  { region: 'europe-west1', maxInstances: 3, timeoutSeconds: 60, memory: '512MiB' },
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

    const token = request.get('Authorization')?.match(/^Bearer (.+)$/)?.[1];
    if (!token) { response.status(401).json({ ok: false, error: 'authentication-required' }); return; }
    let identity;
    try { identity = await getAuth().verifyIdToken(token); }
    catch { response.status(401).json({ ok: false, error: 'invalid-authentication' }); return; }
    if (!identity.email_verified) { response.status(403).json({ ok: false, error: 'verified-email-required' }); return; }

    try {
      const action = request.body?.action;
      if (action === 'create') {
        const result = await createTestPlacement(getFirestore(), { ...request.body.placement, ownerId: identity.uid }, FieldValue.serverTimestamp());
        response.status(201).json({ ok: true, placement: result });
        return;
      }
      if (action === 'delete') {
        const result = await deleteTestPlacement(getFirestore(), String(request.body.placementId || ''), FieldValue.serverTimestamp(), identity.stagingAdmin === true ? null : identity.uid);
        response.status(200).json({ ok: true, placement: result });
        return;
      }
      if (action === 'list') {
        const snapshot = await getFirestore().collection('stagingPlacements').where('ownerId', '==', identity.uid).get();
        const active = snapshot.docs.map(document => document.data()).filter(placement => placement.status !== 'deleted');
        const versions = await Promise.all(active.map(placement => getFirestore().collection('stagingPlacementVersions').doc(`${placement.placementId}-v${placement.currentVersion || 1}`).get()));
        const placements = active.map((placement, index) => { const content = versions[index].data() || {}; return { placementId: placement.placementId, topologyVersion: placement.topologyVersion, anchor: placement.anchor, cells: decodeCells(placement.cellsData), cellCount: placement.cellCount, title: content.title || placement.title, description: content.description || '', destinationUrl: content.destinationUrl || '', artworkDataUrl: content.artworkDataUrl || '', status: placement.status, createdAt: placement.createdAt?.toMillis?.() || null }; });
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
