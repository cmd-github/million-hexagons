import { createHash } from 'node:crypto';

const SOURCE_LIMIT_BYTES = 12 * 1024 * 1024;

export function decodeArtworkSource(value) {
  if (typeof value !== 'string') return null;
  const match = value.match(/^data:image\/(png|webp);base64,([A-Za-z0-9+/=]+)$/);
  if (!match) return null;
  const bytes = Buffer.from(match[2], 'base64');
  if (!bytes.length || bytes.length > SOURCE_LIMIT_BYTES) return null;
  const mimeType = `image/${match[1]}`;
  return { bytes, mimeType, extension: match[1], sha256: createHash('sha256').update(bytes).digest('hex') };
}

export function sourceObjectPath(placementId, version, extension) {
  return `staging-placement-sources/${placementId}/v${version}/artwork.${extension}`;
}

export function publicationObjects(placement) {
  const prefix = `releases/placements/${placement.placementId}/versions/${placement.version}`;
  const artworkKey = `${prefix}/artwork.${placement.source.extension}`;
  const metadataKey = `${prefix}/placement.json`;
  const metadata = {
    schemaVersion: 1,
    placementId: placement.placementId,
    version: placement.version,
    topologyVersion: placement.topologyVersion,
    anchor: placement.anchor,
    cellCount: placement.cellCount,
    sourceSha256: placement.source.sha256,
    artwork: artworkKey
  };
  return { artworkKey, metadataKey, metadata };
}
