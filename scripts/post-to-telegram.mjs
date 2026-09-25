// Send a rendered batch to a Telegram bot, one message per post: the card as a photo with
// the LinkedIn text as its caption, then the X variant as a follow-up.
//
//   npm run social:cards            # render first
//   npm run social:telegram -- --dry-run
//   npm run social:telegram
//   npm run social:telegram -- --only 3,7
//
// Credentials come from .env.telegram.local in the repository root, which .gitignore
// already excludes because it matches .env*:
//
//   TELEGRAM_BOT_TOKEN=123456:ABC...
//   TELEGRAM_CHAT_ID=-1001234567890
//
// Environment variables of the same names win over the file. The token is never printed.
import { readFile, access } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const dryRun = process.argv.includes('--dry-run');
const CAPTION_LIMIT = 1024;

const argument = name => {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1];
};

async function credentials() {
  const config = {};
  try {
    const raw = await readFile(path.join(root, '.env.telegram.local'), 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
      if (match) config[match[1]] = match[2].replace(/^["']|["']$/g, '');
    }
  } catch { /* the file is optional when the environment supplies both values */ }
  const token = process.env.TELEGRAM_BOT_TOKEN || config.TELEGRAM_BOT_TOKEN;
  const chat = process.env.TELEGRAM_CHAT_ID || config.TELEGRAM_CHAT_ID;
  if (!token || !chat) {
    throw Error('Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in .env.telegram.local or the environment');
  }
  return { token, chat };
}

async function call(token, method, body) {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, { method: 'POST', body });
  const result = await response.json().catch(() => ({}));
  // Telegram echoes the token in no error we surface, but keep messages to its description only.
  if (!result.ok) throw Error(`${method} failed: ${result.description || response.status}`);
  return result.result;
}

const { posts } = JSON.parse(await readFile(path.join(root, 'social', 'posts.json'), 'utf8'));
const only = argument('--only');
const wanted = only ? new Set(only.split(',').map(value => Number(value.trim()))) : null;
const selected = posts.map((post, index) => ({ post, number: index + 1 }))
  .filter(({ number }) => !wanted || wanted.has(number));

for (const { post, number } of selected) {
  if (post.linkedin.length > CAPTION_LIMIT) {
    throw Error(`Post ${number} caption is ${post.linkedin.length} characters, over Telegram's ${CAPTION_LIMIT} limit`);
  }
  const card = path.join(root, 'artifacts', 'social', `${String(number).padStart(2, '0')}.png`);
  try { await access(card); }
  catch { throw Error(`Missing ${path.relative(root, card)}. Run: npm run social:cards`); }
}

if (dryRun) {
  for (const { post, number } of selected) {
    console.log(`${String(number).padStart(2, '0')}  ${post.title}`);
    console.log(`    photo  artifacts/social/${String(number).padStart(2, '0')}.png`);
    console.log(`    caption ${post.linkedin.length} chars, X follow-up ${post.x.length} chars`);
  }
  console.log(`\nDry run. ${selected.length} post${selected.length === 1 ? '' : 's'} would be sent. Re-run without --dry-run to send.`);
  process.exit(0);
}

const { token, chat } = await credentials();
let sent = 0;
for (const { post, number } of selected) {
  const name = String(number).padStart(2, '0');
  const bytes = await readFile(path.join(root, 'artifacts', 'social', `${name}.png`));

  const photo = new FormData();
  photo.append('chat_id', chat);
  photo.append('caption', post.linkedin);
  photo.append('photo', new Blob([bytes], { type: 'image/png' }), `${name}.png`);
  const message = await call(token, 'sendPhoto', photo);

  const follow = new FormData();
  follow.append('chat_id', chat);
  follow.append('text', `X version:\n\n${post.x}`);
  follow.append('reply_to_message_id', String(message.message_id));
  await call(token, 'sendMessage', follow);

  sent++;
  console.log(`Sent ${name}  ${post.title}`);
  // Telegram throttles bursts; a short gap keeps a twenty message batch inside the limits.
  await new Promise(resolve => setTimeout(resolve, 1200));
}

console.log(`\nSent ${sent} post${sent === 1 ? '' : 's'} to Telegram.`);
