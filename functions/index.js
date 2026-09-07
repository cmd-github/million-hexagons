import { initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { onRequest } from 'firebase-functions/v2/https';
import { normaliseSignup } from './signup.js';

initializeApp();

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
