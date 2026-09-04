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
camera.position.set(0, .25, 12.8);

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
  // Dense honeycomb detail. It remains sharp on approach without creating a million meshes.
  const radius = 3.25;
  const hexW = Math.sqrt(3) * radius;
  const rowH = radius * 1.5;
  ctx.strokeStyle = 'rgba(4,13,19,.42)';
  ctx.lineWidth = .72;
  for (let y = -radius; y < atlas.height + radius; y += rowH) {
    const row = Math.round(y / rowH);
    for (let x = -hexW; x < atlas.width + hexW; x += hexW) {
      const cx = x + (row & 1 ? hexW / 2 : 0);
      ctx.beginPath();
      for (let side = 0; side < 6; side += 1) {
        const angle = Math.PI / 3 * side - Math.PI / 6;
        const px = cx + Math.cos(angle) * radius;
        const py = y + Math.sin(angle) * radius;
        if (!side) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath(); ctx.stroke();
    }
  }
}
makeCampaignAtlas();
const globeTexture = new THREE.CanvasTexture(atlas);
globeTexture.colorSpace = THREE.SRGBColorSpace;
globeTexture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());

const globe = new THREE.Group();
scene.add(globe);
const radius = 4;
const sphere = new THREE.Mesh(
  new THREE.SphereGeometry(radius, 160, 96),
  new THREE.MeshStandardMaterial({ map: globeTexture, roughness: .57, metalness: .04 })
);
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

// Euler's topology requires twelve pentagons. Place them at the twelve icosahedral vertices.
const ico = new THREE.IcosahedronGeometry(1, 0);
const unique = [];
for (let i = 0; i < ico.attributes.position.count; i += 1) {
  const vertex = new THREE.Vector3().fromBufferAttribute(ico.attributes.position, i).normalize();
  if (!unique.some((item) => item.distanceTo(vertex) < .01)) unique.push(vertex);
}
unique.slice(0, 12).forEach((normal, index) => {
  const pentagon = new THREE.Mesh(
    new THREE.CircleGeometry(.072, 5),
    new THREE.MeshStandardMaterial({ color: index < 6 ? 0xffd65c : 0xd7ff55, emissive: 0x554c10, emissiveIntensity: .55, roughness: .4 })
  );
  pentagon.position.copy(normal.clone().multiplyScalar(radius + .025));
  pentagon.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
  pentagon.userData.pentagon = index + 1;
  globe.add(pentagon);
});

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
controls.minDistance = 5.1;
controls.maxDistance = 18;
controls.rotateSpeed = .42;
controls.zoomSpeed = .72;
controls.autoRotate = true;
controls.autoRotateSpeed = .22;

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

const amountInput = document.querySelector('#hexAmount');
amountInput.addEventListener('input', () => {
  const value = Math.max(100, Math.min(10000, Number(amountInput.value) || 100));
  document.querySelector('#price').textContent = `$${value.toLocaleString()}`;
});

function paintPlacement() {
  if (!selectedUV) return;
  const amount = Math.max(100, Math.min(10000, Number(amountInput.value) || 100));
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
}
addEventListener('resize', resize);

const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  atmosphere.material.opacity = .075 + Math.sin(clock.getElapsedTime() * .7) * .012;
  renderer.render(scene, camera);
}
animate();
