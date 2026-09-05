import { compactFootprint, translateFootprint, footprintBounds, centre } from './placements/geometry.js';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import adidasSvg from 'simple-icons/icons/adidas.svg?raw';
import appleSvg from 'simple-icons/icons/apple.svg?raw';
import cocaColaSvg from 'simple-icons/icons/cocacola.svg?raw';
import googleSvg from 'simple-icons/icons/google.svg?raw';
import ikeaSvg from 'simple-icons/icons/ikea.svg?raw';
import mastercardSvg from 'simple-icons/icons/mastercard.svg?raw';
import mcdonaldsSvg from 'simple-icons/icons/mcdonalds.svg?raw';
import netflixSvg from 'simple-icons/icons/netflix.svg?raw';
import nikeSvg from 'simple-icons/icons/nike.svg?raw';
import samsungSvg from 'simple-icons/icons/samsung.svg?raw';
import spotifySvg from 'simple-icons/icons/spotify.svg?raw';
import youtubeSvg from 'simple-icons/icons/youtube.svg?raw';
import './style.css';

const canvas = document.querySelector('#world');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x050b14, .018);
const camera = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, .1, 100);
const logicalColumns = 1250;
const logicalRows = 800;
const occupiedCells = new Uint8Array(logicalColumns * logicalRows);

const atlas = document.createElement('canvas');
atlas.width = Math.min(4096, renderer.capabilities.maxTextureSize);
atlas.height = atlas.width / 2;
const ctx = atlas.getContext('2d');

const iconPath = (svg) => new Path2D(svg.match(/<path d="([^"]+)"/)?.[1] || '');
const brands = {
  adidas: { name: 'adidas', bg: '#08090b', fg: '#ffffff', path: iconPath(adidasSvg) },
  apple: { name: 'Apple', bg: '#f4f4f1', fg: '#111214', path: iconPath(appleSvg) },
  cocaCola: { name: 'Coca-Cola', bg: '#f40009', fg: '#ffffff', path: iconPath(cocaColaSvg), markOnly: true, wide: true },
  google: { name: 'Google', bg: '#f7f7f3', fg: '#4285f4', path: iconPath(googleSvg) },
  ikea: { name: 'IKEA', bg: '#0058a3', fg: '#ffda1a', path: iconPath(ikeaSvg), markOnly: true, wide: true },
  mastercard: { name: 'mastercard', bg: '#f2f0eb', fg: '#111111', path: iconPath(mastercardSvg) },
  mcdonalds: { name: "McDonald's", bg: '#da291c', fg: '#ffc72c', path: iconPath(mcdonaldsSvg) },
  netflix: { name: 'NETFLIX', bg: '#090909', fg: '#e50914', path: iconPath(netflixSvg) },
  nike: { name: 'NIKE', bg: '#f3f1eb', fg: '#111111', path: iconPath(nikeSvg) },
  samsung: { name: 'SAMSUNG', bg: '#1428a0', fg: '#ffffff', path: iconPath(samsungSvg), markOnly: true, wide: true },
  spotify: { name: 'Spotify', bg: '#1ed760', fg: '#111111', path: iconPath(spotifySvg) },
  youtube: { name: 'YouTube', bg: '#ffffff', fg: '#ff0000', path: iconPath(youtubeSvg) },
};

const heroCampaigns = [
  { brand: 'nike', x: .015, y: .035, w: .245, h: .205, seed: 2 },
  { brand: 'cocaCola', x: .292, y: .025, w: .29, h: .19, seed: 5 },
  { brand: 'apple', x: .625, y: .04, w: .15, h: .205, seed: 8 },
  { brand: 'spotify', x: .815, y: .055, w: .17, h: .16, seed: 11 },
  { brand: 'google', x: .045, y: .315, w: .285, h: .17, seed: 14 },
  { brand: 'mcdonalds', x: .375, y: .28, w: .155, h: .205, seed: 17 },
  { brand: 'youtube', x: .575, y: .305, w: .255, h: .175, seed: 20 },
  { brand: 'nike', x: .865, y: .305, w: .12, h: .15, seed: 23, compact: true },
  { brand: 'adidas', x: .015, y: .56, w: .19, h: .185, seed: 26 },
  { brand: 'netflix', x: .245, y: .535, w: .14, h: .225, seed: 29 },
  { brand: 'mastercard', x: .425, y: .56, w: .17, h: .18, seed: 32 },
  { brand: 'ikea', x: .635, y: .535, w: .255, h: .185, seed: 35 },
  { brand: 'spotify', x: .915, y: .555, w: .075, h: .155, seed: 38, compact: true },
  { brand: 'samsung', x: .06, y: .82, w: .285, h: .15, seed: 41 },
  { brand: 'apple', x: .39, y: .805, w: .12, h: .16, seed: 44, compact: true },
  { brand: 'youtube', x: .555, y: .82, w: .175, h: .145, seed: 47 },
  { brand: 'google', x: .78, y: .815, w: .195, h: .15, seed: 50 },
];

function campaignPath({ x, y, w, h, seed }) {
  const px = x * atlas.width;
  const py = y * atlas.height;
  const width = w * atlas.width;
  const height = h * atlas.height;
  const jitter = (index) => ((Math.sin(seed * 19.17 + index * 8.31) + 1) * .5 - .5);
  const path = new Path2D();
  const points = [
    [.05 + jitter(0) * .025, 0], [.72 + jitter(1) * .08, .015], [1, .16 + jitter(2) * .035],
    [.985, .76 + jitter(3) * .08], [.82 + jitter(4) * .07, 1], [.19 + jitter(5) * .07, .975],
    [0, .79 + jitter(6) * .055], [.015, .2 + jitter(7) * .06],
  ];
  path.moveTo(px + points[0][0] * width, py + points[0][1] * height);
  points.slice(1).forEach(([pointX, pointY]) => path.lineTo(px + pointX * width, py + pointY * height));
  path.closePath();
  return path;
}

function drawBrandMark(context, brand, x, y, width, height, compact = false) {
  const markSize = brand.wide
    ? Math.min(height * 1.2, width * .7)
    : Math.min(height * (compact || brand.markOnly ? .62 : .48), width * (compact ? .72 : .28));
  const hasLabel = !compact && !brand.markOnly && width > height * 1.35;
  const markX = hasLabel ? x + width * .2 : x + width * .5;
  const markY = hasLabel ? y + height * .48 : y + height * .5;
  context.save();
  context.translate(markX - markSize / 2, markY - markSize / 2);
  context.scale(markSize / 24, markSize / 24);
  context.fillStyle = brand.fg;
  context.fill(brand.path);
  context.restore();
  if (!hasLabel) return;
  context.save();
  context.fillStyle = brand.fg;
  context.font = `800 ${Math.max(22, Math.floor(height * .21))}px Arial`;
  context.textAlign = 'left';
  context.textBaseline = 'middle';
  context.fillText(brand.name, x + width * .36, y + height * .5, width * .58);
  context.restore();
}

function drawHeroCampaign(campaign) {
  const brand = brands[campaign.brand];
  const path = campaignPath(campaign);
  const x = campaign.x * atlas.width;
  const y = campaign.y * atlas.height;
  const width = campaign.w * atlas.width;
  const height = campaign.h * atlas.height;
  ctx.save();
  ctx.clip(path);
  ctx.fillStyle = brand.bg;
  ctx.fillRect(x, y, width, height);
  const sheen = ctx.createLinearGradient(x, y, x + width, y + height);
  sheen.addColorStop(0, 'rgba(255,255,255,.12)');
  sheen.addColorStop(.52, 'rgba(255,255,255,0)');
  sheen.addColorStop(1, 'rgba(0,0,0,.12)');
  ctx.fillStyle = sheen;
  ctx.fillRect(x, y, width, height);
  drawBrandMark(ctx, brand, x, y, width, height, campaign.compact);
  ctx.restore();
}

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function connectedCells(startColumn, startRow, count, random) {
  const cells = new Map();
  const key = (column, row) => `${column},${row}`;
  cells.set(key(startColumn, startRow), { column: startColumn, row: startRow });
  while (cells.size < count) {
    const existing = [...cells.values()][Math.floor(random() * cells.size)];
    const neighbours = existing.row % 2
      ? [[1, 0], [-1, 0], [0, 1], [1, 1], [0, -1], [1, -1]]
      : [[1, 0], [-1, 0], [-1, 1], [0, 1], [-1, -1], [0, -1]];
    const [columnStep, rowStep] = neighbours[Math.floor(random() * neighbours.length)];
    const column = THREE.MathUtils.clamp(existing.column + columnStep, 2, 1247);
    const row = THREE.MathUtils.clamp(existing.row + rowStep, 2, 797);
    cells.set(key(column, row), { column, row });
  }
  return [...cells.values()];
}

function drawSmallOwners() {
  const random = seededRandom(7331);
  const ownerColours = ['#ff7657', '#69d7ff', '#f8d849', '#ad85ff', '#f18ec4', '#54d89b', '#f3f0de'];
  const ownerNames = ['AK', 'JS', 'M+M', 'RB', 'LO', 'TQ', 'HEY', '44'];
  const cellWidth = atlas.width / 1250;
  const cellHeight = atlas.height / 800;
  let drawn = 0;
  let attempts = 0;
  while (drawn < 54 && attempts < 800) {
    attempts += 1;
    const column = Math.floor(18 + random() * 1214);
    const row = Math.floor(15 + random() * 770);
    const u = column / 1250;
    const v = row / 800;
    if (heroCampaigns.some((campaign) => u > campaign.x - .018 && u < campaign.x + campaign.w + .018 && v > campaign.y - .025 && v < campaign.y + campaign.h + .025)) continue;
    const count = 20 + Math.floor(random() * 31);
    const cells = connectedCells(column, row, count, random);
    const minColumn = Math.min(...cells.map((cell) => cell.column));
    const maxColumn = Math.max(...cells.map((cell) => cell.column));
    const minRow = Math.min(...cells.map((cell) => cell.row));
    const maxRow = Math.max(...cells.map((cell) => cell.row));
    const mask = new Path2D();
    cells.forEach((cell) => {
      const centreX = ((cell.column + (cell.row % 2) * .5) / 1250) * atlas.width;
      const centreY = (cell.row / 800) * atlas.height;
      mask.rect(centreX - cellWidth * .56, centreY - cellHeight * .56, cellWidth * 1.12, cellHeight * 1.12);
    });
    ctx.save();
    ctx.clip(mask);
    ctx.fillStyle = ownerColours[drawn % ownerColours.length];
    ctx.fillRect(0, 0, atlas.width, atlas.height);
    const left = (minColumn / 1250) * atlas.width;
    const top = (minRow / 800) * atlas.height;
    const width = Math.max(cellWidth * 4, ((maxColumn - minColumn + 1) / 1250) * atlas.width);
    const height = Math.max(cellHeight * 4, ((maxRow - minRow + 1) / 800) * atlas.height);
    ctx.fillStyle = '#07131b';
    ctx.font = `900 ${Math.floor(Math.min(height * .58, width * .32))}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(ownerNames[drawn % ownerNames.length], left + width / 2, top + height / 2, width * .84);
    ctx.restore();
    drawn += 1;
  }
}

function makeCampaignAtlas() {
  ctx.fillStyle = '#102631';
  ctx.fillRect(0, 0, atlas.width, atlas.height);
  heroCampaigns.forEach(drawHeroCampaign);
  drawSmallOwners();
}
makeCampaignAtlas();

function buildOccupancyMap() {
  const pixels = ctx.getImageData(0, 0, atlas.width, atlas.height).data;
  for (let row = 0; row < logicalRows; row += 1) {
    const sourceY = Math.min(atlas.height - 1, Math.max(0, Math.round((1 - row / logicalRows) * (atlas.height - 1))));
    for (let column = 0; column < logicalColumns; column += 1) {
      const sourceX = Math.min(atlas.width - 1, Math.round(((column + (row % 2) * .5) / logicalColumns) * (atlas.width - 1)));
      const pixel = (sourceY * atlas.width + sourceX) * 4;
      const difference = Math.abs(pixels[pixel] - 16) + Math.abs(pixels[pixel + 1] - 38) + Math.abs(pixels[pixel + 2] - 49);
      occupiedCells[row * logicalColumns + column] = difference > 22 ? 255 : 0;
    }
  }
}
buildOccupancyMap();
const occupancyTexture = new THREE.DataTexture(occupiedCells, logicalColumns, logicalRows, THREE.RedFormat, THREE.UnsignedByteType);
occupancyTexture.minFilter = THREE.NearestFilter;
occupancyTexture.magFilter = THREE.NearestFilter;
occupancyTexture.generateMipmaps = false;
occupancyTexture.needsUpdate = true;
const selectionColourData = new Uint8Array(logicalColumns * logicalRows * 4);
const purchasedColourData = new Uint8Array(logicalColumns * logicalRows * 4);
function makeCellColourTexture(data) {
  const texture = new THREE.DataTexture(data, logicalColumns, logicalRows, THREE.RGBAFormat, THREE.UnsignedByteType);
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}
const selectionColourTexture = makeCellColourTexture(selectionColourData);
const purchasedColourTexture = makeCellColourTexture(purchasedColourData);
const globeTexture = new THREE.CanvasTexture(atlas);
globeTexture.colorSpace = THREE.SRGBColorSpace;
globeTexture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());

const globe = new THREE.Group();
scene.add(globe);
const radius = 4;
const selectionModeUniform = { value: 0 };
const hoverCellUniform = { value: new THREE.Vector2(-2, -2) };
const globeMaterial = new THREE.MeshStandardMaterial({ map: globeTexture, roughness: .57, metalness: .04 });
globeMaterial.onBeforeCompile = (shader) => {
  shader.uniforms.selectionMode = selectionModeUniform;
  shader.uniforms.hoverCell = hoverCellUniform;
  shader.uniforms.occupancyMap = { value: occupancyTexture };
  shader.uniforms.selectionColourMap = { value: selectionColourTexture };
  shader.uniforms.purchasedColourMap = { value: purchasedColourTexture };
  shader.fragmentShader = `uniform float selectionMode;\nuniform vec2 hoverCell;\nuniform sampler2D occupancyMap;\nuniform sampler2D selectionColourMap;\nuniform sampler2D purchasedColourMap;\n${shader.fragmentShader}`;
  shader.fragmentShader = shader.fragmentShader.replace(
    '#include <map_fragment>',
    `#include <map_fragment>
    #ifdef USE_MAP
      vec3 smoothArtwork = diffuseColor.rgb;
      // 1,250 staggered columns by 800 rows: exactly one million logical cells,
      // with a substantially more regular on-sphere aspect ratio near the equator.
      vec2 gridPoint = vMapUv * vec2(2165.0635, 1200.0);
      float baseRow = floor(gridPoint.y / 1.5 + 0.5);
      vec2 localHex = vec2(10.0);
      vec2 cellAddress = vec2(0.0);
      float nearestCell = 100.0;
      for (int rowOffset = -1; rowOffset <= 1; rowOffset++) {
        float row = baseRow + float(rowOffset);
        float offsetX = mod(row, 2.0) * 0.8660254;
        float column = floor((gridPoint.x - offsetX) / 1.7320508 + 0.5);
        vec2 centre = vec2(column * 1.7320508 + offsetX, row * 1.5);
        vec2 candidate = gridPoint - centre;
        float distanceSquared = dot(candidate, candidate);
        if (distanceSquared < nearestCell) {
          nearestCell = distanceSquared;
          localHex = candidate;
          cellAddress = vec2(column, row);
        }
      }
      vec2 cellCentreUv = vec2(
        (cellAddress.x * 1.7320508 + mod(cellAddress.y, 2.0) * 0.8660254) / 2165.0635,
        (cellAddress.y * 1.5) / 1200.0
      );
      vec3 cellArtwork = texture2D(map, clamp(cellCentreUv, vec2(0.0001), vec2(0.9999))).rgb;
      vec2 occupancyUv = vec2((cellAddress.x + 0.5) / 1250.0, (cellAddress.y + 0.5) / 800.0);
      float availableCell = 1.0 - step(0.5, texture2D(occupancyMap, clamp(occupancyUv, vec2(0.0001), vec2(0.9999))).r);
      vec4 selectedColour = texture2D(selectionColourMap, clamp(occupancyUv, vec2(0.0001), vec2(0.9999)));
      vec4 purchasedColour = texture2D(purchasedColourMap, clamp(occupancyUv, vec2(0.0001), vec2(0.9999)));
      float cellPixels = 1.0 / max(fwidth(gridPoint.x) / 1.7320508, fwidth(gridPoint.y) / 1.5);
      float detailVisibility = smoothstep(1.6, 4.5, cellPixels);
      // Group neighbouring inventory into stable larger hexagonal plates.
      vec2 cellGridCentre = vec2(
        cellAddress.x * 1.7320508 + mod(cellAddress.y, 2.0) * 0.8660254,
        cellAddress.y * 1.5
      );
      vec2 macroPoint = cellGridCentre / 12.0;
      float macroBaseRow = floor(macroPoint.y / 1.5 + 0.5);
      vec2 macroAddress = vec2(0.0);
      float nearestMacro = 100.0;
      for (int macroRowOffset = -1; macroRowOffset <= 1; macroRowOffset++) {
        float macroRow = macroBaseRow + float(macroRowOffset);
        float macroOffsetX = mod(macroRow, 2.0) * 0.8660254;
        float macroColumn = floor((macroPoint.x - macroOffsetX) / 1.7320508 + 0.5);
        vec2 macroCentre = vec2(macroColumn * 1.7320508 + macroOffsetX, macroRow * 1.5);
        float macroDistance = dot(macroPoint - macroCentre, macroPoint - macroCentre);
        if (macroDistance < nearestMacro) {
          nearestMacro = macroDistance;
          macroAddress = vec2(macroColumn, macroRow);
        }
      }
      // Purchased artwork is deliberately left untouched.
      // Keep the highlight fixed to the camera instead of letting it rotate with map UVs.
      vec3 fixedOceanLight = normalize(vec3(-0.32, 0.34, 1.0));
      float oceanFacing = clamp(dot(normalize(vNormal), fixedOceanLight), 0.0, 1.0);
      float oceanHotspot = pow(oceanFacing, 4.6);
      // Lift the geographic south pole separately, while keeping it below the hotspot.
      float southPoleLift = smoothstep(0.72, 1.0, vMapUv.y);
      float globeFacing = clamp(dot(normalize(vNormal), normalize(vViewPosition)), 0.0, 1.0);
      float attachedRim = pow(1.0 - globeFacing, 35.0);
      float plateSeed = fract(sin(dot(macroAddress, vec2(127.1, 311.7))) * 43758.5453);
      float plateBand = floor(plateSeed * 4.0) / 3.0;
      float plateAccent = step(0.96, fract(sin(dot(macroAddress, vec2(269.5, 183.3))) * 43758.5453));
      float macroVisibility = smoothstep(0.25, 1.15, cellPixels);
      vec3 farOcean = vec3(0.0015, 0.007, 0.025);
      vec3 platedOcean = mix(vec3(0.001, 0.004, 0.014), vec3(0.002, 0.008, 0.021), plateBand);
      platedOcean += plateAccent * vec3(0.0003, 0.0015, 0.004);
      vec3 oceanColour = mix(farOcean, platedOcean, macroVisibility);
      oceanColour += oceanHotspot * vec3(0.0, 0.012, 0.038);
      oceanColour += southPoleLift * vec3(0.0, 0.006, 0.016);
      vec2 absoluteHex = abs(localHex);
      float hexDistance = max(absoluteHex.x / 0.8660254, absoluteHex.y + absoluteHex.x * 0.5773503);
      float artworkSnap = smoothstep(5.0, 10.0, cellPixels);
      // Resolve artwork first, then restore every available cell to the ocean
      // material so filtered campaign pixels cannot bleed into its neighbours.
      diffuseColor.rgb = mix(smoothArtwork, cellArtwork, artworkSnap);
      diffuseColor.rgb = mix(diffuseColor.rgb, oceanColour, availableCell * 0.98);
      diffuseColor.rgb = mix(diffuseColor.rgb, purchasedColour.rgb, purchasedColour.a);
      float edgeWidth = max(fwidth(hexDistance) * 1.15, 0.002);
      float hexEdge = 1.0 - smoothstep(0.0, edgeWidth, 1.0 - hexDistance);
      diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * 0.62, hexEdge * detailVisibility * 0.26);

      // Buying mode uses unmistakably different fills for available and sold cells.
      vec3 purchasedFill = diffuseColor.rgb * 0.34 + vec3(0.012, 0.018, 0.022);
      vec3 availableFill = vec3(0.004, 0.018, 0.025);
      vec3 selectionFill = mix(purchasedFill, availableFill, availableCell);
      diffuseColor.rgb = mix(diffuseColor.rgb, selectionFill, selectionMode * 0.86);
      diffuseColor.rgb = mix(diffuseColor.rgb, selectedColour.rgb, selectedColour.a * selectionMode * 0.94);
      float selectionGrid = hexEdge * selectionMode * smoothstep(0.8, 2.2, cellPixels);
      vec3 selectionInk = mix(vec3(0.38, 0.46, 0.48), vec3(0.015, 0.045, 0.055), availableCell);
      diffuseColor.rgb = mix(diffuseColor.rgb, selectionInk, selectionGrid * 0.55);
      float hoveredCell = (1.0 - step(0.1, abs(cellAddress.x - hoverCell.x) + abs(cellAddress.y - hoverCell.y))) * selectionMode;
      vec3 hoverInk = mix(vec3(0.65), vec3(0.96), availableCell);
      diffuseColor.rgb = mix(diffuseColor.rgb, hoverInk, hexEdge * hoveredCell * 0.82);
    #endif`
  );
  shader.fragmentShader = shader.fragmentShader.replace(
    '#include <emissivemap_fragment>',
    `#include <emissivemap_fragment>
    totalEmissiveRadiance += oceanColour * availableCell * oceanHotspot * 0.075;
    totalEmissiveRadiance += vec3(0.01, 0.24, 0.78) * attachedRim * 0.28;`
  );
};
globeMaterial.customProgramCacheKey = () => 'million-hexagons-midnight-macro-plates-v13';
const sphere = new THREE.Mesh(new THREE.SphereGeometry(radius, 192, 128), globeMaterial);
sphere.receiveShadow = true;
globe.add(sphere);

const wire = new THREE.Mesh(
  new THREE.SphereGeometry(radius + .012, 40, 24),
  new THREE.MeshBasicMaterial({ color: 0xb9f8ed, wireframe: true, transparent: true, opacity: 0 })
);
globe.add(wire);

scene.add(new THREE.HemisphereLight(0xe8fbff, 0x07121c, 2.7));
const key = new THREE.DirectionalLight(0xffffff, 3.6);
key.position.set(-7, 8, 10);
scene.add(key);
const rim = new THREE.DirectionalLight(0x135cb8, .85);
rim.position.set(8, 0, -8);
scene.add(rim);
const southFill = new THREE.DirectionalLight(0x1c4e98, .72);
southFill.position.set(1, -9, 5);
scene.add(southFill);

const stars = [];
for (let i = 0; i < 950; i += 1) {
  const r = 25 + Math.random() * 35;
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  stars.push(r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta));
}
const starGeometry = new THREE.BufferGeometry();
starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(stars, 3));
scene.add(new THREE.Points(starGeometry, new THREE.PointsMaterial({ color: 0xb7dce7, size: .035, transparent: true, opacity: .55 })));

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = .055;
controls.enablePan = false;
controls.minDistance = radius + .22;
controls.rotateSpeed = .42;
controls.zoomSpeed = .72;
controls.autoRotate = !matchMedia('(prefers-reduced-motion: reduce)').matches;
controls.autoRotateSpeed = .22;

function globeFitDistance() {
  const verticalFov = THREE.MathUtils.degToRad(camera.fov);
  const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * camera.aspect);
  return (radius + .24) / Math.sin(Math.min(verticalFov, horizontalFov) / 2) * 1.12;
}

function frameGlobe(reset = false) {
  const fit = globeFitDistance();
  controls.maxDistance = fit * 1.08;
  controls.target.set(0, 0, 0);
  if (reset) camera.position.set(0, fit * .018, fit);
  else if (camera.position.length() > controls.maxDistance) camera.position.setLength(controls.maxDistance);
}
frameGlobe(true);

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const tooltip = document.querySelector('#cellTooltip');
const placementLayers = new THREE.Group();
globe.add(placementLayers);
const previewPlacementLayers = new THREE.Group();
globe.add(previewPlacementLayers);
let selecting = false;
let selectedUV = null;
let selectedCell = null;
let selectedNormal = null;
let selectedCells = [];
let uploadedLogo = null;
let uploadedLogoCrop = null;
let sold = occupiedCells.reduce((total, value) => total + (value ? 1 : 0), 0);
let cameraDistanceTarget = null;
let painting = false;
let paintAction = 'paint';
let lastPaintedCellId = null;
let selectionError = '';
let fixedArtworkMode = 'colour';
let creationType = null;
let buyInteractionMode = 'move';
let designCells = [];
let logoCells = null;
let draftArtwork = null;
let editorPainting = false;
const selectedCellColours = new Map();
const sessionPlacements = new Map();
let explorationStart = null;
canvas.addEventListener('pointerdown', event => { explorationStart = {x:event.clientX,y:event.clientY}; });
canvas.addEventListener('pointerup', event => {
  if (document.body.classList.contains('creating') || !explorationStart || Math.hypot(event.clientX-explorationStart.x,event.clientY-explorationStart.y)>6) return;
  const hit=intersect(event); if(!hit?.uv) return;
  const placement=sessionPlacements.get(cellFromUV(hit.uv).id); if(!placement) return;
  const toast=document.querySelector('#toast');
  toast.querySelector('b').textContent='Your placement';
  toast.querySelector('span').textContent=`${placement.count} hexagons. Saved for this session.`;
  const link=document.querySelector('#placementWebsite'); link.hidden=!placement.website; link.href=placement.website;
  toast.classList.add('show');
});

function writeCellColour(data, cell, colour, selected = true) {
  const offset = (cell.id - 1) * 4;
  if (!selected) {
    data[offset + 3] = 0;
    return;
  }
  const linearColour = new THREE.Color(colour);
  data[offset] = Math.round(linearColour.r * 255);
  data[offset + 1] = Math.round(linearColour.g * 255);
  data[offset + 2] = Math.round(linearColour.b * 255);
  data[offset + 3] = 255;
}

function clearSelectionColours() {
  selectedCellColours.clear();
  selectionColourData.fill(0);
  selectionColourTexture.needsUpdate = true;
}

function clearHover() {
  hoverCellUniform.value.set(-2, -2);
}

function updateInventoryDisplay() {
  document.querySelector('#soldCount').textContent = sold.toLocaleString();
  document.querySelector('#availableCount').textContent = (1000000 - sold).toLocaleString();
  document.querySelector('#soldMeter').style.width = `${sold / 10000}%`;
}
updateInventoryDisplay();

function cellFromUV(uv) {
  const gridX = uv.x * 2165.0635;
  const gridY = uv.y * 1200;
  const baseRow = Math.floor(gridY / 1.5 + .5);
  let nearestDistance = Infinity;
  let nearestRow = baseRow;
  let nearestColumn = 0;
  for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
    const candidateRow = baseRow + rowOffset;
    const offsetX = ((candidateRow % 2) + 2) % 2 * .8660254;
    const candidateColumn = Math.floor((gridX - offsetX) / 1.7320508 + .5);
    const centreX = candidateColumn * 1.7320508 + offsetX;
    const centreY = candidateRow * 1.5;
    const distance = (gridX - centreX) ** 2 + (gridY - centreY) ** 2;
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestRow = candidateRow;
      nearestColumn = candidateColumn;
    }
  }
  const row = THREE.MathUtils.clamp(nearestRow, 0, logicalRows - 1);
  const col = THREE.MathUtils.clamp(nearestColumn, 0, logicalColumns - 1);
  const id = row * logicalColumns + col + 1;
  const longitude = uv.x * 360 - 180;
  const latitude = uv.y * 180 - 90;
  const occupied = occupiedCells[id - 1] === 255;
  return { id, col, row, longitude, latitude, occupied, owner: occupied ? 'Purchased' : 'Available' };
}

function intersect(event) {
  const rect = canvas.getBoundingClientRect();
  pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  return raycaster.intersectObject(sphere, false)[0];
}

function updateTooltip(event, cell) {
  document.querySelector('#cellId').textContent = `HEX #${String(cell.id).padStart(6, '0')}`;
  document.querySelector('#cellOwner').textContent = cell.owner;
  document.querySelector('#cellPosition').textContent = `${Math.abs(cell.latitude).toFixed(2)}° ${cell.latitude >= 0 ? 'N' : 'S'} · ${Math.abs(cell.longitude).toFixed(2)}° ${cell.longitude >= 0 ? 'E' : 'W'}`;
  tooltip.style.left = `${Math.min(innerWidth - 205, event.clientX + 16)}px`;
  tooltip.style.top = `${Math.min(innerHeight - 90, event.clientY + 16)}px`;
  tooltip.classList.add('show');
}

function connectedPattern(origin, amount, shape) {
  return translateFootprint(previewCells().map(c => ({...c, row:-c.row})), origin);
}

function refreshSelection() {
  const shape = document.querySelector('#selectionShape').value;
  const amount = shape === 'painted' ? designCells.length : Math.max(1, Math.min(10000, Number(document.querySelector('#hexAmount').value) || 1));
  if (selectedCell) {
    const candidateCells = connectedPattern(selectedCell, amount, shape);
    const blocked = candidateCells.find((cell) => cell.col < 0 || cell.col >= logicalColumns || cell.row < 1 || cell.row >= logicalRows - 1 || occupiedCells[cell.id - 1]);
    if (blocked) {
      selectedCells = [];
      selectionError = 'That area overlaps purchased hexagons. Try another location, shape or quantity.';
    } else {
      selectedCells = candidateCells;
      selectionError = '';
    }
  }
  const count = selectedCells.length;
  const status = document.querySelector('#selectionStatus');
  const colourCount = shape === 'painted' ? new Set(selectedCells.map((cell) => cell.color).filter(Boolean)).size : new Set(selectedCells.map((cell) => selectedCellColours.get(cell.id)).filter(Boolean)).size;
  const selectedSummary = shape === 'custom' || shape === 'painted'
    ? `<b>✓</b> ${count.toLocaleString()} hexagon${count === 1 ? '' : 's'} selected · ${colourCount} colour${colourCount === 1 ? '' : 's'}.`
    : `<b>✓</b> ${count.toLocaleString()} available hexagon${count === 1 ? '' : 's'} selected.`;
  status.classList.toggle('error', Boolean(selectionError));
  status.innerHTML = selectionError || (count
    ? selectedSummary
    : 'Switch to Place design, then click an available area.');
  const artworkReady = fixedArtworkMode === 'colour' || Boolean(uploadedLogo);
  document.querySelector('#previewPurchase').disabled = !count || !artworkReady;
  document.querySelector('#toReview').disabled = !count || !artworkReady;
  renderSelectionPreview();
  clearPlacementPreview();
  if (count) addHighResolutionPlacement(document.querySelector('#brandColor').value, document.querySelector('#logoTreatment').value, previewPlacementLayers);
}

function renderSelectionPreview() {
  if (document.querySelector('#selectionShape').value !== 'custom') {
    selectionColourData.fill(0);
    const colour = document.querySelector('#brandColor').value;
    selectedCells.forEach((cell) => writeCellColour(selectionColourData, cell, cell.color || colour));
  }
  selectionColourTexture.needsUpdate = true;
}

function updateHover(hit, cell) {
  if (!selecting) {
    clearHover();
    return;
  }
  hoverCellUniform.value.set(cell.col, cell.row);
}

function choosePatternOrigin(hit, cell) {
  if (cell.occupied) {
    selectionError = 'That hexagon is already purchased. Choose one of the available hexagons.';
    selectedUV = null;
    selectedCell = null;
    selectedNormal = null;
    selectedCells = [];
    refreshSelection();
    return;
  }
  selectedUV = hit.uv.clone();
  selectedCell = cell;
  selectedNormal = globe.worldToLocal(hit.point.clone()).normalize();
  selectionError = '';
  refreshSelection();
  document.querySelector('#toReview').disabled = !selectedCells.length;
}

function paintCustomCell(hit, cell) {
  if (cell.id === lastPaintedCellId) return;
  lastPaintedCellId = cell.id;
  const existing = selectedCells.findIndex((selected) => selected.id === cell.id);
  if (paintAction === 'paint') {
    if (cell.occupied) {
      selectionError = 'Purchased hexagons are dark and cannot be selected.';
      refreshSelection();
      return;
    }
    if (existing < 0) {
      if (!selectedCell) {
        selectedUV = hit.uv.clone();
        selectedCell = cell;
        selectedNormal = globe.worldToLocal(hit.point.clone()).normalize();
      }
      selectedCells.push(cell);
    }
    const colour = document.querySelector('#brandColor').value;
    selectedCellColours.set(cell.id, colour);
    writeCellColour(selectionColourData, cell, colour);
  } else if (existing >= 0) {
    selectedCells.splice(existing, 1);
    selectedCellColours.delete(cell.id);
    writeCellColour(selectionColourData, cell, '#000000', false);
    if (!selectedCells.length) {
      selectedUV = null;
      selectedCell = null;
      selectedNormal = null;
    }
  }
  selectionError = '';
  amountInput.value = Math.max(1, selectedCells.length);
  document.querySelector('#price').textContent = `$${selectedCells.length.toLocaleString()}`;
  refreshSelection();
}

canvas.addEventListener('pointerdown', (event) => {
  if (!selecting || buyInteractionMode !== 'place' || event.button !== 0) return;
  const hit = intersect(event);
  if (!hit?.uv) return;
  event.preventDefault();
  const cell = cellFromUV(hit.uv);
  const shape = document.querySelector('#selectionShape').value;
  if (shape === 'custom') {
    painting = true;
    lastPaintedCellId = null;
    canvas.setPointerCapture(event.pointerId);
    paintCustomCell(hit, cell);
  } else {
    choosePatternOrigin(hit, cell);
  }
});

canvas.addEventListener('pointermove', (event) => {
  const hit = intersect(event);
  if (!hit?.uv) {
    clearHover();
    tooltip.classList.remove('show');
    return;
  }
  const cell = cellFromUV(hit.uv);
  if (!selecting) return updateTooltip(event, cell);
  if (buyInteractionMode !== 'place') {
    clearHover();
    tooltip.classList.remove('show');
    return;
  }
  updateHover(hit, cell);
  updateTooltip(event, cell);
  if (painting && document.querySelector('#selectionShape').value === 'custom') paintCustomCell(hit, cell);
});

function stopPainting(event) {
  painting = false;
  lastPaintedCellId = null;
  if (event?.pointerId !== undefined && canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
}
canvas.addEventListener('pointerup', stopPainting);
canvas.addEventListener('pointercancel', stopPainting);
canvas.addEventListener('pointerleave', () => { if (!painting) clearHover(); tooltip.classList.remove('show'); });

function openBuy() {
  selecting = false;
  selectionModeUniform.value = 0;
  controls.autoRotate = false;
  selectedUV = null;
  selectedCell = null;
  selectedNormal = null;
  selectedCells = [];
  clearPlacementPreview();
  clearSelectionColours();
  document.body.classList.add('creating');
  controls.enableRotate = true;
  const panel = document.querySelector('#buyPanel');
  panel.inert = false;
  panel.classList.add('open');
  panel.setAttribute('aria-hidden', 'false');
  panel.scrollTop = 0;
  showFlowStep('type');
}
function closeBuy() {
  selecting = false;
  selectionModeUniform.value = 0;
  cameraDistanceTarget = null;
  document.body.classList.remove('selecting', 'creating', 'placing-design');
  controls.enableRotate = true;
  stopPainting();
  clearHover();
  tooltip.classList.remove('show');
  document.querySelector('#buyPanel').inert = true;
  document.querySelector('#buyPanel').classList.remove('open');
  delete document.body.dataset.flow;
  resize();
  document.querySelector('#claimButton').focus();
  document.querySelector('#buyPanel').setAttribute('aria-hidden', 'true');
  clearSelectionColours();
  clearPlacementPreview();
  document.querySelector('#hint').innerHTML = '<span>DRAG TO ROTATE</span><i></i><span>SCROLL TO ZOOM</span><i></i><span>CLICK A TILE</span>';
}
document.querySelector('#claimButton').addEventListener('click', openBuy);
document.querySelector('#closeBuy').addEventListener('click', closeBuy);
function setPaintAction(action) {
  paintAction = action;
  document.querySelector('#paintCells').setAttribute('aria-pressed', String(action === 'paint'));
  document.querySelector('#eraseCells').setAttribute('aria-pressed', String(action === 'erase'));
  selectionError = '';
  refreshSelection();
}
document.querySelector('#paintCells').addEventListener('click', () => setPaintAction('paint'));
document.querySelector('#eraseCells').addEventListener('click', () => setPaintAction('erase'));
document.querySelector('#exploreButton').addEventListener('click', () => { controls.autoRotate = !controls.autoRotate; });
document.querySelector('#randomButton').addEventListener('click', () => {
  controls.autoRotate = false;
  globe.rotation.set((Math.random() - .5) * 1.8, Math.random() * Math.PI * 2, 0);
});
document.querySelector('#zoomIn').addEventListener('click', () => {
  camera.position.setLength(Math.max(controls.minDistance, camera.position.length() * .78));
});
document.querySelector('#zoomOut').addEventListener('click', () => {
  camera.position.setLength(Math.min(controls.maxDistance, camera.position.length() * 1.24));
});
document.querySelector('#homeView').addEventListener('click', () => {
  controls.autoRotate = false;
  const fit = globeFitDistance();
  camera.position.set(0, fit * .018, fit);
  controls.target.set(0, 0, 0);
});

const hexSearch = document.querySelector('#hexSearch');
const hexSearchPanel = document.querySelector('#hexSearchPanel');
const hexSearchInput = document.querySelector('#hexSearchInput');
const hexSearchStatus = document.querySelector('#hexSearchStatus');
function showHexSearch(open) {
  hexSearchPanel.hidden = !open;
  document.querySelector('#toggleHexSearch').setAttribute('aria-expanded', String(open));
  if (open) hexSearchInput.focus();
}
document.querySelector('#toggleHexSearch').addEventListener('click', () => showHexSearch(hexSearchPanel.hidden));
hexSearch.addEventListener('submit', (event) => {
  event.preventDefault();
  const match = hexSearchInput.value.trim().match(/^#?([0-9]{1,7})$/);
  const id = match ? Number(match[1]) : 0;
  if (id < 1 || id > logicalColumns * logicalRows) {
    hexSearchStatus.textContent = 'Use a hex number from 1 to 1,000,000.';
    hexSearchInput.setAttribute('aria-invalid', 'true');
    return;
  }
  const cell = { id, row: Math.floor((id - 1) / logicalColumns), col: (id - 1) % logicalColumns };
  controls.autoRotate = false;
  cameraDistanceTarget = null;
  const direction = globe.localToWorld(spherePointForGrid(cell, 0, 0)).normalize();
  camera.position.copy(direction.multiplyScalar(radius + .82));
  controls.target.set(0, 0, 0);
  controls.update();
  hoverCellUniform.value.set(cell.col, cell.row);
  hexSearchInput.removeAttribute('aria-invalid');
  hexSearchStatus.textContent = `Centred on hex #${id.toLocaleString()}.`;
});

const amountInput = document.querySelector('#hexAmount');
function updateLogoGuidance(message) {
  const amount = Math.max(0, Number(amountInput.value) || 0);
  const guidance = document.querySelector('#logoGuidance');
  guidance.textContent = message || 'Check small text in the preview. Simpler artwork stays clearer at a distance.';
}

function setFixedArtworkMode(mode) {
  fixedArtworkMode = mode;
  updateLogoGuidance();
  refreshSelection();
}
function updatePaintColour() {
  document.querySelector('#paintColourChip').style.background = document.querySelector('#brandColor').value;
  renderSelectionPreview();
  drawDesignPreview();
}
document.querySelector('#brandColor').addEventListener('input', updatePaintColour);

function updateLogoPreviewOrientation() {
  const degrees = Number(document.querySelector('#logoOrientation').value) || 0;
  document.querySelector('#logoPreview').style.setProperty('--logo-rotation', `${degrees}deg`);
}
document.querySelector('#logoOrientation').addEventListener('change', updateLogoPreviewOrientation);

const flowScreens = { type: document.querySelector('#typeStep'), design: document.querySelector('#designStep'), place: document.querySelector('#placeStep'), review: document.querySelector('#reviewStep') };
function showFlowStep(step) {
  document.body.dataset.flow = step;
  resize();
  Object.entries(flowScreens).forEach(([name, screen]) => { screen.hidden = name !== step; screen.classList.toggle('active', name === step); });
  const progress = [...document.querySelectorAll('.flow-progress i')];
  const stepNumber = step === 'review' ? 3 : step === 'place' ? 2 : 1;
  progress.forEach((item, index) => item.classList.toggle('active', index < stepNumber));
  document.querySelector('#buyPanel').scrollTop = 0;
  const heading = flowScreens[step].querySelector('h2');
  heading.tabIndex = -1;
  heading.focus({ preventScroll: true });
}

function placementCount() {
  return creationType === 'paint' ? designCells.length : Math.max(1, Math.min(10000, Math.floor(Number(amountInput.value)) || 1));
}

function updateTotals() {
  const count = placementCount();
  const countText = `${count.toLocaleString()} hexagon${count === 1 ? '' : 's'}`;
  const priceText = `$${count.toLocaleString()}`;
  document.querySelector('#designCount').textContent = countText;
  document.querySelector('#price').textContent = priceText;
  document.querySelector('#placeCount').textContent = countText;
  document.querySelector('#placePrice').textContent = priceText;
  document.querySelector('#reviewCount').textContent = countText;
  document.querySelector('#reviewPrice').textContent = priceText;
  document.querySelector('#toPlacement').disabled = !count || (creationType === 'logo' && !uploadedLogo);
  document.querySelectorAll('.size-presets button').forEach((button) => button.classList.toggle('active', Number(button.dataset.size) === count));
  updateLogoGuidance();
}

let editorHitRegions = [];
function previewCells() {
  if (creationType === 'paint') return designCells;
  const aspect = creationType === 'logo' && uploadedLogo
    ? (uploadedLogoCrop?.width || uploadedLogo.naturalWidth) / (uploadedLogoCrop?.height || uploadedLogo.naturalHeight) : 1.25;
  if (creationType === 'logo' && logoCells) return logoCells;
  return compactFootprint(placementCount(), aspect);
}

function adjacentLogoCandidates(cells) {
  const active = new Set(cells.map((cell) => `${cell.col},${cell.row}`));
  const candidates = new Map();
  cells.forEach((cell) => {
    for (let row = cell.row - 1; row <= cell.row + 1; row += 1) for (let col = cell.col - 1; col <= cell.col + 1; col += 1) {
      const key = `${col},${row}`;
      if (active.has(key)) continue;
      if (Math.hypot(centre({ col, row }).x - centre(cell).x, centre({ col, row }).y - centre(cell).y) < 1.8) candidates.set(key, { col, row, guide: true });
    }
  });
  return [...candidates.values()];
}

function isConnectedFootprint(cells) {
  if (!cells.length) return false;
  const pending = [cells[0]];
  const visited = new Set([`${cells[0].col},${cells[0].row}`]);
  while (pending.length) {
    const current = pending.pop();
    cells.forEach((cell) => {
      const key = `${cell.col},${cell.row}`;
      if (!visited.has(key) && Math.hypot(centre(cell).x - centre(current).x, centre(cell).y - centre(current).y) < 1.8) { visited.add(key); pending.push(cell); }
    });
  }
  return visited.size === cells.length;
}

function hexPath(context, x, y, size, append = false) {
  if (!append) context.beginPath();
  for (let corner = 0; corner < 6; corner += 1) {
    const angle = Math.PI / 3 * corner - Math.PI / 2;
    const px = x + Math.cos(angle) * size;
    const py = y + Math.sin(angle) * size;
    if (!corner) context.moveTo(px, py); else context.lineTo(px, py);
  }
  context.closePath();
}

function drawDesignPreview(target = document.querySelector('#designCanvas')) {
  if (!target) return;
  if (target.id === 'designCanvas') draftArtwork = null;
  if ((creationType !== 'paint' && creationType !== 'logo') || target.id === 'reviewCanvas') {
    const ctx = target.getContext('2d');
    ctx.clearRect(0, 0, target.width, target.height);
    const cells = previewCells();
    if (cells.length) {
      const art = target.id === 'reviewCanvas' && draftArtwork ? draftArtwork : renderArtwork(cells);
      const scale = Math.min((target.width - 64) / art.width, (target.height - 48) / art.height);
      ctx.drawImage(art, (target.width-art.width*scale)/2, (target.height-art.height*scale)/2, art.width*scale, art.height*scale);
    }
    document.querySelector('#editorEmpty').hidden = Boolean(cells.length);
    return;
  }
  if (creationType === 'logo') {
    const context = target.getContext('2d');
    context.clearRect(0, 0, target.width, target.height);
    context.fillStyle = '#071722'; context.fillRect(0, 0, target.width, target.height);
    const cells = previewCells();
    const guides = adjacentLogoCandidates(cells);
    const displayBounds = footprintBounds([...cells, ...guides]);
    const scale = Math.min((target.width - 44) / displayBounds.width, (target.height - 36) / displayBounds.height);
    const offsetX = (target.width - displayBounds.width * scale) / 2;
    const offsetY = (target.height - displayBounds.height * scale) / 2;
    const point = (cell) => { const p = centre(cell); return { x: offsetX + (p.x - displayBounds.left) * scale, y: offsetY + (p.y - displayBounds.top) * scale }; };
    const bounds = footprintBounds(cells);
    const art = renderArtwork(cells);
    context.drawImage(art, offsetX + (bounds.left - displayBounds.left) * scale, offsetY + (bounds.top - displayBounds.top) * scale, bounds.width * scale, bounds.height * scale);
    editorHitRegions = [...cells, ...guides].map((cell) => ({ ...cell, ...point(cell), size: scale }));
    guides.forEach((cell) => { const p = point(cell); hexPath(context, p.x, p.y, scale * .91); context.fillStyle='rgba(14,39,49,.72)'; context.fill(); context.strokeStyle='rgba(212,255,88,.38)'; context.setLineDash([4,4]); context.stroke(); context.setLineDash([]); });
    cells.forEach((cell) => { const p = point(cell); hexPath(context, p.x, p.y, scale * .94); context.strokeStyle='rgba(220,255,245,.34)'; context.lineWidth=1.2; context.stroke(); });
    document.querySelector('#editorEmpty').hidden = Boolean(cells.length);
    return;
  }
  const context = target.getContext('2d');
  const width = target.width;
  const height = target.height;
  context.clearRect(0, 0, width, height);
  context.fillStyle = '#071722';
  context.fillRect(0, 0, width, height);
  const cells = previewCells();
  const editingGrid = creationType === 'paint';
  const displayCells = editingGrid
    ? Array.from({ length: 135 }, (_, index) => ({ col: index % 15, row: Math.floor(index / 15), guide: true }))
    : cells;
  const minCol = Math.min(...displayCells.map((cell) => cell.col), 0);
  const maxCol = Math.max(...displayCells.map((cell) => cell.col), 1);
  const minRow = Math.min(...displayCells.map((cell) => cell.row), 0);
  const maxRow = Math.max(...displayCells.map((cell) => cell.row), 1);
  const size = Math.min(22, (width - 56) / ((maxCol - minCol + 1.5) * 1.732), (height - 46) / ((maxRow - minRow + 1.35) * 1.5));
  const gridWidth = (maxCol - minCol + 1.5) * 1.732 * size;
  const gridHeight = (maxRow - minRow + 1.35) * 1.5 * size;
  const originX = (width - gridWidth) / 2 - minCol * 1.732 * size + size;
  const originY = (height - gridHeight) / 2 - minRow * 1.5 * size + size;
  const point = (cell) => ({ x: originX + (cell.col + (cell.row % 2) * .5) * 1.732 * size, y: originY + cell.row * 1.5 * size });
  editorHitRegions = displayCells.map((cell) => ({ ...cell, ...point(cell), size }));
  const activeMap = new Map(cells.map((cell) => [`${cell.col},${cell.row}`, cell]));

  displayCells.forEach((cell) => {
    const active = activeMap.get(`${cell.col},${cell.row}`);
    const position = point(cell);
    hexPath(context, position.x, position.y, size * .96);
    context.fillStyle = active?.color || (active ? document.querySelector('#brandColor').value : '#102a35');
    context.fill();
    context.strokeStyle = active ? 'rgba(220,255,245,.34)' : 'rgba(125,174,181,.16)';
    context.lineWidth = active ? 1.6 : 1;
    context.stroke();
  });

  if (creationType === 'logo' && uploadedLogo && cells.length) {
    context.save();
    context.beginPath();
    cells.forEach((cell) => { const p = point(cell); hexPath(context, p.x, p.y, size * .94, true); });
    context.clip();
    context.translate(width / 2, height / 2);
    context.rotate(THREE.MathUtils.degToRad(Number(document.querySelector('#logoOrientation').value) || 0));
    context.translate(-width / 2, -height / 2);
    if (document.querySelector('#logoTreatment').value === 'repeat') {
      cells.forEach((cell) => { const p = point(cell); context.save(); hexPath(context, p.x, p.y, size * .9); context.clip(); drawLogo(context, size * 1.55, size * 1.55, document.querySelector('#brandColor').value, true, p.x - size * .775, p.y - size * .775); context.restore(); });
    } else drawLogo(context, width, height, document.querySelector('#brandColor').value, true);
    context.restore();
  }
  document.querySelector('#editorEmpty').hidden = Boolean(cells.length);
}

function paintEditorAt(event) {
  if (creationType !== 'paint' && creationType !== 'logo') return;
  const rect = event.currentTarget.getBoundingClientRect();
  const x = (event.clientX - rect.left) * event.currentTarget.width / rect.width;
  const y = (event.clientY - rect.top) * event.currentTarget.height / rect.height;
  const hit = editorHitRegions.reduce((nearest, cell) => Math.hypot(cell.x - x, cell.y - y) < Math.hypot(nearest.x - x, nearest.y - y) ? cell : nearest, editorHitRegions[0]);
  if (!hit || Math.hypot(hit.x - x, hit.y - y) > hit.size) return;
  if (creationType === 'logo') {
    const cells = previewCells();
    const index = cells.findIndex((cell) => cell.col === hit.col && cell.row === hit.row);
    if (index < 0) logoCells = [...cells, { col: hit.col, row: hit.row }];
    else {
      const reduced = cells.filter((_, cellIndex) => cellIndex !== index);
      if (!isConnectedFootprint(reduced)) { updateLogoGuidance('Keep at least one connected hexagon. Remove a different edge hexagon.'); return; }
      logoCells = reduced;
    }
    amountInput.value = logoCells.length;
    selectedCell = null; selectedCells = [];
    drawDesignPreview(); updateTotals();
    return;
  }
  const index = designCells.findIndex((cell) => cell.col === hit.col && cell.row === hit.row);
  if (paintAction === 'erase') {
    if (index >= 0) designCells.splice(index, 1);
  } else if (index >= 0) designCells[index].color = document.querySelector('#brandColor').value;
  else designCells.push({ col: hit.col, row: hit.row, color: document.querySelector('#brandColor').value });
  amountInput.value = designCells.length;
  drawDesignPreview();
  updateTotals();
}

function configureCreation(type) {
  creationType = type;
  fixedArtworkMode = type === 'logo' ? 'logo' : 'colour';
  document.querySelector('#selectionShape').value = type === 'logo' ? 'logo' : type === 'paint' ? 'painted' : 'compact';
  document.querySelector('#designTitle').textContent = type === 'logo' ? 'Make your logo look great' : type === 'paint' ? 'Paint your design' : 'Choose your colour and size';
  document.querySelector('#designIntro').textContent = type === 'paint' ? 'Every coloured hexagon becomes part of your placement.' : 'This is a true hex-mosaic preview of your placement.';
  document.querySelector('#logoControls').hidden = type !== 'logo';
  document.querySelector('#logoOptions').hidden = type !== 'logo';
  document.querySelector('#colourControls').hidden = type === 'logo';
  document.querySelector('#customPaintTools').hidden = type !== 'paint';
  document.querySelector('#logoFootprintHelp').hidden = type !== 'logo';
  document.querySelector('#sizeControls').hidden = type === 'paint';
  if (type === 'logo') amountInput.value = 150;
  if (type === 'colour') amountInput.value = 50;
  if (type === 'paint' && !designCells.length) amountInput.value = 0;
  showFlowStep('design');
  drawDesignPreview();
  updateTotals();
}

function setInteractionMode(mode) {
  buyInteractionMode = mode;
  document.querySelector('#moveGlobeMode').classList.toggle('active', mode === 'move');
  document.querySelector('#placeDesignMode').classList.toggle('active', mode === 'place');
  document.body.classList.toggle('placing-design', mode === 'place');
  controls.enableRotate = mode === 'move';
  document.querySelector('#selectionStatus').textContent = mode === 'move' ? 'Drag the globe to find the right location.' : 'Click an available area to place your design.';
  document.querySelector('#hint').innerHTML = mode === 'move' ? '<span>DRAG TO ROTATE</span><i></i><span>SCROLL TO ZOOM</span>' : '<span>CLICK TO PLACE</span><i></i><span>SCROLL TO ZOOM</span>';
}

function enterPlacement() {
  draftArtwork = renderArtwork(previewCells());
  selecting = true;
  selectionModeUniform.value = 1;
  document.body.classList.add('selecting');
  selectedUV = null;
  selectedCell = null;
  selectedCells = [];
  clearSelectionColours();
  const selectionDistance = Math.max(controls.minDistance + .25, radius + 1.35);
  cameraDistanceTarget = Math.min(camera.position.length(), selectionDistance);
  showFlowStep('place');
  setInteractionMode('move');
  document.querySelector('#toReview').disabled = true;
  suggestLocation();
}


function focusSelection() {
  if(!selectedCells.length) return;
  const middle=selectedCells.reduce((sum,c)=>sum.add(spherePointForGrid(c,0,0)),new THREE.Vector3()).normalize();
  const halfVertical=THREE.MathUtils.degToRad(camera.fov)/2;
  const halfHorizontal=Math.atan(Math.tan(halfVertical)*camera.aspect);
  const limitingFov=Math.min(halfVertical,halfHorizontal);
  const corners=[[0,1],[.8660254,.5],[.8660254,-.5],[0,-1],[-.8660254,-.5],[-.8660254,.5]];
  let distance=radius+.35;
  selectedCells.forEach((cell)=>corners.forEach(([x,y])=>{
    const point=spherePointForGrid(cell,x,y);
    const depth=point.dot(middle);
    const perpendicular=point.clone().addScaledVector(middle,-depth).length();
    distance=Math.max(distance,depth+perpendicular/Math.tan(limitingFov)*1.12);
  }));
  cameraDistanceTarget=null;
  camera.position.copy(globe.localToWorld(middle.multiplyScalar(distance)));
  controls.update();
}
let suggestionIndex = 0;
function suggestLocation() {
  const draft = previewCells();
  for (let attempt = 0; attempt < 500; attempt++) {
    const index = suggestionIndex++;
    const origin = { col: 40 + (index * 137 % 1170), row: 320 + (index * 67 % 160) };
    const cells = translateFootprint(draft.map(c => ({...c,row:-c.row})), origin);
    if (cells.some((c) => c.col < 0 || c.col >= 1250 || c.row < 1 || c.row >= 799 || occupiedCells[c.id-1])) continue;
    selectedCell = origin;
    selectedUV = new THREE.Vector2(origin.col/1250,origin.row/800);
    selectedNormal = spherePointForGrid(origin,0,0).normalize();
    globe.rotation.set(0,0,0); globe.updateMatrixWorld(true);
    cameraDistanceTarget = null;
    const span = footprintBounds(cells);
    const distance = radius + Math.max(.55, Math.max(span.width, span.height) * .04);
    camera.position.copy(selectedNormal).multiplyScalar(distance);
    controls.update();
    refreshSelection();
    focusSelection();
    document.querySelector('#selectionStatus').textContent = 'Your whole design fits here. Ready when you are.';
    return;
  }
  selectedCells = []; selectedCell = null; selectedUV = null;
  refreshSelection();
  document.querySelector('#selectionStatus').textContent = 'No suggested space found for this size. Try a smaller design or choose a location manually.';
}
document.querySelector('#suggestLocation').addEventListener('click', suggestLocation);
document.querySelector('#reviewEditDesign').addEventListener('click', () => document.querySelector('#backToDesign').click());
document.querySelector('#dismissToast').addEventListener('click', () => document.querySelector('#toast').classList.remove('show'));
document.addEventListener('keydown', (event) => { if(event.key === 'Escape' && !document.querySelector('#buyPanel').inert) closeBuy(); });
const undoStack = [], redoStack = [];
function rememberPaint() { undoStack.push(structuredClone(designCells)); if(undoStack.length>50) undoStack.shift(); redoStack.length=0; updateHistory(); }
function updateHistory() { document.querySelector('#undoPaint').disabled=!undoStack.length; document.querySelector('#redoPaint').disabled=!redoStack.length; }
function restorePaint(from,to) { if(!from.length) return; to.push(structuredClone(designCells)); designCells=from.pop(); drawDesignPreview(); updateTotals(); updateHistory(); }
document.querySelector('#undoPaint').addEventListener('click',()=>restorePaint(undoStack,redoStack));
document.querySelector('#redoPaint').addEventListener('click',()=>restorePaint(redoStack,undoStack));

document.querySelector('#logoArtwork').addEventListener('click', () => configureCreation('logo'));
document.querySelector('#colourArtwork').addEventListener('click', () => configureCreation('colour'));
document.querySelector('#paintArtwork').addEventListener('click', () => configureCreation('paint'));
document.querySelector('#backToType').addEventListener('click', () => showFlowStep('type'));
document.querySelector('#toPlacement').addEventListener('click', enterPlacement);
document.querySelector('#backToDesign').addEventListener('click', () => { clearPlacementPreview(); selecting = false; selectionModeUniform.value = 0; document.body.classList.remove('selecting', 'placing-design'); controls.enableRotate = true; showFlowStep('design'); });
document.querySelector('#moveGlobeMode').addEventListener('click', () => setInteractionMode('move'));
document.querySelector('#placeDesignMode').addEventListener('click', () => setInteractionMode('place'));
document.querySelector('#toReview').addEventListener('click', () => {
  if (!selectedCells.length) return;
  showFlowStep('review');
  setInteractionMode('move');
  focusSelection();
  document.querySelector('#reviewKind').textContent = creationType === 'logo' ? 'Logo placement' : creationType === 'paint' ? 'Painted placement' : 'Colour placement';
  const reviewCanvas = document.querySelector('#reviewCanvas');
  drawDesignPreview(reviewCanvas);
  const warning = document.querySelector('#reviewWarning');
  warning.hidden = creationType !== 'logo';
  warning.textContent = 'Small text can be hard to read from a distance. Zoom out to check your artwork before adding it.';
  clearPlacementPreview();
  addHighResolutionPlacement(document.querySelector('#brandColor').value, document.querySelector('#logoTreatment').value, previewPlacementLayers);
});
document.querySelector('#backToPlacement').addEventListener('click', () => { clearPlacementPreview(); showFlowStep('place'); setInteractionMode('move'); refreshSelection(); });
document.querySelectorAll('.size-presets button').forEach((button) => button.addEventListener('click', () => { amountInput.value = button.dataset.size; logoCells = null; selectedCell = null; selectedCells = []; drawDesignPreview(); updateTotals(); }));
amountInput.addEventListener('change', () => { amountInput.value = placementCount(); });
amountInput.addEventListener('input', () => { logoCells = null; selectedCell = null; selectedCells = []; drawDesignPreview(); updateTotals(); });
document.querySelectorAll('[data-treatment]').forEach((button) => button.addEventListener('click', () => { document.querySelector('#logoTreatment').value = button.dataset.treatment; document.querySelectorAll('[data-treatment]').forEach((item) => item.classList.toggle('active', item === button)); drawDesignPreview(); updateLogoGuidance(); }));
document.querySelector('#logoScale').addEventListener('input', () => drawDesignPreview());
document.querySelector('#logoOrientation').addEventListener('change', () => { updateLogoPreviewOrientation(); drawDesignPreview(); });
document.querySelector('#resetLogo').addEventListener('click', () => { document.querySelector('#logoScale').value = 100; document.querySelector('#logoOrientation').value = '0'; updateLogoPreviewOrientation(); drawDesignPreview(); });
document.querySelector('#clearPaint').addEventListener('click', () => { rememberPaint(); designCells = []; amountInput.value = 0; drawDesignPreview(); updateTotals(); });
const designCanvas = document.querySelector('#designCanvas');
designCanvas.addEventListener('pointerdown', (event) => { if(creationType === 'paint') rememberPaint(); editorPainting = true; designCanvas.setPointerCapture(event.pointerId); paintEditorAt(event); });
designCanvas.addEventListener('pointermove', (event) => { if (editorPainting && creationType === 'paint') paintEditorAt(event); });
designCanvas.addEventListener('pointerup', () => { editorPainting = false; });
designCanvas.addEventListener('pointercancel', () => { editorPainting = false; });
updatePaintColour();

function rgbToHex(red, green, blue) {
  return `#${[red, green, blue].map((value) => value.toString(16).padStart(2, '0')).join('')}`;
}

function logoColours(image) {
  const sample = document.createElement('canvas');
  sample.width = 96;
  sample.height = 96;
  const sampleContext = sample.getContext('2d', { willReadFrequently: true });
  sampleContext.clearRect(0, 0, 96, 96);
  const scale = Math.min(88 / image.naturalWidth, 88 / image.naturalHeight);
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;
  sampleContext.drawImage(image, (96 - width) / 2, (96 - height) / 2, width, height);
  const pixels = sampleContext.getImageData(0, 0, 96, 96).data;
  const buckets = new Map();
  for (let index = 0; index < pixels.length; index += 16) {
    if (pixels[index + 3] < 90) continue;
    const red = Math.min(255, Math.round(pixels[index] / 24) * 24);
    const green = Math.min(255, Math.round(pixels[index + 1] / 24) * 24);
    const blue = Math.min(255, Math.round(pixels[index + 2] / 24) * 24);
    const maximum = Math.max(red, green, blue);
    const minimum = Math.min(red, green, blue);
    const saturation = maximum ? (maximum - minimum) / maximum : 0;
    const key = `${red},${green},${blue}`;
    const current = buckets.get(key) || { red, green, blue, count: 0, saturation };
    current.count += 1;
    buckets.set(key, current);
  }
  const ranked = [...buckets.values()].sort((a, b) => b.count * (.15 + b.saturation * 2) - a.count * (.15 + a.saturation * 2));
  const vivid = ranked.filter((colour) => colour.saturation > .22 && (colour.red + colour.green + colour.blue) / 3 > 28);
  const ordered = [...vivid, ...ranked.filter((colour) => !vivid.includes(colour))];
  const selected = [];
  for (const colour of ordered) {
    if (selected.every((item) => Math.hypot(item.red - colour.red, item.green - colour.green, item.blue - colour.blue) > 54)) selected.push(colour);
    if (selected.length === 6) break;
  }
  return selected.map(({ red, green, blue }) => rgbToHex(red, green, blue));
}

function findLogoContentBounds(image) {
  const longestSide = 256;
  const scale = Math.min(1, longestSide / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const sample = document.createElement('canvas');
  sample.width = width;
  sample.height = height;
  const context = sample.getContext('2d', { willReadFrequently: true });
  context.drawImage(image, 0, 0, width, height);
  const pixels = context.getImageData(0, 0, width, height).data;
  const cornerIndexes = [0, width - 1, (height - 1) * width, height * width - 1];
  const background = cornerIndexes.reduce((total, index) => {
    total.r += pixels[index * 4];
    total.g += pixels[index * 4 + 1];
    total.b += pixels[index * 4 + 2];
    return total;
  }, { r: 0, g: 0, b: 0 });
  background.r /= 4;
  background.g /= 4;
  background.b /= 4;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      const alpha = pixels[offset + 3];
      const colourDistance = Math.hypot(
        pixels[offset] - background.r,
        pixels[offset + 1] - background.g,
        pixels[offset + 2] - background.b,
      );
      if (alpha > 20 && (alpha < 245 || colourDistance > 38)) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }
  if (maxX < minX || maxY < minY) return null;
  const padding = Math.max(2, Math.round(Math.max(maxX - minX, maxY - minY) * .04));
  minX = Math.max(0, minX - padding);
  minY = Math.max(0, minY - padding);
  maxX = Math.min(width - 1, maxX + padding);
  maxY = Math.min(height - 1, maxY + padding);
  return {
    x: minX / scale,
    y: minY / scale,
    width: (maxX - minX + 1) / scale,
    height: (maxY - minY + 1) / scale,
  };
}

function showLogoPalette(colours) {
  const palette = document.querySelector('#logoPalette');
  const swatches = document.querySelector('#logoSwatches');
  swatches.replaceChildren();
  colours.forEach((colour, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.style.background = colour;
    button.title = `Use ${colour}`;
    button.setAttribute('aria-label', `Use detected logo colour ${colour}`);
    button.classList.toggle('active', index === 0);
    button.addEventListener('click', () => {
      document.querySelector('#brandColor').value = colour;
      swatches.querySelectorAll('button').forEach((item) => item.classList.toggle('active', item === button));
      updatePaintColour();
    });
    swatches.append(button);
  });
  palette.hidden = !colours.length;
  if (colours[0]) {
    document.querySelector('#brandColor').value = colours[0];
    updatePaintColour();
  }
}

let uploadVersion = 0;
document.querySelector('#logoUpload').addEventListener('change', (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  const version=++uploadVersion;
  uploadedLogo=null; uploadedLogoCrop=null;
  updateTotals(); drawDesignPreview();
  if (file.size > 4 * 1024 * 1024) {
    showUploadMessage('Logo must be smaller than 4 MB.');
    event.target.value = '';
    return;
  }
  showUploadMessage('Preparing your artwork...');
  const image = new Image();
  const url = URL.createObjectURL(file);
  image.onload = () => {
    if(version!==uploadVersion) { URL.revokeObjectURL(url); return; }
    if(image.naturalWidth*image.naturalHeight>40000000) { URL.revokeObjectURL(url); showUploadMessage('This image is too large to process. Use an image under 40 megapixels.'); return; }
    // Rasterize SVG at an explicit viewport before using source crop rectangles.
    const raster = document.createElement('canvas');
    const factor = file.type === 'image/svg+xml' ? 1536 / Math.max(image.naturalWidth,image.naturalHeight) : Math.min(1, 2048 / Math.max(image.naturalWidth, image.naturalHeight));
    raster.width = Math.max(1,Math.round(image.naturalWidth*factor));
    raster.height = Math.max(1,Math.round(image.naturalHeight*factor));
    raster.getContext('2d').drawImage(image,0,0,raster.width,raster.height);
    raster.naturalWidth=raster.width; raster.naturalHeight=raster.height;
    uploadedLogo = raster;
    uploadedLogoCrop = findLogoContentBounds(raster);
    const preview = document.querySelector('#logoPreview');
    const previewImage = document.createElement('img');
    previewImage.src = raster.toDataURL();
    URL.revokeObjectURL(url);
    previewImage.alt = 'Uploaded logo preview';
    preview.replaceChildren(previewImage);
    updateLogoPreviewOrientation();
    showLogoPalette(logoColours(image));
    showUploadMessage(uploadedLogoCrop
      ? 'Logo ready. Empty outer margins were trimmed automatically so the mark uses the available space.'
      : 'Logo ready. It will be fitted inside the selected area.');
    drawDesignPreview();
    updateTotals();
    refreshSelection();
  };
  image.onerror = () => { URL.revokeObjectURL(url); if(version===uploadVersion) showUploadMessage('That image could not be read. Try PNG, JPG, WebP or SVG.'); };
  image.src = url;
});

function showUploadMessage(message) {
  document.querySelector('#uploadStatus').textContent=message;
  updateLogoGuidance(message);
}

function drawLogo(context, width, height, color, transparent = false, offsetX = 0, offsetY = 0) {
  if (!transparent) context.clearRect(offsetX, offsetY, width, height);
  if (!transparent) {
    context.fillStyle = color;
    context.fillRect(offsetX, offsetY, width, height);
  }
  if (uploadedLogo) {
    const source = uploadedLogoCrop || { x: 0, y: 0, width: uploadedLogo.naturalWidth, height: uploadedLogo.naturalHeight };
    const fit = document.querySelector('#logoFit').value;
    const padding = fit === 'contain' ? Math.min(width, height) * .08 : 0;
    const availableWidth = width - padding * 2;
    const availableHeight = height - padding * 2;
    const userScale = document.querySelector('#logoScale') ? Number(document.querySelector('#logoScale').value) / 100 : 1;
    const scale = (fit === 'cover'
      ? Math.max(availableWidth / source.width, availableHeight / source.height)
      : Math.min(availableWidth / source.width, availableHeight / source.height)) * userScale;
    const drawWidth = source.width * scale;
    const drawHeight = source.height * scale;
    context.drawImage(uploadedLogo, source.x, source.y, source.width, source.height, offsetX + (width - drawWidth) / 2, offsetY + (height - drawHeight) / 2, drawWidth, drawHeight);
  }
}

function largestLogoRect(cells, bounds, aspect, width, height) {
  const active = new Set(cells.map((cell) => `${cell.col},${cell.row}`));
  const contains = (x, y) => {
    const approximateRow = Math.round(y / 1.5);
    for (let row = approximateRow - 1; row <= approximateRow + 1; row += 1) {
      const approximateCol = Math.round(x / Math.sqrt(3) - (((row % 2) + 2) % 2) / 2);
      for (let col = approximateCol - 1; col <= approximateCol + 1; col += 1) {
        if (!active.has(`${col},${row}`)) continue;
        const p = centre({ col, row }), dx = Math.abs(x - p.x), dy = Math.abs(y - p.y);
        if (dy <= .98 && dx <= Math.sqrt(3) * (.98 - dy / 2)) return true;
      }
    }
    return false;
  };
  const middleX = bounds.left + bounds.width / 2, middleY = bounds.top + bounds.height / 2;
  const fits = (candidateHeight) => {
    const candidateWidth = candidateHeight * aspect;
    const step = .28;
    for (let y = middleY - candidateHeight / 2; y <= middleY + candidateHeight / 2; y += step) {
      for (let x = middleX - candidateWidth / 2; x <= middleX + candidateWidth / 2; x += step) if (!contains(x, y)) return false;
    }
    return true;
  };
  let low = .05, high = Math.min(bounds.height, bounds.width / aspect), best = .05;
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const candidate = (low + high) / 2;
    if (fits(candidate)) { best = candidate; low = candidate; } else high = candidate;
  }
  const safeHeight = Math.max(.05, best - .12), safeWidth = safeHeight * aspect;
  return { x: (middleX - safeWidth / 2 - bounds.left) / bounds.width * width, y: (middleY - safeHeight / 2 - bounds.top) / bounds.height * height, width: safeWidth / bounds.width * width, height: safeHeight / bounds.height * height };
}

function renderArtwork(cells) {
  const bounds = footprintBounds(cells);
  const art = document.createElement('canvas');
  const unit = Math.min(70, 1536 / Math.max(bounds.width, bounds.height));
  art.width = Math.ceil(bounds.width * unit);
  art.height = Math.ceil(bounds.height * unit);
  const context = art.getContext('2d');
  const px = art.width / bounds.width, py = art.height / bounds.height;
  const drawRotated = (x, y, width, height) => {
    const rotation = Number(document.querySelector('#logoOrientation').value) || 0;
    context.save(); context.translate(x + width / 2, y + height / 2);
    context.rotate(THREE.MathUtils.degToRad(rotation));
    const quarterTurn = Math.abs(rotation) === 90;
    const w = quarterTurn ? height : width, h = quarterTurn ? width : height;
    drawLogo(context, w, h, document.querySelector('#brandColor').value, true, -w / 2, -h / 2);
    context.restore();
  };
  const point = (cell) => { const p = centre(cell); return { x: (p.x - bounds.left)*px, y: (p.y-bounds.top)*py }; };
  cells.forEach((cell) => {
    const p = point(cell);
    // Slightly overlap texture fills so antialiased seams do not become holes in
    // the artwork-safe area. The globe geometry still supplies the visible seams.
    hexPath(context, p.x, p.y, unit * 1.01);
    context.fillStyle = cell.color || document.querySelector('#brandColor').value; context.fill();
  });
  if (creationType === 'logo' && uploadedLogo) {
    context.save(); context.beginPath();
    cells.forEach((cell) => { const p = point(cell); hexPath(context,p.x,p.y,unit*.98,true); });
    context.clip();
    if (document.querySelector('#logoTreatment').value === 'repeat') {
      cells.forEach((cell) => { const p = point(cell); context.save(); hexPath(context,p.x,p.y,unit*.98); context.clip(); drawRotated(p.x-unit*.525,p.y-unit*.525,unit*1.05,unit*1.05); context.restore(); });
    } else {
      const source = uploadedLogoCrop || { width: uploadedLogo.naturalWidth, height: uploadedLogo.naturalHeight };
      const rotation = Math.abs(Number(document.querySelector('#logoOrientation').value) || 0);
      const sourceAspect = source.width / source.height;
      const safeRect = largestLogoRect(cells, bounds, rotation === 90 ? 1 / sourceAspect : sourceAspect, art.width, art.height);
      drawRotated(safeRect.x, safeRect.y, safeRect.width, safeRect.height);
    }
    context.restore();
  }
  return art;
}

function spherePointForGrid(cell, localX, localY) {
  const gridX = cell.col * 1.7320508 + (cell.row % 2) * .8660254 + localX;
  const gridY = cell.row * 1.5 + localY;
  const u = gridX / 2165.0635;
  const v = gridY / 1200;
  const phi = u * Math.PI * 2;
  const theta = (1 - v) * Math.PI;
  const surfaceRadius = radius + .022;
  return new THREE.Vector3(
    -surfaceRadius * Math.cos(phi) * Math.sin(theta),
    surfaceRadius * Math.cos(theta),
    surfaceRadius * Math.sin(phi) * Math.sin(theta)
  );
}

function exactHexGeometry(cell, textureCoordinates) {
  const corners = [[0, 1], [.8660254, .5], [.8660254, -.5], [0, -1], [-.8660254, -.5], [-.8660254, .5]];
  const positions = [];
  const uvs = [];
  const addVertex = ([localX, localY]) => {
    const position = spherePointForGrid(cell, localX, localY);
    positions.push(position.x, position.y, position.z);
    const [u, v] = textureCoordinates(localX, localY);
    uvs.push(u, v);
  };
  for (let corner = 0; corner < corners.length; corner += 1) {
    addVertex([0, 0]);
    addVertex(corners[(corner + 1) % corners.length]);
    addVertex(corners[corner]);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.computeVertexNormals();
  return geometry;
}

function clearPlacementPreview() {
  [...previewPlacementLayers.children].forEach((child) => {
    previewPlacementLayers.remove(child);
    child.geometry?.dispose();
    child.material?.map?.dispose();
    child.material?.dispose();
  });
}

function addHighResolutionPlacement(color, treatment, targetLayer = placementLayers) {
  if (!selectedCell || !selectedCells.length) return;
  const bounds = footprintBounds(selectedCells);
  const texture = new THREE.CanvasTexture(draftArtwork || renderArtwork(previewCells()));
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const material = new THREE.MeshBasicMaterial({ map: texture, toneMapped: false, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 });
  const geometries = selectedCells.map((cell) => {
    const p = centre(cell);
    return exactHexGeometry(cell, (localX, localY) => [
      (p.x + localX - bounds.left) / bounds.width,
      (p.y + localY - bounds.top) / bounds.height
    ]);
  });
  const mergedGeometry = mergeGeometries(geometries, false);
  geometries.forEach((geometry) => geometry.dispose());
  const territory = new THREE.Mesh(mergedGeometry, material);
  territory.renderOrder = 6;
  targetLayer.add(territory);
  return territory;
}

function paintPlacement() {
  if (!selectedUV || !selectedCells.length) return;
  const rawWebsite = document.querySelector('#website').value.trim();
  let website = '';
  try { if(rawWebsite) { const parsed = new URL(rawWebsite); if(!['https:', 'http:'].includes(parsed.protocol)) throw new Error(); website=parsed.href; } } catch { const error=document.querySelector('#websiteError'); error.hidden=false; error.textContent='Enter a full website address starting with https://'; document.querySelector('#website').focus(); return; }
  document.querySelector('#websiteError').hidden=true;
  const link=document.querySelector('#placementWebsite'); link.hidden=!website; link.href=website;
  const amount = selectedCells.length;
  const color = document.querySelector('#brandColor').value;
  const treatment = document.querySelector('#logoTreatment').value;
  const custom = document.querySelector('#selectionShape').value === 'custom';
  if (fixedArtworkMode === 'colour') {
    selectedCells.forEach((cell) => writeCellColour(purchasedColourData, cell, cell.color || (custom ? selectedCellColours.get(cell.id) : null) || color));
    purchasedColourTexture.needsUpdate = true;
  }
  clearPlacementPreview();
  addHighResolutionPlacement(color, treatment);
  const placementRecord={website,count:amount};
  selectedCells.forEach((cell) => { occupiedCells[cell.id - 1] = 255; sessionPlacements.set(cell.id,placementRecord); });
  occupancyTexture.needsUpdate = true;
  sold = Math.min(1000000, sold + amount);
  updateInventoryDisplay();
  closeBuy();
  const toast = document.querySelector('#toast');
  toast.querySelector('b').textContent='Welcome to the world.';
  toast.querySelector('span').textContent='Your preview is on the globe for this session.';
  toast.classList.add('show');

}
document.querySelector('#previewPurchase').addEventListener('click', paintPlacement);

function resize() {
  const active = document.body.dataset.flow;
  const narrow = innerWidth <= 700 || (innerWidth <= 900 && innerHeight > innerWidth);
  const width = active && !narrow ? innerWidth - 490 : innerWidth;
  const height = narrow && (active === 'place' || active === 'review') ? Math.max(120, innerHeight - (active === 'place' ? Math.min(320,innerHeight*.48) : innerHeight*.55)) : narrow && !active ? Math.max(180,innerHeight-300) : innerHeight;
  canvas.style.top = narrow && !active ? '230px' : '0px';
  canvas.style.width = `${width}px`; canvas.style.height = `${height}px`;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
  frameGlobe(false);
}
addEventListener('resize', resize);
resize();
frameGlobe(true);

const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  controls.target.set(0, 0, 0);
  controls.update();
  if (cameraDistanceTarget !== null) {
    const distance = THREE.MathUtils.lerp(camera.position.length(), cameraDistanceTarget, .12);
    camera.position.setLength(distance);
    if (Math.abs(distance - cameraDistanceTarget) < .005) cameraDistanceTarget = null;
  }
  document.body.classList.toggle('detail-view', camera.position.length() < globeFitDistance() * .72);
  renderer.render(scene, camera);
}
animate();
