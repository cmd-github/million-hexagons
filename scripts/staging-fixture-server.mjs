// Local-only R2 stand-in for the built staging browser check. It deliberately
// serves occupancy as HTTP gzip and topology as opaque gzip with no encoding.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { contentType } from './deployment-assets.mjs';
const root = path.resolve('staging-runtime');
http.createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const file = path.resolve(root, `.${pathname}`);
    if (!file.startsWith(root + path.sep)) throw Error('Invalid path');
    const bytes = await readFile(file);
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Cache-Control', 'public, max-age=31536000, immutable, no-transform');
    response.setHeader('Content-Type', contentType(file));
    if (/\/(occupancy-v1|sample-owners-v1)\.gz$/.test(file.replaceAll('\\', '/'))) response.setHeader('Content-Encoding', 'gzip');
    response.end(request.method === 'HEAD' ? undefined : bytes);
  } catch { response.writeHead(404); response.end('Asset not found'); }
}).listen(4182, '127.0.0.1', () => console.log('Local runtime fixture: http://127.0.0.1:4182'));
