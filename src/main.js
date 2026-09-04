import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
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

const atlas = document.createElement('canvas');
atlas.width = 2048;
atlas.height = 1024;
const ctx = atlas.getContext('2d');
const campaigns = [
  ['NORTHSTAR', '#3cd6d0'], ['ARC & PIXEL', '#ff665f'], ['FIELD/MAIN', '#f5c95c'], ['NOVA', '#815bff'],
  ['GOOD CO.', '#d7ff55'], ['ORBITAL', '#ef7bbb'], ['MONO', '#f0eee3'], ['KINETIC', '#ff8a42'],
  ['STUDIO 27', '#45a9ee'], ['FUTURE', '#35c47c'], ['HELLO', '#e7acff'], ['MADE HERE', '#ef564f'],
];

function makeCampaignAtlas() {
  ctx.fillStyle = '#102631';
  ctx.fillRect(0, 0, atlas.width, atlas.height);
  const cols = 48;
  const rows = 24;
  const cellW = atlas.width / cols;
  const cellH = atlas.height / rows;
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const hash = Math.abs(Math.sin(col * 91.17 + row * 47.71) * 43758.5453) % 1;
      if (hash > .5) continue;
      const campaign = campaigns[(col * 7 + row * 11) % campaigns.length];
      ctx.fillStyle = campaign[1];
      ctx.globalAlpha = .72 + hash * .28;
      ctx.fillRect(col * cellW + 1, row * cellH + 1, cellW - 2, cellH - 2);
      if ((col + row) % 13 === 0) {
        ctx.fillStyle = '#07131b';
        ctx.globalAlpha = .9;
        ctx.font = `800 ${Math.floor(cellH * .25)}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText(campaign[0].slice(0, 8), (col + .5) * cellW, (row + .57) * cellH);
      }
    }
  }
  ctx.globalAlpha = 1;
}
makeCampaignAtlas();
const globeTexture = new THREE.CanvasTexture(atlas);
globeTexture.colorSpace = THREE.SRGBColorSpace;
globeTexture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());

const globe = new THREE.Group();
scene.add(globe);
const radius = 4;
const globeMaterial = new THREE.MeshStandardMaterial({ map: globeTexture, roughness: .57, metalness: .04 });
globeMaterial.onBeforeCompile = (shader) => {
  shader.fragmentShader = shader.fragmentShader.replace(
    '#include <map_fragment>',
    `#include <map_fragment>
    #ifdef USE_MAP
      // One thousand staggered columns by one thousand rows: one million logical cells.
      vec2 gridPoint = vMapUv * vec2(1732.0508, 1500.0);
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
      vec2 absoluteHex = abs(localHex);
      float hexDistance = max(absoluteHex.x / 0.8660254, absoluteHex.y + absoluteHex.x * 0.5773503);
      float cellPixels = 1.0 / max(fwidth(gridPoint.x) / 1.7320508, fwidth(gridPoint.y) / 1.5);
      float detailVisibility = smoothstep(1.6, 4.5, cellPixels);
      float edgeWidth = max(fwidth(hexDistance) * 1.15, 0.002);
      float hexEdge = 1.0 - smoothstep(0.0, edgeWidth, 1.0 - hexDistance);
      diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * 0.16, hexEdge * detailVisibility * 0.78);

      // At close range each occupied hex resolves to a small brand glyph.
      // The same campaign colour resolves to the same symbol on every owned cell.
      float brandHash = fract(sin(dot(floor(diffuseColor.rg * 31.0), vec2(12.9898, 78.233))) * 43758.5453);
      vec2 glyphPoint = localHex / vec2(0.8660254, 1.0);
      float glyphCircle = 1.0 - smoothstep(0.045, 0.09, abs(length(glyphPoint) - 0.31));
      float glyphDiamond = 1.0 - smoothstep(0.28, 0.34, abs(glyphPoint.x) + abs(glyphPoint.y));
      float glyphPlus = max(
        (1.0 - smoothstep(0.07, 0.11, abs(glyphPoint.x))) * (1.0 - smoothstep(0.31, 0.36, abs(glyphPoint.y))),
        (1.0 - smoothstep(0.07, 0.11, abs(glyphPoint.y))) * (1.0 - smoothstep(0.31, 0.36, abs(glyphPoint.x)))
      );
      float glyph = brandHash < 0.33 ? glyphCircle : (brandHash < 0.66 ? glyphDiamond : glyphPlus);
      float colourEnergy = max(diffuseColor.r, max(diffuseColor.g, diffuseColor.b));
      float occupiedCell = smoothstep(0.09, 0.2, colourEnergy);
      float glyphVisibility = smoothstep(7.0, 13.0, cellPixels) * occupiedCell;
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.025, 0.05, 0.065), glyph * glyphVisibility * 0.7);
    #endif`
  );
};
globeMaterial.customProgramCacheKey = () => 'million-hexagons-hd-v2';
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
controls.minDistance = radius + 1.25;
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
const owners = ['Northstar', 'Arc & Pixel', 'Field & Main', 'Nova Labs', 'Good Company', 'Orbital', 'Studio 27'];
let selecting = false;
let selectedUV = null;
let sold = 500000;

function hashCell(id) {
  const value = Math.sin(id * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

function cellFromUV(uv) {
  const col = Math.min(999, Math.floor(uv.x * 1000));
  const row = Math.min(999, Math.floor((1 - uv.y) * 1000));
  const id = row * 1000 + col + 1;
  const longitude = uv.x * 360 - 180;
  const latitude = uv.y * 180 - 90;
  const occupied = hashCell(id) < .5;
  return { id, col, row, longitude, latitude, occupied, owner: occupied ? owners[Math.floor(hashCell(id + 77) * owners.length)] : 'Available' };
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

canvas.addEventListener('pointermove', (event) => {
  if (selecting) return;
  const hit = intersect(event);
  if (!hit?.uv) return tooltip.classList.remove('show');
  updateTooltip(event, cellFromUV(hit.uv));
});
canvas.addEventListener('pointerleave', () => tooltip.classList.remove('show'));
canvas.addEventListener('click', (event) => {
  const hit = intersect(event);
  if (!hit?.uv) return;
  if (!selecting) return updateTooltip(event, cellFromUV(hit.uv));
  selectedUV = hit.uv.clone();
  document.querySelector('#selectionStatus').innerHTML = '<b>✓</b> Location selected. Customise your placement.';
  document.querySelector('#previewPurchase').disabled = false;
  controls.autoRotate = false;
});

function openBuy() {
  selecting = true;
  selectedUV = null;
  document.body.classList.add('selecting');
  document.querySelector('#buyPanel').classList.add('open');
  document.querySelector('#buyPanel').setAttribute('aria-hidden', 'false');
  document.querySelector('#selectionStatus').innerHTML = '<b>1</b> Click an available place on the globe.';
  document.querySelector('#previewPurchase').disabled = true;
  document.querySelector('#hint').innerHTML = '<span>CLICK THE GLOBE TO CHOOSE A LOCATION</span>';
}
function closeBuy() {
  selecting = false;
  document.body.classList.remove('selecting');
  document.querySelector('#buyPanel').classList.remove('open');
  document.querySelector('#buyPanel').setAttribute('aria-hidden', 'true');
  document.querySelector('#hint').innerHTML = '<span>DRAG TO ROTATE</span><i></i><span>SCROLL TO ZOOM</span><i></i><span>CLICK A TILE</span>';
}
document.querySelector('#claimButton').addEventListener('click', openBuy);
document.querySelector('#closeBuy').addEventListener('click', closeBuy);
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
amountInput.addEventListener('input', () => {
  const value = Math.max(1, Math.min(10000, Number(amountInput.value) || 1));
  document.querySelector('#price').textContent = `$${value.toLocaleString()}`;
});

function paintPlacement() {
  if (!selectedUV) return;
  const amount = Math.max(1, Math.min(10000, Number(amountInput.value) || 1));
  const x = selectedUV.x * atlas.width;
  const y = (1 - selectedUV.y) * atlas.height;
  const aspect = 2.35;
  const areaScale = Math.sqrt(amount / 1000);
  const width = 115 * areaScale;
  const height = width / aspect;
  const color = document.querySelector('#brandColor').value;
  const logo = document.querySelector('#logoText').value.trim().toUpperCase() || 'YOUR LOGO';
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = color;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(-width / 2, -height / 2, width, height, 10);
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#061119';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `900 ${Math.max(12, height * .34)}px Arial`;
  ctx.fillText(logo.slice(0, 16), 0, 1, width * .88);
  ctx.restore();
  globeTexture.needsUpdate = true;
  sold = Math.min(1000000, sold + amount);
  document.querySelector('#soldCount').textContent = sold.toLocaleString();
  document.querySelector('#availableCount').textContent = (1000000 - sold).toLocaleString();
  document.querySelector('#soldMeter').style.width = `${sold / 10000}%`;
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
  document.body.classList.toggle('detail-view', camera.position.length() < globeFitDistance() * .72);
  atmosphere.material.opacity = .075 + Math.sin(clock.getElapsedTime() * .7) * .012;
  renderer.render(scene, camera);
}
animate();
