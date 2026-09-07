import { createHash } from 'node:crypto';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normaliseSignup(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  if (typeof body.website === 'string' && body.website.trim()) return { trapped: true };
  if (typeof body.email !== 'string') return null;

  const email = body.email.trim().toLowerCase();
  if (!email || email.length > 254 || !emailPattern.test(email)) return null;

  return {
    email,
    id: createHash('sha256').update(email).digest('hex')
  };
}
