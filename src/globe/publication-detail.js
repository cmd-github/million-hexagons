// Preserve source detail without raising the resolution of the whole catalogue.
export const MAX_PUBLICATION_LEVEL = 8;

export function publicationLevel(bounds, image, manifest) {
  const density = Math.max(image.width / (bounds.right - bounds.left), image.height / (bounds.bottom - bounds.top));
  // Match the source density, rounding up to the next power-of-two level.
  // Extra levels beyond the source add baking cost without restoring detail.
  const level = Math.ceil(Math.log2(2 * density / manifest.tileSize));
  return Math.max(manifest.maxLevel, Math.min(MAX_PUBLICATION_LEVEL, level));
}

export function ancestorCrop(level, x, y, parentLevel, size, gutter) {
  const divisor = 2 ** (level - parentLevel);
  return {
    x: gutter + ((x % divisor) * size - gutter) / divisor,
    y: gutter + ((y % divisor) * size - gutter) / divisor,
    size: (size + 2 * gutter) / divisor,
  };
}
