import { loadTopology, CELL_COUNT } from './globe/topology.js';
import { createCellDetail } from './globe/detail.js';
import { ArtworkTiles } from './globe/tiles.js';
import { publishToTiles } from './globe/tile-baker.js';
import { smoothZoom } from './globe/zoom.js';
import { createDemoTour } from './globe/demo-tour.js';
import { footprintBounds, centre } from './placements/geometry.js';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import './style.css';

const canvas = document.querySelector('#world');
document.querySelector('#claimButton').disabled = true;
const loading = document.createElement('div');
loading.textContent = 'Loading the canvas…';
loading.setAttribute('role', 'status');
loading.style.cssText = 'position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);color:#d4ff58;z-index:20;font:16px sans-serif';
document.body.append(loading);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x050b14, .018);
const camera = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, .1, 100);
let topology = null, topologyPromise = null, cellDetail = null;
const bootstrap = await fetch('/topology/bootstrap.json').then(r=>r.json());
const millionFixture = import.meta.env.DEV && new URLSearchParams(location.search).has('millionLogos');
async function ensureTopology() {
  if(topology)return topology;
  if(!topologyPromise)topologyPromise=loadTopology().then(value=>{
    topology=value;
    cellDetail=createCellDetail(topology,globe,radius,{occupancy:occupancyTexture,selection:selectionColourTexture},selectionModeUniform,hoverCellUniform);
    return topology;
  }).catch(error=>{topologyPromise=null;loading.textContent=error.message;throw error;});
  return topologyPromise;
}
const textureColumns = 1024, textureRows = 977;
const occupiedCells = new Uint8Array(textureColumns * textureRows);

const occupancyTexture = new THREE.DataTexture(occupiedCells, textureColumns, textureRows, THREE.RedFormat, THREE.UnsignedByteType);
occupancyTexture.minFilter = THREE.NearestFilter;
occupancyTexture.magFilter = THREE.NearestFilter;
occupancyTexture.generateMipmaps = false;
occupancyTexture.needsUpdate = true;
const selectionColourData = new Uint8Array(textureColumns * textureRows * 4);
function makeCellColourTexture(data) {
  const texture = new THREE.DataTexture(data, textureColumns, textureRows, THREE.RGBAFormat, THREE.UnsignedByteType);
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}
const selectionColourTexture = makeCellColourTexture(selectionColourData);
const globe = new THREE.Group();
scene.add(globe);
const radius = 4;
const selectionModeUniform = { value: 0 };
const hoverCellUniform = { value: -2 };
const globeMaterial = new THREE.MeshStandardMaterial({ color: '#071c2b', emissive:'#102735',emissiveIntensity:.85, roughness: .7, metalness: .04 });
const sphere = new THREE.Mesh(new THREE.SphereGeometry(radius - .0005, 192, 128), globeMaterial);
globe.add(sphere);
const artworkTiles = new ArtworkTiles(globe,radius,{base:millionFixture?'/artwork/million':'/artwork/sample-hq',maxTiles:innerWidth<700?64:128,anisotropy:Math.min(8,renderer.capabilities.getMaxAnisotropy())});
await artworkTiles.ready;
let designAnchor = bootstrap.anchor;
async function fetchGzipBytes(path){
  const response=await fetch(path);
  return new Uint8Array(await (response.headers.get('content-encoding')==='gzip'?response:new Response(response.body.pipeThrough(new DecompressionStream('gzip')))).arrayBuffer());
}
const [occupancyBytes,sampleOwners]=await Promise.all([fetchGzipBytes('/topology/occupancy-v1.gz'),fetchGzipBytes('/topology/sample-owners-v1.gz')]);
occupiedCells.set(occupancyBytes);
if(millionFixture)occupiedCells.fill(255,0,CELL_COUNT);
occupancyTexture.needsUpdate=true;

scene.add(new THREE.HemisphereLight(0xe8fbff, 0x07121c, 2.7));
const key = new THREE.DirectionalLight(0xffffff, 3.6);
key.position.set(-7, 8, 10);
scene.add(key);

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
controls.zoomSpeed = .28;
const zoom = smoothZoom(canvas,camera,controls,radius,()=>{cameraDistanceTarget=null;});
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
let colourCells = null;
let footprintEdited = false;
let draftArtwork = null;
let editorPainting = false;
const selectedCellColours = new Map();
const sessionPlacements = new Map();
let explorationStart = null;
canvas.addEventListener('pointerdown', event => { explorationStart = {x:event.clientX,y:event.clientY}; });
canvas.addEventListener('pointerup', event => {
  if (document.body.classList.contains('creating') || !explorationStart || Math.hypot(event.clientX-explorationStart.x,event.clientY-explorationStart.y)>6) return;
  if (camera.position.length() < globeFitDistance() * .82) controls.autoRotate = false;
  const hit=intersect(event); if(!hit?.uv) return;
  const placement=sessionPlacements.get(hit.cell.id); if(!placement) return;
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
  hoverCellUniform.value = -2;
}

function updateInventoryDisplay() {
  document.querySelector('#soldCount').textContent = sold.toLocaleString();
  document.querySelector('#availableCount').textContent = (1000000 - sold).toLocaleString();
  document.querySelector('#soldMeter').style.width = `${sold / 10000}%`;
}
updateInventoryDisplay();


function cellForId(id) {
  const occupied = occupiedCells[id - 1] === 255, placement=sessionPlacements.get(id),campaign=bootstrap.sampleCampaigns?.[sampleOwners[id-1]-1];
  return { id, occupied, pentagon: topology.degrees[id-1]===5, owner: placement?'Your placement':campaign?.name||(occupied?'Sample placement':'Available'), destination:placement?.website||campaign?.url||'' };
}
function intersect(event) {
  if(!topology){if(camera.position.length()<radius+2)void ensureTopology();return null;}
  const rect = canvas.getBoundingClientRect();
  pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  const point = raycaster.ray.intersectSphere(new THREE.Sphere(new THREE.Vector3(), radius), new THREE.Vector3());
  if (!point) return null;
  return { point, uv: new THREE.Vector2(), cell: cellForId(topology.pick(globe.worldToLocal(point.clone()).normalize().toArray())) };
}

function updateTooltip(event, cell) {
  document.querySelector('#cellId').textContent = `${cell.pentagon ? 'PENTAGON' : 'HEX'} #${String(cell.id).padStart(6, '0')}`;
  document.querySelector('#cellOwner').textContent = cell.owner;
  const destination=document.querySelector('#cellDestination');
  destination.hidden=!cell.destination;
  destination.textContent=cell.destination?new URL(cell.destination).hostname.replace(/^www\./,''):'';
  tooltip.style.left = `${Math.min(innerWidth - 205, event.clientX + 16)}px`;
  tooltip.style.top = `${Math.min(innerHeight - 90, event.clientY + 16)}px`;
  tooltip.classList.add('show');
}

function connectedPattern(origin, amount, shape) {
  const draft = previewCells();
  if (origin.id === designAnchor) return draft;
  return relocateDesign(draft, origin.id);
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
      if (designAnchor !== selectedCell.id) { undoStack.length=0; redoStack.length=0; updateHistory(); }
      designAnchor = selectedCell.id;
      if (creationType === 'logo') logoCells = candidateCells;
      else if (creationType === 'paint') designCells = candidateCells;
      else colourCells = candidateCells;
      draftArtwork = renderArtwork(selectedCells);
      updateTotals();
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
  hoverCellUniform.value = cell.id - 1;
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
  const cell = hit.cell;
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
  const cell = hit.cell;
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

async function openBuy() {
  if(publishing)return;
  if(!topology){loading.textContent='Preparing exact cell selection…';document.body.append(loading);try{await ensureTopology();}catch{return;}loading.remove();}
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
  if(publishing)return;
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
document.querySelector('#rotationToggle').addEventListener('click', () => { controls.autoRotate = !controls.autoRotate; updateRotationControl(); });
document.querySelector('#zoomIn').addEventListener('click', () => {
  zoom.change(.8);
});
document.querySelector('#zoomOut').addEventListener('click', () => {
  zoom.change(1.25);
});
document.querySelector('#homeView').addEventListener('click', () => {
  zoom.cancel();cameraDistanceTarget=null;
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
hexSearch.addEventListener('submit', async (event) => {
  event.preventDefault();
  const match = hexSearchInput.value.trim().match(/^#?([0-9]{1,7})$/);
  const id = match ? Number(match[1]) : 0;
  if (id < 1 || id > CELL_COUNT) {
    hexSearchStatus.textContent = 'Use a hex number from 1 to 1,000,000.';
    hexSearchInput.setAttribute('aria-invalid', 'true');
    return;
  }
  await ensureTopology();
  const cell = cellForId(id);
  controls.autoRotate = false;
  cameraDistanceTarget = null;
  orientToCell(id, radius + .82);
  hoverCellUniform.value = cell.id - 1;
  hexSearchInput.removeAttribute('aria-invalid');
  hexSearchStatus.textContent = `Centred on ${cell.pentagon ? 'pentagon' : 'hex'} #${id.toLocaleString()}.`;
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
  const pentagons = creationType ? previewCells().filter(cell => cell.pentagon).length : 0;
  const countText = `${count.toLocaleString()} cell${count === 1 ? '' : 's'}${pentagons ? ` · ${pentagons} pentagon${pentagons === 1 ? '' : 's'}` : ''}`;
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
  if(!topology)return [];
  if (creationType === 'paint') return topology.cells(designCells, designAnchor);
  if (creationType === 'logo' && logoCells) return topology.cells(logoCells, designAnchor);
  if (creationType === 'colour' && colourCells) return topology.cells(colourCells, designAnchor);
  const aspect = creationType === 'logo' && uploadedLogo ? (uploadedLogoCrop?.width || uploadedLogo.naturalWidth)/(uploadedLogoCrop?.height || uploadedLogo.naturalHeight) : 1.25;
  return topology.connected(designAnchor, placementCount(), aspect);
}
function relocateDesign(draft, anchor) {
  if (creationType !== 'paint' && !footprintEdited) {
    const aspect = creationType === 'logo' && uploadedLogo ? (uploadedLogoCrop?.width || uploadedLogo.naturalWidth)/(uploadedLogoCrop?.height || uploadedLogo.naturalHeight) : 1.25;
    return topology.connected(anchor, draft.length, aspect);
  }
  // Map in radial source order onto a connected frontier. Each source colour
  // is assigned once; candidate coordinates are cached. This avoids a cubic
  // all-pairs search when a buyer edits a large custom footprint.
  const frame = topology.frame(anchor), chosen = [], used = new Set();
  const frontier = new Map([[anchor, {x:0,y:0}]]);
  const ordered = [...draft].sort((a,b)=>(a.x*a.x+a.y*a.y)-(b.x*b.x+b.y*b.y)||a.id-b.id);
  for (const source of ordered) {
    let bestId, best = Infinity;
    for (const [id,p] of frontier) {
      const distance=(p.x-source.x)**2+(p.y-source.y)**2;
      if(distance<best) {best=distance;bestId=id;}
    }
    chosen.push({id:bestId,color:source.color});frontier.delete(bestId);used.add(bestId);
    for(const id of topology.neighboursOf(bestId))if(!used.has(id)&&!frontier.has(id))frontier.set(id,topology.project(topology.centre(id),frame));
  }
  return topology.cells(chosen, anchor);
}
function adjacentLogoCandidates(cells) {
  const active = new Set(cells.map(c=>c.id)), ids = new Set();
  for(const cell of cells) for(const id of topology.neighboursOf(cell.id)) if(!active.has(id)) ids.add(id);
  return topology.cells([...ids],designAnchor).map(c=>({...c,guide:true}));
}
function isConnectedFootprint(cells) { return topology.isConnected(cells); }
function polygonPath(context, cell, bounds, scaleX, scaleY = scaleX, append = false, offsetX = 0, offsetY = 0) {
  if(!append) context.beginPath();
  cell.polygon.forEach((p,k)=> { const x=offsetX+(p.x-bounds.left)*scaleX,y=offsetY+(p.y-bounds.top)*scaleY; if(k===0) context.moveTo(x,y); else context.lineTo(x,y); });
  context.closePath();
}
function pointInPolygon(x,y,polygon) {
  let inside=false;
  for(let i=0,j=polygon.length-1;i<polygon.length;j=i++) {
    const a=polygon[i],b=polygon[j];
    if((a.y>y)!==(b.y>y) && x<(b.x-a.x)*(y-a.y)/(b.y-a.y)+a.x) inside=!inside;
  }
  return inside;
}
function drawDesignPreview(target = document.querySelector('#designCanvas')) {
  if(!target) return;
  const review=target.id==='reviewCanvas', cells=review?selectedCells:previewCells();
  if(!review) draftArtwork=null;
  const context=target.getContext('2d'); context.clearRect(0,0,target.width,target.height);
  const guides=review?[]:creationType==='paint'?topology.connected(designAnchor,135,1.5).filter(c=>!cells.some(a=>a.id===c.id)):creationType==='logo'?adjacentLogoCandidates(cells):[];
  const display=[...cells,...guides]; if(!display.length) return;
  const bounds=footprintBounds(display), scale=Math.min((target.width-44)/bounds.width,(target.height-36)/bounds.height);
  const ox=(target.width-bounds.width*scale)/2,oy=(target.height-bounds.height*scale)/2;
  if(cells.length) {
    const art=review&&draftArtwork?draftArtwork:renderArtwork(cells), box=footprintBounds(cells);
    context.drawImage(art,ox+(box.left-bounds.left)*scale,oy+(box.top-bounds.top)*scale,box.width*scale,box.height*scale);
  }
  for(const cell of guides) { polygonPath(context,cell,bounds,scale,scale,false,ox,oy); context.fillStyle='#102a35';context.fill();context.strokeStyle='rgba(212,255,88,.38)';context.stroke(); }
  for(const cell of cells) { polygonPath(context,cell,bounds,scale,scale,false,ox,oy);context.strokeStyle='rgba(220,255,245,.3)';context.stroke(); }
  if(!review) editorHitRegions=display.map(cell=>({cell,polygon:cell.polygon.map(p=>({x:ox+(p.x-bounds.left)*scale,y:oy+(p.y-bounds.top)*scale}))}));
  document.querySelector('#editorEmpty').hidden=Boolean(cells.length);
}
function paintEditorAt(event) {
  if(!['paint','logo'].includes(creationType))return;
  const rect=event.currentTarget.getBoundingClientRect(), x=(event.clientX-rect.left)*event.currentTarget.width/rect.width,y=(event.clientY-rect.top)*event.currentTarget.height/rect.height;
  const hit=editorHitRegions.find(r=>pointInPolygon(x,y,r.polygon))?.cell; if(!hit)return;
  const cells=previewCells(),index=cells.findIndex(c=>c.id===hit.id);
  if(creationType==='logo') {
    const next=index<0?[...cells,hit]:cells.filter(c=>c.id!==hit.id);
    if(!topology.isConnected(next)) {updateLogoGuidance('Keep at least one connected cell.');return;}
    logoCells=next;footprintEdited=true;amountInput.value=next.length;
  } else {
    let next=cells.map(c=>({...c}));
    if(paintAction==='erase')next=next.filter(c=>c.id!==hit.id);
    else if(index>=0)next[index].color=document.querySelector('#brandColor').value;
    else {
      // Fill the shortest adjacency path when painting beyond the current edge.
      const pending=[hit.id],parent=new Map([[hit.id,null]]),active=new Set(next.map(c=>c.id));
      let end=hit.id;
      if(next.length) {
        for(let i=0;i<pending.length;i++) { end=pending[i];if(active.has(end))break;for(const id of topology.neighboursOf(end))if(!parent.has(id)){parent.set(id,end);pending.push(id);} }
      }
      while(end!==null) {if(!active.has(end))next.push({id:end,color:document.querySelector('#brandColor').value});end=parent.get(end);}
    }
    if(next.length&&!topology.isConnected(next))return;
    designCells=next;amountInput.value=next.length;
  }
  selectedCell=null;selectedCells=[];drawDesignPreview();updateTotals();
}

function configureCreation(type) {
  logoCells = null; colourCells = null; footprintEdited = false;
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
  if(!selectedCells.length)return;
  const middle=new THREE.Vector3(...topology.centre(selectedCell.id));
  const halfVertical=THREE.MathUtils.degToRad(camera.fov)/2, halfHorizontal=Math.atan(Math.tan(halfVertical)*camera.aspect),limitingFov=Math.min(halfVertical,halfHorizontal);
  let distance=radius+.35;
  for(const cell of selectedCells)for(const p of topology.polygon(cell.id)) {
    const point=new THREE.Vector3(...p).multiplyScalar(radius+.001),depth=point.dot(middle);
    const perpendicular=point.clone().addScaledVector(middle,-depth).length();
    distance=Math.max(distance,depth+perpendicular/Math.tan(limitingFov)*1.15);
  }
  orientToCell(selectedCell.id, distance);
}
function orientToCell(id, distance) {
  zoom.cancel();
  const frame=topology.frame(id);
  const basis=new THREE.Matrix4().makeBasis(new THREE.Vector3(...frame.east),new THREE.Vector3(...frame.north),new THREE.Vector3(...frame.normal));
  globe.quaternion.setFromRotationMatrix(basis).invert();globe.updateMatrixWorld(true);
  cameraDistanceTarget=null;camera.position.set(0,0,distance);controls.target.set(0,0,0);controls.update();
}
let suggestionIndex = 0;
function suggestLocation() {
  const draft=previewCells();
  for(let attempt=0;attempt<120;attempt++) {
    const id=attempt===0&&suggestionIndex===0?designAnchor:1+(++suggestionIndex*7919)%CELL_COUNT;
    if(occupiedCells[id-1])continue;
    const cells=id===designAnchor?draft:relocateDesign(draft,id);
    if(cells.some(c=>occupiedCells[c.id-1]))continue;
    selectedCell=cellForId(id);selectedUV=new THREE.Vector2(0,0);selectedNormal=pointForCell(selectedCell,0,0).normalize();
    globe.rotation.set(0,0,0);globe.updateMatrixWorld(true);cameraDistanceTarget=null;
    refreshSelection();focusSelection();
    document.querySelector('#selectionStatus').textContent='Your whole design fits here. Ready when you are.';suggestionIndex++;return;
  }
  selectedCells=[];selectedCell=null;selectedUV=null;refreshSelection();
  document.querySelector('#selectionStatus').textContent='No suggested space found for this size. Try a smaller design or choose a location manually.';
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
document.querySelector('#backToDesign').addEventListener('click', () => { clearPlacementPreview(); selecting = false; selectionModeUniform.value = 0; document.body.classList.remove('selecting', 'placing-design'); controls.enableRotate = true; showFlowStep('design'); drawDesignPreview(); updateTotals(); });
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
document.querySelectorAll('.size-presets button').forEach((button) => button.addEventListener('click', () => { amountInput.value = button.dataset.size; logoCells = null; colourCells = null; footprintEdited = false; selectedCell = null; selectedCells = []; drawDesignPreview(); updateTotals(); }));
amountInput.addEventListener('change', () => { amountInput.value = placementCount(); });
amountInput.addEventListener('input', () => { logoCells = null; colourCells = null; footprintEdited = false; selectedCell = null; selectedCells = []; drawDesignPreview(); updateTotals(); });
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
    const factor = file.type === 'image/svg+xml' ? 3072 / Math.max(image.naturalWidth,image.naturalHeight) : Math.min(1, 4096 / Math.max(image.naturalWidth, image.naturalHeight));
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

function largestLogoRect(cells,bounds,aspect,width,height) {
  const mx=bounds.left+bounds.width/2,my=bounds.top+bounds.height/2;
  // Rasterize the true union once; a summed-area table verifies every covered
  // pixel in each candidate rectangle, including holes and concave edges.
  const mask=document.createElement('canvas');mask.width=512;mask.height=512;
  const context=mask.getContext('2d');context.fillStyle='#fff';
  cells.forEach(c=>{polygonPath(context,c,bounds,512/bounds.width,512/bounds.height);context.fill();});
  const data=context.getImageData(0,0,512,512).data, integral=new Uint32Array(513*513);
  for(let y=0;y<512;y++){let row=0;for(let x=0;x<512;x++){row+=data[(y*512+x)*4+3]>20?0:1;integral[(y+1)*513+x+1]=integral[y*513+x+1]+row;}}
  let low=0,high=Math.min(bounds.height,bounds.width/aspect);
  for(let i=0;i<16;i++) {
    const h=(low+high)/2,w=h*aspect,x0=Math.max(0,Math.floor((mx-w/2-bounds.left)/bounds.width*512)),x1=Math.min(512,Math.ceil((mx+w/2-bounds.left)/bounds.width*512)),y0=Math.max(0,Math.floor((my-h/2-bounds.top)/bounds.height*512)),y1=Math.min(512,Math.ceil((my+h/2-bounds.top)/bounds.height*512));
    const missing=integral[y1*513+x1]-integral[y0*513+x1]-integral[y1*513+x0]+integral[y0*513+x0];
    if(missing===0)low=h;else high=h;
  }
  const h=Math.max(.01,low*.94),w=h*aspect;
  return {x:(mx-w/2-bounds.left)/bounds.width*width,y:(my-h/2-bounds.top)/bounds.height*height,width:w/bounds.width*width,height:h/bounds.height*height};
}
function renderArtwork(cells) {
  const bounds = footprintBounds(cells);
  const art = document.createElement('canvas');
  const unit = Math.min(128, 3072 / Math.max(bounds.width, bounds.height));
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
    polygonPath(context, cell, bounds, px, py);
    context.fillStyle = cell.color || document.querySelector('#brandColor').value; context.fill();
  });
  if (creationType === 'logo' && uploadedLogo) {
    context.save(); context.beginPath();
    cells.forEach((cell) => { polygonPath(context,cell,bounds,px,py,true); });
    context.clip();
    if (document.querySelector('#logoTreatment').value === 'repeat') {
      cells.forEach((cell) => { const p = point(cell); context.save(); polygonPath(context,cell,bounds,px,py); context.clip(); drawRotated(p.x-unit*.525,p.y-unit*.525,unit*1.05,unit*1.05); context.restore(); });
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

function pointForCell(cell) { return new THREE.Vector3(...topology.centre(cell.id)).multiplyScalar(radius+.0006); }
function exactCellGeometry(cell, textureCoordinates) {
  const polygon=topology.polygon(cell.id),positions=[],uvs=[],frame=topology.frame(selectedCell?.id||designAnchor);
  const add=p=>{positions.push(...Array.from(p,v=>v*(radius+.0006)));const local=topology.project(p,frame);uvs.push(...textureCoordinates(local.x,local.y));};
  for(let k=0;k<polygon.length;k++){add(topology.centre(cell.id));add(polygon[k]);add(polygon[(k+1)%polygon.length]);}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));return geometry;
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
    return exactCellGeometry(cell, (localX, localY) => [
      (localX - bounds.left) / bounds.width,
      1 - (localY - bounds.top) / bounds.height
    ]);
  });
  const mergedGeometry = mergeGeometries(geometries, false);
  geometries.forEach((geometry) => geometry.dispose());
  const territory = new THREE.Mesh(mergedGeometry, material);
  territory.renderOrder = 6;
  targetLayer.add(territory);
  return territory;
}

let publishing=false;
async function paintPlacement() {
  if(publishing)return;
  if (!selectedUV || !selectedCells.length) return;
  const rawWebsite = document.querySelector('#website').value.trim();
  let website = '';
  try { if(rawWebsite) { const parsed = new URL(rawWebsite); if(!['https:', 'http:'].includes(parsed.protocol)) throw new Error(); website=parsed.href; } } catch { const error=document.querySelector('#websiteError'); error.hidden=false; error.textContent='Enter a full website address starting with https://'; document.querySelector('#website').focus(); return; }
  document.querySelector('#websiteError').hidden=true;
  const link=document.querySelector('#placementWebsite'); link.hidden=!website; link.href=website;
  const amount = selectedCells.length;
  const color = document.querySelector('#brandColor').value;
  const treatment = document.querySelector('#logoTreatment').value;
  publishing=true;
  document.querySelector('#buyPanel').inert=true;
  const button=document.querySelector('#previewPurchase'),label=button.textContent;
  button.disabled=true;button.textContent='Publishing preview…';
  const cells=selectedCells.map(c=>({...c})),temporary=new THREE.Group();
  const mesh=addHighResolutionPlacement(color,treatment,temporary);
  try {
    await publishToTiles(artworkTiles,renderer,mesh,topology,cells);
  } catch(error) {
    document.querySelector('#websiteError').hidden=false;document.querySelector('#websiteError').textContent='Could not publish the preview. Your design is still here; please try again.';
    return;
  } finally {
    mesh.geometry.dispose();mesh.material.map.dispose();mesh.material.dispose();
    publishing=false;document.querySelector('#buyPanel').inert=false;button.disabled=false;button.textContent=label;
  }
  clearPlacementPreview();
  const placementRecord={website,count:amount};
  cells.forEach((cell) => { occupiedCells[cell.id - 1] = 255; sessionPlacements.set(cell.id,placementRecord); });
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

async function createTourStops(){
  const grid=await ensureTopology(),reservoir=[],limit=96;
  let seen=0;
  for(let offset=0;offset<CELL_COUNT;offset++){
    if(offset&&offset%100000===0)await new Promise(resolve=>setTimeout(resolve,0));
    if(!occupiedCells[offset])continue;
    seen++;
    if(reservoir.length<limit)reservoir.push(offset+1);
    else {const replace=Math.floor(Math.random()*seen);if(replace<limit)reservoir[replace]=offset+1;}
  }
  if(!reservoir.length)return [
    {name:'Globe overview',normal:[0,0,1],angle:.4,overview:true,offset:0},
    {name:'Globe overview',normal:[1,0,0],angle:.4,overview:true,offset:0},
    {name:'Globe overview',normal:[0,0,-1],angle:.4,overview:true,offset:0},
  ];
  const selected=[reservoir.splice(Math.floor(Math.random()*reservoir.length),1)[0]];
  while(selected.length<Math.min(8,seen)&&reservoir.length){
    let best=0,bestScore=Infinity;
    for(let i=0;i<reservoir.length;i++){
      const point=grid.centre(reservoir[i]);
      const score=Math.max(...selected.map(id=>{const other=grid.centre(id);return point[0]*other[0]+point[1]*other[1]+point[2]*other[2];}));
      if(score<bestScore){best=i;bestScore=score;}
    }
    selected.push(reservoir.splice(best,1)[0]);
  }
  const firstDetail=Math.floor(Math.random()*selected.length),detailSlots=new Set([firstDetail]);
  if(selected.length>1)detailSlots.add((firstDetail+1+Math.floor(Math.random()*(selected.length-1)))%selected.length);
  return selected.map((id,index)=>{
    const cell=cellForId(id);
    return {id,name:cell.owner,normal:Array.from(grid.centre(id)),angle:.012,detail:detailSlots.has(index)||Math.random()<.35,offset:(Math.random()-.5)*.07};
  });
}
const demoTour=createDemoTour({camera,globe,controls,radius,button:document.querySelector('#demoTour'),wideDistance:globeFitDistance,cancelZoom(){zoom.cancel();cameraDistanceTarget=null;},loadStops:createTourStops,prepareDetail(){void ensureTopology().catch(()=>{});}});
const rotationToggle=document.querySelector('#rotationToggle');
let displayedRotationState=null;
function updateRotationControl(){
  const rotating=controls.autoRotate&&!demoTour.active;
  if(rotating===displayedRotationState)return;
  displayedRotationState=rotating;
  rotationToggle.textContent=rotating?'⏸':'▶';
  rotationToggle.setAttribute('aria-pressed',String(rotating));
  rotationToggle.setAttribute('aria-label',rotating?'Pause globe rotation':'Start globe rotation');
  rotationToggle.title=rotating?'Pause globe rotation':'Start globe rotation';
}
function animate() {
  requestAnimationFrame(animate);
  controls.target.set(0, 0, 0);
  if(!demoTour.active)controls.update();
  if (cameraDistanceTarget !== null) {
    const distance = THREE.MathUtils.lerp(camera.position.length(), cameraDistanceTarget, .12);
    camera.position.setLength(distance);
    if (Math.abs(distance - cameraDistanceTarget) < .005) cameraDistanceTarget = null;
  }
  document.body.classList.toggle('detail-view', camera.position.length() < globeFitDistance() * .72);
  zoom.update();
  demoTour.update(performance.now());
  updateRotationControl();
  artworkTiles.update(camera,canvas.clientHeight*renderer.getPixelRatio(),performance.now());
  if(!topology&&!topologyPromise&&camera.position.length()<radius+3.5)void ensureTopology().catch(()=>{});
  if(topology)cellDetail.update(camera,canvas.clientHeight,performance.now());
  renderer.render(scene, camera);
}
animate();
loading.remove();
document.querySelector('#claimButton').disabled = false;
canvas.dataset.ready = 'true';

if (import.meta.env.DEV && new URLSearchParams(location.search).has('geodesicQA')) {
  await ensureTopology();
  window.geodesicQA = {
    locations: { equator: topology.pick([0,0,1]), north: topology.pick([0,1,0]), south: topology.pick([0,-1,0]), pentagon: topology.manifest.pentagons[0], nearPentagon: topology.neighboursOf(topology.manifest.pentagons[0])[0] },
    focus(id, distance = .6) {
      controls.autoRotate=false;orientToCell(id,radius+distance);
    },
    place(id) { choosePatternOrigin({uv:new THREE.Vector2(),point:pointForCell({id})},cellForId(id));focusSelection(); },
    state() { return { selected: selectedCells.map(c=>c.id), design: previewCells().map(c=>c.id), sold, committed: [...sessionPlacements.keys()], connected: topology.isConnected(selectedCells), camera:camera.position.toArray(), detailVertices:cellDetail?.mesh.geometry.attributes.position?.count||0, drawCalls:renderer.info.render.calls,tiles:{...artworkTiles.stats},retainedPlacements:placementLayers.children.length }; },
    screen(id) { const p=pointForCell({id}).applyMatrix4(globe.matrixWorld).project(camera),r=canvas.getBoundingClientRect();return {x:r.x+(p.x+1)*r.width/2,y:r.y+(1-p.y)*r.height/2}; },
  };
}
if(import.meta.env.DEV)window.performanceQA={tiles:artworkTiles.stats,focus(direction,altitude){zoom.cancel();controls.autoRotate=false;cameraDistanceTarget=null;globe.rotation.set(0,0,0);camera.position.set(...direction).normalize().multiplyScalar(radius+altitude);controls.update();},state(){return{tiles:{...artworkTiles.stats},topologyLoaded:!!topology,drawCalls:renderer.info.render.calls,textures:renderer.info.memory.textures,geometries:renderer.info.memory.geometries,camera:camera.position.toArray(),retainedPlacements:placementLayers.children.length};}};
