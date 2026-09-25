// Render one 1200x630 PNG per entry in social/posts.json.
//
//   npm run social:cards                  # render every post in the file
//   npm run social:cards -- --only 3,7    # render just those numbers
//
// Output goes to artifacts/social/, which is gitignored. The card design lives in
// scripts/social-card-template.html; edit that, not this file, to change how they look.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { chromium } from 'playwright';

const WIDTH = 1200, HEIGHT = 630;
const root = path.resolve(import.meta.dirname, '..');
const outDir = path.join(root, 'artifacts', 'social');
const template = path.join(root, 'scripts', 'social-card-template.html');

const argument = name => {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1];
};

const { posts } = JSON.parse(await readFile(path.join(root, 'social', 'posts.json'), 'utf8'));
if (!Array.isArray(posts) || !posts.length) throw Error('social/posts.json has no posts');

const only = argument('--only');
const wanted = only ? new Set(only.split(',').map(value => Number(value.trim()))) : null;

for (const [index, post] of posts.entries()) {
  for (const field of ['title', 'figure', 'caption', 'linkedin', 'x']) {
    if (!post[field]) throw Error(`Post ${index + 1} is missing "${field}"`);
  }
  if (post.figure.length > 14) throw Error(`Post ${index + 1} figure "${post.figure}" is too long for the card`);
  if (post.x.length > 280) throw Error(`Post ${index + 1} X text is ${post.x.length} characters, over the 280 limit`);
  if (/\u2014/.test(post.linkedin + post.x + post.caption)) throw Error(`Post ${index + 1} contains an em dash`);
}

await mkdir(outDir, { recursive: true });

// Chrome is used directly rather than Playwright's bundled build, matching the other
// browser checks in this repo.
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
});
const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(template).href, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(600);

const written = [];
for (const [index, post] of posts.entries()) {
  const number = index + 1;
  if (wanted && !wanted.has(number)) continue;
  await page.evaluate(([card, n, total]) => window.renderCard(card, n, total), [post, number, posts.length]);
  await page.waitForTimeout(90);
  const file = path.join(outDir, `${String(number).padStart(2, '0')}.png`);
  await page.screenshot({ path: file });
  written.push(path.relative(root, file));
}
await browser.close();

// An index of the text beside the images, so a batch can be handed over as one folder.
const lines = posts.map((post, index) =>
  `## ${index + 1}. ${post.title}\n\nCard: ${String(index + 1).padStart(2, '0')}.png (${post.figure} / ${post.caption})\n\n### LinkedIn\n\n${post.linkedin}\n\n### X (${post.x.length}/280)\n\n${post.x}\n`);
await writeFile(path.join(outDir, 'posts.md'), `# Social posts\n\n${lines.join('\n---\n\n')}`, 'utf8');

console.log(`Rendered ${written.length} card${written.length === 1 ? '' : 's'} to artifacts/social/`);
console.log('Text for the same batch is in artifacts/social/posts.md');
