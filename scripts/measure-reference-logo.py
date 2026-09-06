"""Measure the four white fiducials on rendered 3:1 reference logos (Pillow).

This reads screenshots; it neither edits nor synthesizes visual evidence.
"""
from pathlib import Path
import json
from PIL import Image

results = []
for path in sorted(Path('artifacts/geodesic-qa').glob('*-logo-canvas.png')):
    im = Image.open(path).convert('RGB')
    pixels = im.load()
    points = []
    for y in range(im.height):
        for x in range(im.width):
            r, g, b = pixels[x, y]
            if min(r, g, b) < 235:
                continue
            for dx, dy in ((-4, 0), (4, 0), (0, -4), (0, 4)):
                qx, qy = x + dx, y + dy
                if 0 <= qx < im.width and 0 <= qy < im.height:
                    qr, qg, qb = pixels[qx, qy]
                    if qr > 180 and qg < 100 and qb > 120:
                        points.append((x, y))
                        break
    assert len(points) > 8, f'Missing fiducials: {path}'
    left, right = min(x for x, y in points), max(x for x, y in points)
    top, bottom = min(y for x, y in points), max(y for x, y in points)
    # Fiducial outside edges span 295 x 95 source pixels.
    aspect = (right - left) / (bottom - top) * 95 / 295 * 3
    results.append({'image': path.name, 'measuredLogoAspect': aspect,
                    'relativeError': abs(aspect / 3 - 1), 'fiducialBounds': [left, top, right, bottom]})
    assert abs(aspect / 3 - 1) < .04, f'Aspect error: {path} = {aspect}'
assert results, 'No reference screenshots found'
Path('artifacts/geodesic-qa/aspect-ratios.json').write_text(json.dumps(results, indent=2) + '\n')
print(json.dumps(results, indent=2))
