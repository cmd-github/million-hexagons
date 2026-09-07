import assert from 'node:assert/strict';
import test from 'node:test';
import { normaliseSignup } from './signup.js';

test('normalises and hashes a valid email', () => {
  const signup = normaliseSignup({ email: ' Hello@Example.COM ', website: '' });
  assert.equal(signup.email, 'hello@example.com');
  assert.match(signup.id, /^[a-f0-9]{64}$/);
});

test('rejects invalid or oversized addresses', () => {
  assert.equal(normaliseSignup({ email: 'not-an-email' }), null);
  assert.equal(normaliseSignup({ email: `${'a'.repeat(250)}@x.com` }), null);
});

test('silently accepts honeypot submissions without an email', () => {
  assert.deepEqual(normaliseSignup({ email: 'bot@example.com', website: 'spam' }), { trapped: true });
});
