import { randomUUID } from 'node:crypto';
import { CELL_COUNT, TOPOLOGY_VERSION } from './placements.js';

function cleanText(value, maximum) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, maximum) : '';
}

export function normaliseDesignState(input) {
  if (!input || typeof input !== 'object' || input.topologyVersion !== TOPOLOGY_VERSION) return null;
  if (!Array.isArray(input.cells) || input.cells.length < 1 || input.cells.length > 100_000) return null;
  const cells = input.cells.map(cell => ({
    id: Number(cell?.id),
    ...(typeof cell?.color === 'string' && /^#[0-9a-f]{6}$/i.test(cell.color) ? { color: cell.color.toLowerCase() } : {}),
    ...(cell?.transparent === true ? { transparent: true } : {})
  }));
  if (new Set(cells.map(cell => cell.id)).size !== cells.length || cells.some(cell => !Number.isSafeInteger(cell.id) || cell.id < 1 || cell.id > CELL_COUNT)) return null;
  const anchor = Number(input.anchor);
  if (!Number.isSafeInteger(anchor) || !cells.some(cell => cell.id === anchor)) return null;
  const transform = input.imageTransform || {};
  return {
    schemaVersion: 1,
    topologyVersion: TOPOLOGY_VERSION,
    anchor,
    cells,
    baseColour: /^#[0-9a-f]{6}$/i.test(input.baseColour || '') ? input.baseColour.toLowerCase() : '#6366a8',
    imageTransform: {
      scale: Math.max(10, Math.min(400, Number(transform.scale) || 100)),
      x: Math.max(-100, Math.min(100, Number(transform.x) || 0)),
      y: Math.max(-100, Math.min(100, Number(transform.y) || 0)),
      rotation: Math.max(-180, Math.min(180, Number(transform.rotation) || 0)),
      treatment: ['original', 'tint', 'knockout'].includes(transform.treatment) ? transform.treatment : 'original'
    }
  };
}

export function normaliseDraft(input) {
  const designState = normaliseDesignState(input?.designState);
  if (!designState) return null;
  let destinationUrl = '';
  if (input.destinationUrl) {
    try { const parsed = new URL(String(input.destinationUrl).trim()); if (!['http:', 'https:'].includes(parsed.protocol)) return null; destinationUrl = parsed.href.slice(0, 2048); }
    catch { return null; }
  }
  return {
    draftId: /^[0-9a-f-]{36}$/.test(String(input.draftId || '')) ? input.draftId : randomUUID(),
    title: cleanText(input.title, 120),
    description: cleanText(input.description, 500),
    destinationUrl,
    designState
  };
}
