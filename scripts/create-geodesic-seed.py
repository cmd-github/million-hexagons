"""Development tool: find a 64-vertex, degree-5/6 convex spherical seed.

Requires numpy and scipy. The checked-in seed freezes the result; runtime and
the million-cell generator do not depend on Python or a convex-hull library.
"""
import json
from pathlib import Path
import numpy as np
from scipy.optimize import minimize
from scipy.spatial import ConvexHull


def energy(raw):
    raw = raw.reshape(-1, 3)
    length = np.linalg.norm(raw, axis=1, keepdims=True)
    p = raw / length
    delta = p[:, None, :] - p[None, :, :]
    d2 = np.sum(delta * delta, axis=2)
    np.fill_diagonal(d2, np.inf)
    inverse = 1 / np.sqrt(d2)
    gradient = -np.sum(delta * inverse[:, :, None] ** 3, axis=1)
    gradient = (gradient - np.sum(gradient * p, axis=1, keepdims=True) * p) / length
    return np.sum(inverse) / 2, gradient.ravel()


for attempt in range(100):
    rng = np.random.default_rng(64000 + attempt)
    result = minimize(energy, rng.normal(size=192), jac=True, method='L-BFGS-B',
                      options={'maxiter': 3000, 'ftol': 1e-13, 'gtol': 1e-8})
    points = result.x.reshape(-1, 3)
    points /= np.linalg.norm(points, axis=1, keepdims=True)
    triangles = ConvexHull(points).simplices
    degrees = np.bincount(triangles.ravel(), minlength=64)
    print(attempt, float(result.fun), dict(zip(*np.unique(degrees, return_counts=True))), flush=True)
    if np.sum(degrees == 5) != 12 or np.sum(degrees == 6) != 52:
        continue
    faces = []
    for triangle in triangles.tolist():
        a, b, c = points[triangle]
        if np.dot(a, np.cross(b, c)) < 0:
            triangle[1], triangle[2] = triangle[2], triangle[1]
        lowest = triangle.index(min(triangle))
        faces.append(triangle[lowest:] + triangle[:lowest])
    path = Path('scripts/data/geodesic-seed-64.json')
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps({'version': 1, 'method': 'Coulomb relaxation and convex hull; degrees audited',
                                'randomSeed': 64000 + attempt,
                                'centres': points.tolist(), 'triangles': sorted(faces)}, indent=2) + '\n')
    break
else:
    raise RuntimeError('No valid seed found; no topology written')
