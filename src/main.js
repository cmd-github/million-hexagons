import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
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
const owners = ['Northstar', 'Arc & Pixel', 'Field & Main', 'Nova Labs', 'Good Company', 'Orbital', 'Studio 27'];
const logicalColumns = 1250;
const logicalRows = 800;
const placementLayers = new THREE.Group();
const selectionPreview = new THREE.Group();
globe.add(placementLayers);
globe.add(selectionPreview);
let selecting = false;
let selectedUV = null;
let selectedCell = null;
let selectedNormal = null;
let selectedCells = [];
let uploadedLogo = null;
let sold = 500000;

function hashCell(id) {
  const value = Math.sin(id * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

function cellFromUV(uv) {
  const row = THREE.MathUtils.clamp(Math.floor((1 - uv.y) * logicalRows), 0, logicalRows - 1);
  const col = THREE.MathUtils.clamp(Math.floor(uv.x * logicalColumns - (row % 2) * .5), 0, logicalColumns - 1);
  const id = row * logicalColumns + col + 1;
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
function connectedPattern(origin, amount, shape) {
  const cells = [];
  if (shape === 'row' || shape === 'column') {
    const start = -Math.floor((amount - 1) / 2);
    for (let index = 0; index < amount; index += 1) {
      cells.push({ col: origin.col + (shape === 'row' ? start + index : 0), row: origin.row + (shape === 'column' ? start + index : 0) });
    }
  } else {
    const reach = Math.ceil(Math.sqrt(amount)) + 2;
    const candidates = [];
    const imageAspect = shape === 'logo' && uploadedLogo ? uploadedLogo.naturalWidth / uploadedLogo.naturalHeight : 1.25;
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
  const amount = Math.max(1, Math.min(10000, Number(document.querySelector('#hexAmount').value) || 1));
  if (selectedCell && shape !== 'custom') selectedCells = connectedPattern(selectedCell, amount, shape);
  const count = selectedCells.length;
  document.querySelector('#selectionStatus').innerHTML = count
    ? `<b>✓</b> ${count.toLocaleString()} connected hexagon${count === 1 ? '' : 's'} selected.`
    : '<b>1</b> Click an available place on the globe.';
  document.querySelector('#previewPurchase').disabled = !count;
  renderSelectionPreview();
}

function renderSelectionPreview() {
  while (selectionPreview.children.length) selectionPreview.remove(selectionPreview.children[0]);
  if (!selectedNormal || !selectedCells.length) return;
  const previewGeometry = new THREE.CircleGeometry(.01048, 6);
  previewGeometry.rotateZ(Math.PI / 6);
  previewGeometry.scale(1.106, 1, 1);
  const previewMaterial = new THREE.MeshBasicMaterial({ color: document.querySelector('#brandColor').value, transparent: true, opacity: .58, depthWrite: false, wireframe: true });
  selectedCells.slice(0, 300).forEach((cell) => {
    const normal = normalForCell(cell);
    const tile = new THREE.Mesh(previewGeometry, previewMaterial);
    tile.position.copy(normal.clone().multiplyScalar(radius + .032));
    tile.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
    tile.renderOrder = 8;
    selectionPreview.add(tile);
  });
}

canvas.addEventListener('click', (event) => {
  const hit = intersect(event);
  if (!hit?.uv) return;
  if (!selecting) return updateTooltip(event, cellFromUV(hit.uv));
  const clickedCell = cellFromUV(hit.uv);
  const shape = document.querySelector('#selectionShape').value;
  if (!selectedCell || shape !== 'custom') {
    selectedUV = hit.uv.clone();
    selectedCell = clickedCell;
    selectedNormal = globe.worldToLocal(hit.point.clone()).normalize();
  }
  if (shape === 'custom') {
    const existing = selectedCells.findIndex((cell) => cell.id === clickedCell.id);
    if (existing >= 0) selectedCells.splice(existing, 1);
    else selectedCells.push(clickedCell);
    amountInput.value = selectedCells.length || 1;
    document.querySelector('#price').textContent = `$${selectedCells.length.toLocaleString()}`;
  }
  refreshSelection();
  controls.autoRotate = false;
});

function openBuy() {
  selecting = true;
  selectedUV = null;
  selectedCell = null;
  selectedNormal = null;
  selectedCells = [];
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
  while (selectionPreview.children.length) selectionPreview.remove(selectionPreview.children[0]);
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
  refreshSelection();
});
document.querySelector('#selectionShape').addEventListener('change', (event) => {
  selectedCells = [];
  const custom = event.target.value === 'custom';
  document.querySelector('#patternNote').textContent = custom
    ? 'Click individual hexagons to build any pattern. Click a selected hexagon again to remove it.'
    : `Your selected quantity will form a connected ${event.target.options[event.target.selectedIndex].text.toLowerCase()}.`;
  refreshSelection();
});

document.querySelector('#logoText').addEventListener('input', (event) => {
  if (!uploadedLogo) document.querySelector('#logoPreview').innerHTML = `<span>${event.target.value.trim().toUpperCase() || 'YOUR LOGO'}</span>`;
});
document.querySelector('#brandColor').addEventListener('input', renderSelectionPreview);
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
    const preview = document.querySelector('#logoPreview');
    preview.innerHTML = '';
    preview.style.backgroundImage = `url(${url})`;
    showUploadMessage('Logo ready. It will be fitted without cropping.');
    refreshSelection();
  };
  image.onerror = () => showUploadMessage('That image could not be read. Try PNG, JPG, WebP or SVG.');
  image.src = url;
});

function showUploadMessage(message) {
  document.querySelector('#patternNote').textContent = message;
}

function drawLogo(context, width, height, color, transparent = false) {
  context.clearRect(0, 0, width, height);
  if (!transparent) {
    context.fillStyle = color;
    context.fillRect(0, 0, width, height);
  }
  if (uploadedLogo) {
    const fit = document.querySelector('#logoFit').value;
    const padding = fit === 'contain' ? Math.min(width, height) * .08 : 0;
    const availableWidth = width - padding * 2;
    const availableHeight = height - padding * 2;
    const scale = fit === 'cover'
      ? Math.max(availableWidth / uploadedLogo.naturalWidth, availableHeight / uploadedLogo.naturalHeight)
      : Math.min(availableWidth / uploadedLogo.naturalWidth, availableHeight / uploadedLogo.naturalHeight);
    const drawWidth = uploadedLogo.naturalWidth * scale;
    const drawHeight = uploadedLogo.naturalHeight * scale;
    context.drawImage(uploadedLogo, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
  } else {
    const logo = document.querySelector('#logoText').value.trim().toUpperCase() || 'YOUR LOGO';
    context.fillStyle = transparent ? color : '#061119';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.font = `900 ${Math.floor(Math.min(height * .42, width / Math.max(2.2, logo.length * .58)))}px Arial`;
    context.fillText(logo.slice(0, 16), width / 2, height / 2, width * .82);
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
  return texture;
}

function normalForCell(cell) {
  const east = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), selectedNormal);
  if (east.lengthSq() < .001) east.set(1, 0, 0); else east.normalize();
  const north = new THREE.Vector3().crossVectors(selectedNormal, east).normalize();
  const colOffset = cell.col - selectedCell.col + ((cell.row % 2) - (selectedCell.row % 2)) * .5;
  const rowOffset = cell.row - selectedCell.row;
  return selectedNormal.clone()
    .add(east.multiplyScalar(colOffset * .00502))
    .add(north.multiplyScalar(-rowOffset * .00393))
    .normalize();
}

function addHighResolutionPlacement(color, treatment) {
  if (!selectedNormal || !selectedCell || !selectedCells.length) return;
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
    const geometry = new THREE.CircleGeometry(.01048, 6);
    geometry.rotateZ(Math.PI / 6);
    geometry.scale(1.106, 1, 1);
    if (treatment === 'span' && selectedCells.length > 1) {
      const uvs = geometry.attributes.uv;
      const gridColumn = cell.col + (cell.row % 2) * .5;
      for (let index = 0; index < uvs.count; index += 1) {
        const localU = uvs.getX(index);
        const localV = uvs.getY(index);
        uvs.setXY(index, (gridColumn - minColumn + localU) / columnSpan, 1 - (cell.row - minRow + 1 - localV) / rowSpan);
      }
      uvs.needsUpdate = true;
    }
    const normal = normalForCell(cell);
    const matrix = new THREE.Matrix4().compose(
      normal.clone().multiplyScalar(radius + .022),
      new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal),
      new THREE.Vector3(1, 1, 1)
    );
    geometry.applyMatrix4(matrix);
    return geometry;
  });
  const mergedGeometry = mergeGeometries(geometries, false);
  geometries.forEach((geometry) => geometry.dispose());
  const territory = new THREE.Mesh(mergedGeometry, material);
  territory.renderOrder = 6;
  placementLayers.add(territory);
}

function paintPlacement() {
  if (!selectedUV || !selectedCells.length) return;
  const amount = selectedCells.length;
  const color = document.querySelector('#brandColor').value;
  const treatment = document.querySelector('#logoTreatment').value;
  addHighResolutionPlacement(color, treatment);
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
