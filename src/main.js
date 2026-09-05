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
      vec2 absoluteHex = abs(localHex);
      float hexDistance = max(absoluteHex.x / 0.8660254, absoluteHex.y + absoluteHex.x * 0.5773503);
      float cellPixels = 1.0 / max(fwidth(gridPoint.x) / 1.7320508, fwidth(gridPoint.y) / 1.5);
      float artworkSnap = smoothstep(5.0, 10.0, cellPixels);
      diffuseColor.rgb = mix(smoothArtwork, cellArtwork, artworkSnap);
      diffuseColor.rgb = mix(diffuseColor.rgb, purchasedColour.rgb, purchasedColour.a);
      float detailVisibility = smoothstep(1.6, 4.5, cellPixels);
      float edgeWidth = max(fwidth(hexDistance) * 1.15, 0.002);
      float hexEdge = 1.0 - smoothstep(0.0, edgeWidth, 1.0 - hexDistance);
      diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * 0.62, hexEdge * detailVisibility * 0.26);

      // Buying mode uses unmistakably different fills for available and sold cells.
      vec3 purchasedFill = diffuseColor.rgb * 0.34 + vec3(0.012, 0.018, 0.022);
      vec3 availableFill = vec3(0.055, 0.32, 0.285);
      vec3 selectionFill = mix(purchasedFill, availableFill, availableCell);
      diffuseColor.rgb = mix(diffuseColor.rgb, selectionFill, selectionMode * 0.68);
      diffuseColor.rgb = mix(diffuseColor.rgb, selectedColour.rgb, selectedColour.a * selectionMode * 0.94);
      float selectionGrid = hexEdge * selectionMode * smoothstep(0.8, 2.2, cellPixels);
      vec3 selectionInk = mix(vec3(0.38, 0.46, 0.48), vec3(0.01, 0.075, 0.07), availableCell);
      diffuseColor.rgb = mix(diffuseColor.rgb, selectionInk, selectionGrid * 0.94);
      float hoveredCell = (1.0 - step(0.1, abs(cellAddress.x - hoverCell.x) + abs(cellAddress.y - hoverCell.y))) * selectionMode;
      vec3 hoverInk = mix(vec3(0.65), vec3(0.96), availableCell);
      diffuseColor.rgb = mix(diffuseColor.rgb, hoverInk, hexEdge * hoveredCell * 0.82);
    #endif`
  );
};
globeMaterial.customProgramCacheKey = () => 'million-hexagons-exact-colour-selection-v6';
const sphere = new THREE.Mesh(new THREE.SphereGeometry(radius, 192, 128), globeMaterial);
sphere.receiveShadow = true;
globe.add(sphere);

const wire = new THREE.Mesh(
  new THREE.SphereGeometry(radius + .012, 40, 24),
  new THREE.MeshBasicMaterial({ color: 0xb9f8ed, wireframe: true, transparent: true, opacity: .025 })
);
globe.add(wire);

const atmosphere = new THREE.Mesh(
  new THREE.SphereGeometry(radius + .19, 96, 64),
  new THREE.MeshBasicMaterial({ color: 0x51d6eb, transparent: true, opacity: .085, side: THREE.BackSide, blending: THREE.AdditiveBlending })
);
globe.add(atmosphere);

scene.add(new THREE.HemisphereLight(0xe8fbff, 0x07121c, 2.7));
const key = new THREE.DirectionalLight(0xffffff, 3.6);
key.position.set(-7, 8, 10);
scene.add(key);
const rim = new THREE.DirectionalLight(0x4fe8ff, 2.4);
rim.position.set(8, 0, -8);
scene.add(rim);
const southFill = new THREE.DirectionalLight(0x78dce9, 1.35);
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
controls.autoRotate = true;
controls.autoRotateSpeed = .22;

function globeFitDistance() {
  const verticalFov = THREE.MathUtils.degToRad(camera.fov);
  const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * camera.aspect);
  return (radius + .24) / Math.sin(Math.min(verticalFov, horizontalFov) / 2);
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
let editorPainting = false;
const selectedCellColours = new Map();

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
  pointer.set(event.clientX / innerWidth * 2 - 1, -(event.clientY / innerHeight) * 2 + 1);
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
  const cells = [];
  if (shape === 'painted') {
    if (!designCells.length) return cells;
    const centreColumn = designCells.reduce((sum, cell) => sum + cell.col, 0) / designCells.length;
    const centreRow = designCells.reduce((sum, cell) => sum + cell.row, 0) / designCells.length;
    return designCells.map((cell) => {
      const row = origin.row + Math.round(cell.row - centreRow);
      const col = origin.col + Math.round(cell.col - centreColumn);
      return { col, row, id: row * logicalColumns + col + 1, color: cell.color };
    }).filter((cell) => cell.col >= 0 && cell.col < logicalColumns && cell.row >= 0 && cell.row < logicalRows);
  }
  if (shape === 'row' || shape === 'column') {
    const start = -Math.floor((amount - 1) / 2);
    for (let index = 0; index < amount; index += 1) {
      cells.push({ col: origin.col + (shape === 'row' ? start + index : 0), row: origin.row + (shape === 'column' ? start + index : 0) });
    }
  } else {
    const reach = Math.ceil(Math.sqrt(amount)) + 2;
    const candidates = [];
    const imageAspect = shape === 'logo' && uploadedLogo
      ? (uploadedLogoCrop?.width || uploadedLogo.naturalWidth) / (uploadedLogoCrop?.height || uploadedLogo.naturalHeight)
      : 1.25;
    const targetGridRatio = Math.max(.25, Math.min(4, imageAspect * .8));
    const horizontalWeight = 1 / Math.sqrt(targetGridRatio);
    const verticalWeight = Math.sqrt(targetGridRatio);
    for (let rowOffset = -reach; rowOffset <= reach; rowOffset += 1) {
      for (let colOffset = -reach; colOffset <= reach; colOffset += 1) {
        candidates.push({ col: origin.col + colOffset, row: origin.row + rowOffset, distance: Math.hypot((colOffset + (rowOffset % 2 ? .5 : 0)) * horizontalWeight, rowOffset * .88 * verticalWeight) });
      }
    }
    candidates.sort((a, b) => a.distance - b.distance);
    cells.push(...candidates.slice(0, amount));
  }
  return cells.filter((cell) => cell.col >= 0 && cell.col < logicalColumns && cell.row >= 0 && cell.row < logicalRows)
    .map((cell) => ({ ...cell, id: cell.row * logicalColumns + cell.col + 1 }));
}

function refreshSelection() {
  const shape = document.querySelector('#selectionShape').value;
  const amount = shape === 'painted' ? designCells.length : Math.max(1, Math.min(10000, Number(document.querySelector('#hexAmount').value) || 1));
  if (selectedCell) {
    const candidateCells = connectedPattern(selectedCell, amount, shape);
    const blocked = candidateCells.find((cell) => occupiedCells[cell.id - 1]);
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
    : 'Switch to Place design, then click a teal available area.');
  const artworkReady = fixedArtworkMode === 'colour' || Boolean(uploadedLogo);
  document.querySelector('#previewPurchase').disabled = !count || !artworkReady;
  renderSelectionPreview();
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
    selectionError = 'That hexagon is already purchased. Choose one of the teal available hexagons.';
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
  clearSelectionColours();
  document.body.classList.add('creating');
  controls.enableRotate = true;
  const panel = document.querySelector('#buyPanel');
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
  document.querySelector('#buyPanel').classList.remove('open');
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

const amountInput = document.querySelector('#hexAmount');
function updateLogoGuidance(message) {
  const amount = Math.max(0, Number(amountInput.value) || 0);
  const guidance = document.querySelector('#logoGuidance');
  guidance.textContent = message || (document.querySelector('#logoTreatment').value === 'span' && amount < 200
    ? `This detailed logo only has ${amount} hexagons to display in. Try 200 or more for a much clearer result.`
    : 'Your logo will be rendered across the exact selected hexagon boundaries.');
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
  Object.entries(flowScreens).forEach(([name, screen]) => { screen.hidden = name !== step; screen.classList.toggle('active', name === step); });
  const progress = [...document.querySelectorAll('.flow-progress i')];
  const stepNumber = step === 'review' ? 3 : step === 'place' ? 2 : 1;
  progress.forEach((item, index) => item.classList.toggle('active', index < stepNumber));
  document.querySelector('#buyPanel').scrollTop = 0;
}

function placementCount() {
  return creationType === 'paint' ? designCells.length : Math.max(1, Math.min(10000, Number(amountInput.value) || 1));
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
  const amount = placementCount();
  const aspect = creationType === 'logo' && uploadedLogo
    ? (uploadedLogoCrop?.width || uploadedLogo.naturalWidth) / (uploadedLogoCrop?.height || uploadedLogo.naturalHeight)
    : 1.25;
  const reach = Math.ceil(Math.sqrt(amount)) + 5;
  const ratio = Math.max(.35, Math.min(3, aspect * .82));
  const candidates = [];
  for (let row = -reach; row <= reach; row += 1) {
    for (let col = -reach; col <= reach; col += 1) candidates.push({ col, row, distance: Math.hypot((col + (row % 2 ? .5 : 0)) / Math.sqrt(ratio), row * .88 * Math.sqrt(ratio)) });
  }
  return candidates.sort((a, b) => a.distance - b.distance).slice(0, amount);
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
  if (creationType !== 'paint') return;
  const rect = event.currentTarget.getBoundingClientRect();
  const x = (event.clientX - rect.left) * event.currentTarget.width / rect.width;
  const y = (event.clientY - rect.top) * event.currentTarget.height / rect.height;
  const hit = editorHitRegions.reduce((nearest, cell) => Math.hypot(cell.x - x, cell.y - y) < Math.hypot(nearest.x - x, nearest.y - y) ? cell : nearest, editorHitRegions[0]);
  if (!hit || Math.hypot(hit.x - x, hit.y - y) > hit.size) return;
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
  document.querySelector('#selectionStatus').textContent = mode === 'move' ? 'Drag the globe to find the right location.' : 'Click a teal available area to place your design.';
  document.querySelector('#hint').innerHTML = mode === 'move' ? '<span>DRAG TO ROTATE</span><i></i><span>SCROLL TO ZOOM</span>' : '<span>CLICK TO PLACE</span><i></i><span>SCROLL TO ZOOM</span>';
}

function enterPlacement() {
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
}

document.querySelector('#logoArtwork').addEventListener('click', () => configureCreation('logo'));
document.querySelector('#colourArtwork').addEventListener('click', () => configureCreation('colour'));
document.querySelector('#paintArtwork').addEventListener('click', () => configureCreation('paint'));
document.querySelector('#backToType').addEventListener('click', () => showFlowStep('type'));
document.querySelector('#toPlacement').addEventListener('click', enterPlacement);
document.querySelector('#backToDesign').addEventListener('click', () => { selecting = false; selectionModeUniform.value = 0; document.body.classList.remove('selecting', 'placing-design'); controls.enableRotate = true; showFlowStep('design'); });
document.querySelector('#moveGlobeMode').addEventListener('click', () => setInteractionMode('move'));
document.querySelector('#placeDesignMode').addEventListener('click', () => setInteractionMode('place'));
document.querySelector('#toReview').addEventListener('click', () => {
  showFlowStep('review');
  setInteractionMode('move');
  document.querySelector('#reviewKind').textContent = creationType === 'logo' ? 'Logo placement' : creationType === 'paint' ? 'Painted placement' : 'Colour placement';
  const reviewCanvas = document.querySelector('#reviewCanvas');
  reviewCanvas.getContext('2d').drawImage(document.querySelector('#designCanvas'), 0, 0);
  const warning = document.querySelector('#reviewWarning');
  warning.hidden = !(creationType === 'logo' && placementCount() < 100);
  warning.textContent = 'This detailed logo may be difficult to read at this size. Consider using at least 150 hexagons.';
  clearPlacementPreview();
  if (creationType === 'logo') addHighResolutionPlacement(document.querySelector('#brandColor').value, document.querySelector('#logoTreatment').value, previewPlacementLayers);
});
document.querySelector('#backToPlacement').addEventListener('click', () => { clearPlacementPreview(); showFlowStep('place'); setInteractionMode('place'); });
document.querySelectorAll('.size-presets button').forEach((button) => button.addEventListener('click', () => { amountInput.value = button.dataset.size; selectedCell = null; selectedCells = []; drawDesignPreview(); updateTotals(); }));
amountInput.addEventListener('input', () => { amountInput.value = Math.max(1, Math.min(10000, Number(amountInput.value) || 1)); selectedCell = null; selectedCells = []; drawDesignPreview(); updateTotals(); });
document.querySelectorAll('[data-treatment]').forEach((button) => button.addEventListener('click', () => { document.querySelector('#logoTreatment').value = button.dataset.treatment; document.querySelectorAll('[data-treatment]').forEach((item) => item.classList.toggle('active', item === button)); drawDesignPreview(); updateLogoGuidance(); }));
document.querySelector('#logoScale').addEventListener('input', drawDesignPreview);
document.querySelector('#logoOrientation').addEventListener('change', () => { updateLogoPreviewOrientation(); drawDesignPreview(); });
document.querySelector('#resetLogo').addEventListener('click', () => { document.querySelector('#logoScale').value = 100; document.querySelector('#logoOrientation').value = '0'; updateLogoPreviewOrientation(); drawDesignPreview(); });
document.querySelector('#clearPaint').addEventListener('click', () => { designCells = []; amountInput.value = 0; drawDesignPreview(); updateTotals(); });
const designCanvas = document.querySelector('#designCanvas');
designCanvas.addEventListener('pointerdown', (event) => { editorPainting = true; designCanvas.setPointerCapture(event.pointerId); paintEditorAt(event); });
designCanvas.addEventListener('pointermove', (event) => { if (editorPainting) paintEditorAt(event); });
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

document.querySelector('#logoUpload').addEventListener('change', (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  if (file.size > 4 * 1024 * 1024) {
    showUploadMessage('Logo must be smaller than 4 MB.');
    event.target.value = '';
    return;
  }
  const image = new Image();
  const url = URL.createObjectURL(file);
  image.onload = () => {
    uploadedLogo = image;
    uploadedLogoCrop = findLogoContentBounds(image);
    const preview = document.querySelector('#logoPreview');
    const previewImage = document.createElement('img');
    previewImage.src = url;
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
  image.onerror = () => showUploadMessage('That image could not be read. Try PNG, JPG, WebP or SVG.');
  image.src = url;
});

function showUploadMessage(message) {
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

function makeTerritoryTexture(color, aspect) {
  const territoryCanvas = document.createElement('canvas');
  if (aspect >= 1) {
    territoryCanvas.width = 1024;
    territoryCanvas.height = Math.max(256, Math.round(1024 / Math.min(aspect, 4)));
  } else {
    territoryCanvas.height = 1024;
    territoryCanvas.width = Math.max(256, Math.round(1024 * Math.max(aspect, .25)));
  }
  drawLogo(territoryCanvas.getContext('2d'), territoryCanvas.width, territoryCanvas.height, color, false);
  const texture = new THREE.CanvasTexture(territoryCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  texture.center.set(.5, .5);
  texture.rotation = THREE.MathUtils.degToRad(Number(document.querySelector('#logoOrientation').value) || 0);
  return texture;
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
  previewPlacementLayers.children.splice(0).forEach((child) => {
    child.geometry?.dispose();
    child.material?.map?.dispose();
    child.material?.dispose();
  });
}

function addHighResolutionPlacement(color, treatment, targetLayer = placementLayers) {
  if (!selectedCell || !selectedCells.length) return;
  const gridColumns = selectedCells.map((cell) => cell.col + (cell.row % 2) * .5);
  const rows = selectedCells.map((cell) => cell.row);
  const minColumn = Math.min(...gridColumns);
  const maxColumn = Math.max(...gridColumns);
  const minRow = Math.min(...rows);
  const maxRow = Math.max(...rows);
  const columnSpan = maxColumn - minColumn + 1;
  const rowSpan = maxRow - minRow + 1;
  const territoryAspect = columnSpan * .01965 / (rowSpan * .0157);
  const texture = treatment === 'repeat' || selectedCells.length === 1
    ? makeTerritoryTexture(color, 1.15)
    : makeTerritoryTexture(color, territoryAspect);
  const material = new THREE.MeshBasicMaterial({ map: texture, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 });
  const geometries = selectedCells.map((cell) => {
    const gridColumn = cell.col + (cell.row % 2) * .5;
    return exactHexGeometry(cell, (localX, localY) => {
      const localU = .5 + localX / 1.7320508;
      const localV = .5 + localY / 2;
      return treatment === 'span' && selectedCells.length > 1
        ? [(gridColumn - minColumn + localU) / columnSpan, (cell.row - minRow + localV) / rowSpan]
        : [localU, localV];
    });
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
  const amount = selectedCells.length;
  const color = document.querySelector('#brandColor').value;
  const treatment = document.querySelector('#logoTreatment').value;
  const custom = document.querySelector('#selectionShape').value === 'custom';
  if (fixedArtworkMode === 'colour') {
    selectedCells.forEach((cell) => writeCellColour(purchasedColourData, cell, cell.color || (custom ? selectedCellColours.get(cell.id) : null) || color));
    purchasedColourTexture.needsUpdate = true;
  } else {
    clearPlacementPreview();
    addHighResolutionPlacement(color, treatment);
  }
  selectedCells.forEach((cell) => { occupiedCells[cell.id - 1] = 255; });
  occupancyTexture.needsUpdate = true;
  sold = Math.min(1000000, sold + amount);
  updateInventoryDisplay();
  closeBuy();
  const toast = document.querySelector('#toast');
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2800);
}
document.querySelector('#previewPurchase').addEventListener('click', paintPlacement);

function resize() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  frameGlobe(false);
}
addEventListener('resize', resize);

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
  atmosphere.material.opacity = .075 + Math.sin(clock.getElapsedTime() * .7) * .012;
  renderer.render(scene, camera);
}
animate();
