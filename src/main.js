import { loadTopology, CELL_COUNT } from './globe/topology.js';
import { createCellDetail } from './globe/detail.js';
import { ArtworkTiles } from './globe/tiles.js';
import { publishToTiles } from './globe/tile-baker.js';
import { smoothZoom } from './globe/zoom.js';
import { createDemoTour } from './globe/demo-tour.js';
import { footprintBounds, centre } from './placements/geometry.js';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import './style.css';
import './studio.css';

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
let logoEditorMode = 'move', logoDrag = null;
const logoPosition = { x: 0, y: 0 };
let lastPaintedCell = null;
let editorArtworkSize = { width: 1, height: 1 };
const editorView = { zoom: 1, x: 0, y: 0 };
let editorPan = null, previewCache = null;
const layoutCache = new WeakMap(), artworkCache = new WeakMap();
let redrawPending = false;
function queueDesignPreview() { if(redrawPending)return;redrawPending=true;requestAnimationFrame(()=>{redrawPending=false;drawDesignPreview();}); }
function resetEditorView() { editorView.zoom=1;editorView.x=0;editorView.y=0; }

let sold = occupiedCells.reduce((total, value) => total + (value ? 1 : 0), 0);
let cameraDistanceTarget = null;
let painting = false;
let paintAction = 'paint';
let lastPaintedCellId = null;
let selectionError = '';
let creationType = null;
let buyInteractionMode = 'move';
let logoCells = null;
let footprintEdited = false;
let draftArtwork = null;
let editorPainting = false;
const selectedCellColours = new Map();
const sessionPlacements = new Map();
let explorationStart = null;
let requestedAnchor = null;
let pinnedCell = null;
canvas.addEventListener('pointerdown', event => { explorationStart = {x:event.clientX,y:event.clientY}; });
canvas.addEventListener('pointerup', event => {
  if (document.body.classList.contains('creating') || !explorationStart || Math.hypot(event.clientX-explorationStart.x,event.clientY-explorationStart.y)>6) return;
  if (camera.position.length() < globeFitDistance() * .82) controls.autoRotate = false;
  const hit=intersect(event); if(!hit?.uv) return;
  const placement=sessionPlacements.get(hit.cell.id);
  if (!hit.cell.occupied) {
    pinnedCell = hit.cell;
    updateTooltip(event, hit.cell, true);
    return;
  }
  pinnedCell = null;
  tooltip.classList.remove('pinned');
  if(!placement) return;
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

function updateTooltip(event, cell, pinned = false) {
  document.querySelector('#cellOwner').textContent = cell.owner;
  const destination=document.querySelector('#cellDestination');
  destination.hidden=!cell.destination;
  destination.textContent=cell.destination?new URL(cell.destination).hostname.replace(/^www\./,''):'';
  const claim=document.querySelector('#claimCell');
  claim.hidden=cell.occupied;
  claim.dataset.anchor=cell.occupied?'':String(cell.id);
  tooltip.style.left = `${Math.min(innerWidth - 205, event.clientX + 16)}px`;
  tooltip.style.top = `${Math.min(innerHeight - (cell.occupied ? 90 : 130), event.clientY + 16)}px`;
  tooltip.classList.toggle('pinned', pinned);
  tooltip.classList.add('show');
}

function connectedPattern(origin, amount, shape) {
  const draft = previewCells();
  if (origin.id === designAnchor) return draft;
  return relocateDesign(draft, origin.id);
}

function refreshSelection(preparedCells = null) {
  const shape = document.querySelector('#selectionShape').value;
  const amount = Math.max(1, Math.min(100000, Number(document.querySelector('#hexAmount').value) || 1));
  if (selectedCell) {
    const candidateCells = Array.isArray(preparedCells)?preparedCells:connectedPattern(selectedCell, amount, shape);
    const blocked = candidateCells.find((cell) => occupiedCells[cell.id - 1]);
    if (blocked) {
      selectedCells = [];
      selectionError = 'That area overlaps purchased hexagons. Try another location, shape or quantity.';
    } else {
      selectedCells = candidateCells;
      // Placement geometry is a projection of the draft, never the editable source.
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
  const artworkReady = true;
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
  if (pinnedCell && !selecting) return;
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
canvas.addEventListener('pointerleave', () => { if (!painting) clearHover(); if(!pinnedCell)tooltip.classList.remove('show'); });

async function openBuy(anchor = null) {
  if(publishing)return;
  document.querySelector('#toast').classList.remove('show');
  if(!topology){loading.textContent='Preparing exact cell selection…';document.body.append(loading);try{await ensureTopology();}catch{return;}loading.remove();}
  selecting = false;
  selectionModeUniform.value = 0;
  controls.autoRotate = false;
  selectedUV = null;
  selectedCell = null;
  selectedNormal = null;
  selectedCells = [];
  requestedAnchor = Number.isInteger(anchor) ? anchor : null;
  suggestionIndex = 0;

  pinnedCell = null;
  tooltip.classList.remove('show', 'pinned');
  clearPlacementPreview();
  clearSelectionColours();
  document.body.classList.add('creating');
  controls.enableRotate = true;
  const panel = document.querySelector('#buyPanel');
  panel.inert = false;
  panel.classList.add('open');
  panel.setAttribute('aria-hidden', 'false');
  panel.scrollTop = 0;
  configureCreation();
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
  requestedAnchor = null;
  pinnedCell = null;
  document.querySelector('#hint').innerHTML = '<span>DRAG TO ROTATE</span><i></i><span>SCROLL TO ZOOM</span><i></i><span>CLICK A TILE</span>';
}
document.querySelector('#claimButton').addEventListener('click', () => openBuy());
document.querySelector('#claimCell').addEventListener('click', (event) => {
  event.stopPropagation();
  const anchor=Number(event.currentTarget.dataset.anchor);
  if(anchor)openBuy(anchor);
});
document.querySelector('#closeBuy').addEventListener('click', closeBuy);
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

function updatePaintColour() {
  document.querySelector('#paintColourChip').style.background = document.querySelector('#brushColor').value;
  renderSelectionPreview();
  drawDesignPreview();
}
document.querySelector('#brandColor').addEventListener('input', updatePaintColour);

function updateLogoPreviewOrientation() {
  const degrees = Number(document.querySelector('#logoOrientation').value) || 0;
  document.querySelector('#logoPreview').style.setProperty('--logo-rotation', `${degrees}deg`);
}
document.querySelector('#logoOrientation').addEventListener('change', updateLogoPreviewOrientation);

const flowScreens = { design: document.querySelector('#designStep'), place: document.querySelector('#placeStep'), review: document.querySelector('#reviewStep') };
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
  return Math.max(1, Math.min(100000, Math.floor(Number(amountInput.value)) || 1));
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
  document.querySelector('#toPlacement').disabled = !count;
  document.querySelectorAll('.size-presets button').forEach((button) => button.classList.toggle('active', Number(button.dataset.size) === count));
  updateLogoGuidance();
}

let editorHitRegions = [];
function previewCells() {
  if(!topology)return [];
  if(logoCells)return logoCells;
  const aspect = uploadedLogo ? Math.max(.2,Math.min(5,(uploadedLogoCrop?.width || uploadedLogo.naturalWidth)/(uploadedLogoCrop?.height || uploadedLogo.naturalHeight))) : 1.25;
  const key=`${designAnchor}:${placementCount()}:${aspect}`;
  if(previewCache?.key===key)return previewCache.cells;
  const cells=topology.connected(designAnchor,placementCount(),aspect);
  previewCache={key,cells};return cells;
}
function layoutFor(cells) {
  if(layoutCache.has(cells))return layoutCache.get(cells);
  const bounds=footprintBounds(cells),path=new Path2D(),active=new Set(cells.map(c=>c.id)),edges=new Map();
  // Internal edges cancel. Trace only the exact union boundary, including holes.
  // This keeps canvas rasterisation proportional to the outline, not 600k edges.
  for(const cell of cells){const offset=(cell.id-1)*6,degree=topology.degrees[cell.id-1];for(let k=0;k<degree;k++) {
    if(active.has(topology.neighbours[offset+k]+1))continue;
    const from=topology.rings[offset+k],to=topology.rings[offset+(k+1)%degree];
    edges.set(from,{to,p:cell.polygon[k],q:cell.polygon[(k+1)%degree]});
  }}
  while(edges.size){const first=edges.keys().next().value;let current=first,edge=edges.get(first);path.moveTo(edge.p.x,edge.p.y);
    do{edge=edges.get(current);if(!edge)break;path.lineTo(edge.q.x,edge.q.y);edges.delete(current);current=edge.to;}while(current!==first);path.closePath();
  }
  const layout={bounds,path,fits:new Map(),guides:null};layoutCache.set(cells,layout);return layout;
}
function relocateDesign(draft, anchor) {
  if (!footprintEdited) {
    const aspect = uploadedLogo ? Math.max(.2,Math.min(5,(uploadedLogoCrop?.width || uploadedLogo.naturalWidth)/(uploadedLogoCrop?.height || uploadedLogo.naturalHeight))) : 1.25;
    return topology.connected(anchor, draft.length, aspect);
  }
  // Map in radial source order onto a connected frontier. Each source colour
  // is assigned once; candidate coordinates are cached. This avoids a cubic
  // all-pairs search when a buyer edits a large custom footprint.
  const frame = topology.frame(anchor), chosen = [], used = new Set();
  const frontier = new Map(), buckets=new Map(), bucketSize=8;
  const bucketKey=p=>`${Math.floor(p.x/bucketSize)},${Math.floor(p.y/bucketSize)}`;
  const add=(id,p)=>{frontier.set(id,p);const key=bucketKey(p);if(!buckets.has(key))buckets.set(key,new Set());buckets.get(key).add(id);};
  add(anchor,{x:0,y:0});
  const ordered = [...draft].sort((a,b)=>(a.x*a.x+a.y*a.y)-(b.x*b.x+b.y*b.y)||a.id-b.id);
  for (const source of ordered) {
    let bestId,best=Infinity;
    const bx=Math.floor(source.x/bucketSize),by=Math.floor(source.y/bucketSize);
    for(let ring=0;bestId===undefined||ring<10000;ring++) {
      for(let dx=-ring;dx<=ring;dx++)for(let dy=-ring;dy<=ring;dy++) {
        if(ring&&Math.abs(dx)!==ring&&Math.abs(dy)!==ring)continue;
        const bucket=buckets.get(`${bx+dx},${by+dy}`);if(!bucket)continue;
        for(const id of bucket){const p=frontier.get(id),distance=(p.x-source.x)**2+(p.y-source.y)**2;if(distance<best){best=distance;bestId=id;}}
      }
      const edge=Math.min(source.x-(bx-ring)*bucketSize,(bx+ring+1)*bucketSize-source.x,source.y-(by-ring)*bucketSize,(by+ring+1)*bucketSize-source.y);
      if(bestId!==undefined && best<=edge*edge)break;
    }
    const key=bucketKey(frontier.get(bestId));buckets.get(key).delete(bestId);if(!buckets.get(key).size)buckets.delete(key);
    chosen.push({...source,id:bestId});frontier.delete(bestId);used.add(bestId);
    for(const id of topology.neighboursOf(bestId))if(!used.has(id)&&!frontier.has(id))add(id,topology.project(topology.centre(id),frame));
  }
  return topology.cells(chosen, anchor);
}
function adjacentLogoCandidates(cells) {
  const active = new Set(cells.map(c=>c.id)), ids = new Set();
  for(const cell of cells) for(const id of topology.neighboursOf(cell.id)) if(!active.has(id)) ids.add(id);
  return topology.cells([...ids],designAnchor).map(c=>({...c,guide:true}));
}
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
  if(!target || !topology)return;
  const review=target.id==='reviewCanvas',cells=review?selectedCells:previewCells();
  if(!cells.length)return;
  if(!review) {
    draftArtwork=null;
    const rect=target.getBoundingClientRect();
    if(rect.width && rect.height) {const dpr=Math.min(devicePixelRatio,2,1600/rect.width,1200/rect.height);const w=Math.round(rect.width*dpr),h=Math.round(rect.height*dpr);if(target.width!==w)target.width=w;if(target.height!==h)target.height=h;}
  }
  const context=target.getContext('2d');context.clearRect(0,0,target.width,target.height);
  const layout=layoutFor(cells), box=layout.bounds;
  const guides=review||logoEditorMode!=='hex'?[]:(layout.guides??=adjacentLogoCandidates(cells));
  const bounds=guides.length?footprintBounds([...cells,...guides]):box;
  const baseScale=Math.min((target.width-44)/bounds.width,(target.height-36)/bounds.height);
  const scale=baseScale*(review?1:editorView.zoom);
  const ox=(target.width-bounds.width*scale)/2+(review?0:editorView.x),oy=(target.height-bounds.height*scale)/2+(review?0:editorView.y);
  const art=review&&draftArtwork?draftArtwork:renderArtwork(cells);
  context.drawImage(art,ox+(box.left-bounds.left)*scale,oy+(box.top-bounds.top)*scale,box.width*scale,box.height*scale);
  if(!review)editorArtworkSize={width:box.width*scale,height:box.height*scale};
  const visible=cell=>{const x=ox+(cell.x-bounds.left)*scale,y=oy+(cell.y-bounds.top)*scale;return x>-scale*4&&x<target.width+scale*4&&y>-scale*4&&y<target.height+scale*4;};
  const displayed=[];
  if(scale>=4) {
    for(const cell of guides)if(visible(cell)){polygonPath(context,cell,bounds,scale,scale,false,ox,oy);context.fillStyle='#17303b';context.fill();context.strokeStyle='#d4ff5870';context.stroke();displayed.push(cell);}
    context.strokeStyle='rgba(220,255,245,.25)';context.lineWidth=Math.max(1,target.width/1200);
    context.beginPath();
    for(const cell of cells)if(visible(cell)){polygonPath(context,cell,bounds,scale,scale,true,ox,oy);displayed.push(cell);}
    context.stroke();
  }
  if(!review) {
    editorHitRegions=displayed.map(cell=>({cell,polygon:cell.polygon.map(p=>({x:ox+(p.x-bounds.left)*scale,y:oy+(p.y-bounds.top)*scale}))}));
    document.querySelector('#editorZoomValue').textContent=`${Math.round(editorView.zoom*100)}%`;
    document.querySelector('#editorEmpty').hidden=Boolean(cells.length);
  }
}
function paintEditorAt(event) {
  const rect=event.currentTarget.getBoundingClientRect(), x=(event.clientX-rect.left)*event.currentTarget.width/rect.width,y=(event.clientY-rect.top)*event.currentTarget.height/rect.height;
  const hit=editorHitRegions.find(r=>pointInPolygon(x,y,r.polygon))?.cell;
  if(!hit || lastPaintedCell === hit.id)return;
  lastPaintedCell = hit.id;
  const cells=previewCells(),index=cells.findIndex(c=>c.id===hit.id);
  let next = cells.map(c=>({...c}));
  if(logoEditorMode === 'hex') {
    next=index<0?[...next,{id:hit.id}]:next.filter(c=>c.id!==hit.id);
    if(next.length>100000){document.querySelector('#toolHint').textContent='Maximum 100,000 cells.';return;}
    if(!topology.isConnected(next)) {updateLogoGuidance('Keep at least one connected cell.');return;}
  } else {
    if(index<0)return;
    if(logoEditorMode === 'paint') { next[index].color=document.querySelector('#brushColor').value; next[index].transparent=false; }
    else if(logoEditorMode === 'transparent') { next[index].transparent=true; delete next[index].color; }
    else if(logoEditorMode === 'restore') { delete next[index].color; delete next[index].transparent; }
    else return;
  }
  if(logoEditorMode==='hex')next=topology.cells(next,designAnchor);
  else if(layoutCache.has(cells))layoutCache.set(next,layoutCache.get(cells));
  logoCells=next; footprintEdited=true; amountInput.value=next.length;
  selectedCell=null;selectedCells=[];drawDesignPreview();updateTotals();
}

function configureCreation() {
  creationType = 'logo';
  document.querySelector('#selectionShape').value = 'logo';
  document.querySelector('#designTitle').textContent = 'Make it yours.';
  document.querySelector('#designIntro').textContent = 'Your space. Your design.';
  for(const id of ['logoControls','colourControls','customPaintTools','logoFootprintHelp','sizeControls']) document.querySelector(`#${id}`).hidden=false;
  updateImageControls();
  showFlowStep('design');
  drawDesignPreview();updateTotals();
}
function updateImageControls() {
  document.querySelector('#removeImage').hidden=!uploadedLogo;
  document.querySelector('#moveImageMode').disabled=!uploadedLogo;
  document.querySelector('#addImageLabel').textContent=uploadedLogo?'Change image':'Add image';
  if(!uploadedLogo && logoEditorMode==='move')logoEditorMode='pan';
  setEditorMode(logoEditorMode,false);
}
function setEditorMode(mode, zoomToCells=true) {
  logoEditorMode=mode;logoDrag=null;editorPan=null;lastPaintedCell=null;
  const brushing=['paint','transparent','restore'].includes(mode);
  for(const [id,value] of [['moveImageMode','move'],['editHexMode','hex'],['paintCells','paint'],['panEditor','pan'],['colourBrush','paint'],['eraseCells','transparent'],['restoreCells','restore']]) {
    const button=document.querySelector(`#${id}`),active=id==='paintCells'?brushing:value===mode;
    button.setAttribute('aria-pressed',String(active));button.classList.toggle('active',active);
  }
  document.querySelector('#brushControls').hidden=!brushing;
  document.querySelector('#logoPositionControls').hidden=mode!=='move'||!uploadedLogo;
  const hint=mode==='move'?'Drag the image to frame it.':mode==='hex'?'Click an edge cell to remove it, or a neighbouring space to add one.':mode==='transparent'?'Click or drag to clear cells. They remain part of your area.':mode==='restore'?'Click or drag to restore the image and background.':mode==='paint'?'Click or drag to paint cells.':'Drag to pan. Scroll or pinch to zoom.';
  document.querySelector('#toolHint').textContent=hint;
  document.querySelector('#logoFootprintHelp').textContent=hint;
  document.querySelector('#designCanvas').style.cursor=['move','pan'].includes(mode)?'grab':'crosshair';
  if(zoomToCells && topology && (brushing||mode==='hex') && placementCount()>2000) {
    const bounds=layoutFor(previewCells()).bounds,canvas=document.querySelector('#designCanvas');
    editorView.zoom=Math.max(editorView.zoom,Math.min(100,Math.max(bounds.width/canvas.clientWidth,bounds.height/canvas.clientHeight)*18));
  }
  queueDesignPreview();
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
let suggestionIndex = 0, suggestionVersion = 0;
async function suggestLocation() {
  const version=++suggestionVersion,button=document.querySelector('#suggestLocation');
  button.disabled=true;button.textContent='Finding a space?';document.querySelector('#toReview').disabled=true;
  document.querySelector('#selectionStatus').textContent='Finding room for your whole design?';
  try {
    const draft=previewCells(),bounds=layoutFor(draft).bounds,aspect=Math.max(.2,Math.min(5,bounds.width/bounds.height));
    for(let attempt=0;attempt<120;attempt++) {
      if(attempt%8===0){await new Promise(resolve=>setTimeout(resolve,0));if(!selecting||version!==suggestionVersion)return;}
      const id=attempt===0&&suggestionIndex===0&&requestedAnchor?requestedAnchor:attempt===0&&suggestionIndex===0?designAnchor:1+(++suggestionIndex*7919)%CELL_COUNT;
      if(occupiedCells[id-1])continue;
      // Abort blocked candidates while growing them, before projecting 100k polygons.
      if(draft.length>2000&&!topology.connected(id,draft.length,aspect,occupiedCells).length)continue;
      const cells=id===designAnchor?draft:relocateDesign(draft,id);
      if(cells.some(c=>occupiedCells[c.id-1]))continue;
      selectedCell=cellForId(id);selectedUV=new THREE.Vector2(0,0);selectedNormal=pointForCell(selectedCell,0,0).normalize();
      globe.rotation.set(0,0,0);globe.updateMatrixWorld(true);cameraDistanceTarget=null;
      refreshSelection(cells);focusSelection();
      document.querySelector('#selectionStatus').textContent='Your whole design fits here. Ready when you are.';suggestionIndex++;return;
    }
    selectedCells=[];selectedCell=null;selectedUV=null;refreshSelection();
    document.querySelector('#selectionStatus').textContent='No single available area found for this size. Try another size or place it manually.';
  } finally {if(version===suggestionVersion){button.disabled=false;button.textContent='Find another spot';}}
}
document.querySelector('#suggestLocation').addEventListener('click', suggestLocation);
document.querySelector('#reviewEditDesign').addEventListener('click', () => document.querySelector('#backToDesign').click());
document.querySelector('#dismissToast').addEventListener('click', () => document.querySelector('#toast').classList.remove('show'));
document.addEventListener('keydown', (event) => { if(event.key === 'Escape' && !document.querySelector('#buyPanel').inert) closeBuy(); });
const undoStack = [], redoStack = [];
function rememberPaint() { undoStack.push({cells:previewCells().map(({id,color,transparent})=>({id,color,transparent})),edited:footprintEdited}); while(undoStack.length>1&&(undoStack.length>50||undoStack.reduce((n,s)=>n+s.cells.length,0)>250000))undoStack.shift();redoStack.length=0;updateHistory(); }
function updateHistory() { document.querySelector('#undoPaint').disabled=!undoStack.length;document.querySelector('#redoPaint').disabled=!redoStack.length; }
function restorePaint(from,to) {
  if(!from.length)return;
  to.push({cells:previewCells().map(({id,color,transparent})=>({id,color,transparent})),edited:footprintEdited});
  const state=from.pop();logoCells=topology.cells(state.cells,designAnchor);footprintEdited=state.edited;amountInput.value=logoCells.length;
  selectedCell=null;selectedCells=[];drawDesignPreview();updateTotals();updateHistory();
}
document.querySelector('#undoPaint').addEventListener('click',()=>restorePaint(undoStack,redoStack));
document.querySelector('#redoPaint').addEventListener('click',()=>restorePaint(redoStack,undoStack));

document.querySelector('#toPlacement').addEventListener('click', enterPlacement);
document.querySelector('#backToDesign').addEventListener('click', () => { clearPlacementPreview(); selecting = false; selectionModeUniform.value = 0; document.body.classList.remove('selecting', 'placing-design'); controls.enableRotate = true; showFlowStep('design'); drawDesignPreview(); updateTotals(); });
document.querySelector('#moveGlobeMode').addEventListener('click', () => setInteractionMode('move'));
document.querySelector('#placeDesignMode').addEventListener('click', () => setInteractionMode('place'));
document.querySelector('#toReview').addEventListener('click', () => {
  if (!selectedCells.length) return;
  showFlowStep('review');
  setInteractionMode('move');
  focusSelection();
  document.querySelector('#reviewKind').textContent = uploadedLogo ? 'Image & colour placement' : 'Colour placement';
  const reviewCanvas = document.querySelector('#reviewCanvas');
  drawDesignPreview(reviewCanvas);
  const warning = document.querySelector('#reviewWarning');
  warning.hidden = !uploadedLogo;
  warning.textContent = 'Small text can be hard to read from a distance. Zoom out to check your artwork before adding it.';
  clearPlacementPreview();
  addHighResolutionPlacement(document.querySelector('#brandColor').value, document.querySelector('#logoTreatment').value, previewPlacementLayers);
});
document.querySelector('#backToPlacement').addEventListener('click', () => { clearPlacementPreview(); showFlowStep('place'); setInteractionMode('move'); refreshSelection(); });
document.querySelectorAll('.size-presets button').forEach((button) => button.addEventListener('click', () => { amountInput.value = button.dataset.size; button.closest('details').open=false; resetEditorView();logoCells = null; footprintEdited = false; selectedCell = null; selectedCells = []; drawDesignPreview(); updateTotals(); }));
amountInput.addEventListener('change', () => { amountInput.value = placementCount(); });
amountInput.addEventListener('input', () => { resetEditorView();logoCells = null; footprintEdited = false; selectedCell = null; selectedCells = []; drawDesignPreview(); updateTotals(); });
document.querySelector('#logoTreatment').addEventListener('change',()=>drawDesignPreview());
document.querySelectorAll('[data-treatment]').forEach((button) => button.addEventListener('click', () => { document.querySelector('#logoTreatment').value = button.dataset.treatment; document.querySelector('#logoTreatment').addEventListener('change',()=>drawDesignPreview());
document.querySelectorAll('[data-treatment]').forEach((item) => item.classList.toggle('active', item === button)); drawDesignPreview(); updateLogoGuidance(); }));
document.querySelector('#logoScale').addEventListener('input', () => { document.querySelector('#logoScaleValue').textContent = `${document.querySelector('#logoScale').value}%`; drawDesignPreview(); });
for(const [id,mode] of [['moveImageMode','move'],['editHexMode','hex'],['paintCells','paint'],['panEditor','pan'],['colourBrush','paint'],['eraseCells','transparent'],['restoreCells','restore']]) document.querySelector(`#${id}`).addEventListener('click',()=>setEditorMode(mode));
document.querySelector('#brushColor').addEventListener('input',()=>{document.querySelector('#paintColourChip').style.background=document.querySelector('#brushColor').value;});
document.querySelector('#fillCells').addEventListener('click',()=>{document.querySelector('.studio-more').open=false;rememberPaint();logoCells=previewCells().map(c=>({...c,color:document.querySelector('#brushColor').value,transparent:false}));footprintEdited=true;drawDesignPreview();});
document.querySelector('#removeImage').addEventListener('click',()=>{document.querySelector('.studio-more').open=false;uploadVersion++;uploadedLogo=null;uploadedLogoCrop=null;document.querySelector('#logoUpload').value='';document.querySelector('#logoPreview').replaceChildren();document.querySelector('#logoPalette').hidden=true;resetLogoTransform();updateImageControls();drawDesignPreview();updateTotals();});
function resetLogoTransform() {
  document.querySelector('#logoScale').value = 100;
  document.querySelector('#logoScaleValue').textContent = '100%';
  logoPosition.x=0;logoPosition.y=0;
  document.querySelector('#logoOrientation').value = '0';
}

document.querySelector('#logoOrientation').addEventListener('change', () => { updateLogoPreviewOrientation(); drawDesignPreview(); });
document.querySelector('#resetLogo').addEventListener('click', () => { resetLogoTransform(); updateLogoPreviewOrientation(); drawDesignPreview(); });
document.querySelector('#clearPaint').addEventListener('click', () => { document.querySelector('.studio-more').open=false;rememberPaint(); logoCells=previewCells().map(({color,transparent,...cell})=>cell); drawDesignPreview(); updateTotals(); });
const designCanvas = document.querySelector('#designCanvas');
const editorPointers=new Map();
let editorPinch=null;
designCanvas.addEventListener('pointerdown', (event) => {
  editorPointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
  if(editorPointers.size===2){const points=[...editorPointers.values()];editorPinch={distance:Math.hypot(points[0].x-points[1].x,points[0].y-points[1].y),zoom:editorView.zoom};logoDrag=null;editorPainting=false;editorPan=null;designCanvas.setPointerCapture(event.pointerId);return;}
  if(logoEditorMode==='pan'||event.button===1||event.altKey){editorPan={x:event.clientX,y:event.clientY,offsetX:editorView.x,offsetY:editorView.y};designCanvas.setPointerCapture(event.pointerId);return;}

  if(uploadedLogo && logoEditorMode === 'move') {
    logoDrag = { x: event.clientX, y: event.clientY, offsetX: logoPosition.x, offsetY: logoPosition.y };
    designCanvas.setPointerCapture(event.pointerId); return;
  }
  rememberPaint(); lastPaintedCell=null; editorPainting = true; designCanvas.setPointerCapture(event.pointerId); paintEditorAt(event); });
designCanvas.addEventListener('pointermove', (event) => {
  if(editorPointers.has(event.pointerId))editorPointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
  if(editorPinch&&editorPointers.size===2){const points=[...editorPointers.values()];editorView.zoom=Math.max(1,Math.min(100,editorPinch.zoom*Math.hypot(points[0].x-points[1].x,points[0].y-points[1].y)/editorPinch.distance));queueDesignPreview();return;}
  if(editorPan){const r=designCanvas.getBoundingClientRect();editorView.x=editorPan.offsetX+(event.clientX-editorPan.x)*designCanvas.width/r.width;editorView.y=editorPan.offsetY+(event.clientY-editorPan.y)*designCanvas.height/r.height;queueDesignPreview();return;}

  if(logoDrag) {
    const rect = designCanvas.getBoundingClientRect();
    logoPosition.x = Math.max(-100,Math.min(100,logoDrag.offsetX + (event.clientX-logoDrag.x)*designCanvas.width/rect.width/editorArtworkSize.width*100));
    logoPosition.y = Math.max(-100,Math.min(100,logoDrag.offsetY + (event.clientY-logoDrag.y)*designCanvas.height/rect.height/editorArtworkSize.height*100));
    queueDesignPreview(); return;
  }
  if (editorPainting && logoEditorMode !== 'hex') paintEditorAt(event); });
for(const type of ['pointerup','pointercancel','lostpointercapture'])designCanvas.addEventListener(type,event=>{editorPointers.delete(event.pointerId);editorPainting=false;logoDrag=null;editorPan=null;editorPinch=null;});
function zoomEditor(factor) {editorView.zoom=Math.max(1,Math.min(100,editorView.zoom*factor));queueDesignPreview();}
designCanvas.addEventListener('wheel',event=>{event.preventDefault();zoomEditor(Math.exp(-event.deltaY*.002));},{passive:false});
document.querySelector('#editorZoomIn').addEventListener('click',()=>zoomEditor(1.6));
document.querySelector('#editorZoomOut').addEventListener('click',()=>zoomEditor(1/1.6));
document.querySelector('#editorFit').addEventListener('click',()=>{resetEditorView();queueDesignPreview();});
new ResizeObserver(()=>queueDesignPreview()).observe(designCanvas.parentElement);
document.addEventListener('click',event=>{for(const menu of document.querySelectorAll('.studio-popover[open]'))if(!menu.contains(event.target))menu.open=false;});

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
    resetLogoTransform();
    updateImageControls();setEditorMode('move');
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
  const status=document.querySelector('#uploadStatus');status.textContent=message;status.hidden=message.startsWith('Logo ready');
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
    const padding = 0;
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
  context.setTransform(512/bounds.width,0,0,512/bounds.height,-bounds.left*512/bounds.width,-bounds.top*512/bounds.height);context.fill(layoutFor(cells).path);
  const data=context.getImageData(0,0,512,512).data, integral=new Uint32Array(513*513);
  for(let y=0;y<512;y++){let row=0;for(let x=0;x<512;x++){row+=data[(y*512+x)*4+3]>20?0:1;integral[(y+1)*513+x+1]=integral[y*513+x+1]+row;}}
  let low=0,high=Math.min(bounds.height,bounds.width/aspect);
  for(let i=0;i<16;i++) {
    const h=(low+high)/2,w=h*aspect,x0=Math.max(0,Math.floor((mx-w/2-bounds.left)/bounds.width*512)),x1=Math.min(512,Math.ceil((mx+w/2-bounds.left)/bounds.width*512)),y0=Math.max(0,Math.floor((my-h/2-bounds.top)/bounds.height*512)),y1=Math.min(512,Math.ceil((my+h/2-bounds.top)/bounds.height*512));
    const missing=integral[y1*513+x1]-integral[y0*513+x1]-integral[y1*513+x0]+integral[y0*513+x0];
    if(missing===0)low=h;else high=h;
  }
  const h=Math.max(.01,low),w=h*aspect;
  return {x:(mx-w/2-bounds.left)/bounds.width*width,y:(my-h/2-bounds.top)/bounds.height*height,width:w/bounds.width*width,height:h/bounds.height*height};
}
function renderArtwork(cells) {
  const bounds = layoutFor(cells).bounds;
  const sourceCells=previewCells(),sourceLayout=layoutFor(sourceCells),sourceBounds=sourceLayout.bounds;
  const signature=[document.querySelector('#logoScale').value,document.querySelector('#logoOrientation').value,document.querySelector('#logoTreatment').value,document.querySelector('#brandColor').value,logoPosition.x,logoPosition.y].join(':');
  const cached=artworkCache.get(cells);
  if(cached&&cached.signature===signature&&cached.image===uploadedLogo&&cached.source===sourceCells)return cached.art;
  const art = document.createElement('canvas');
  const unit = Math.min(128, 3072 / Math.max(bounds.width, bounds.height));
  art.width = Math.ceil(bounds.width * unit);
  art.height = Math.ceil(bounds.height * unit);
  const context = art.getContext('2d');
  const px = art.width / bounds.width, py = art.height / bounds.height;
  const drawRotated = (x, y, width, height) => {
    const rotation = Number(document.querySelector('#logoOrientation').value) || 0;
    const repeat = document.querySelector('#logoTreatment').value === 'repeat';
    const shiftX = logoPosition.x/100 * (repeat ? width : sourceBounds.width * px);
    const shiftY = logoPosition.y/100 * (repeat ? height : sourceBounds.height * py);
    context.save(); context.translate(x + width / 2 + shiftX, y + height / 2 + shiftY);
    context.rotate(THREE.MathUtils.degToRad(rotation));
    const quarterTurn = Math.abs(rotation) === 90;
    const w = quarterTurn ? height : width, h = quarterTurn ? width : height;
    drawLogo(context, w, h, document.querySelector('#brandColor').value, true, -w / 2, -h / 2);
    context.restore();
  };
  const point = (cell) => { const p = centre(cell); return { x: (p.x - bounds.left)*px, y: (p.y-bounds.top)*py }; };
  context.setTransform(px,0,0,py,-bounds.left*px,-bounds.top*py);
  context.fillStyle=document.querySelector('#brandColor').value;context.fill(layoutFor(cells).path);
  context.resetTransform();
  if (creationType === 'logo' && uploadedLogo) {
    context.save();context.setTransform(px,0,0,py,-bounds.left*px,-bounds.top*py);context.clip(layoutFor(cells).path);context.resetTransform();
    if (document.querySelector('#logoTreatment').value === 'repeat') {
      cells.forEach((cell) => { const p = point(cell); context.save(); polygonPath(context,cell,bounds,px,py); context.clip(); drawRotated(p.x-unit*.525,p.y-unit*.525,unit*1.05,unit*1.05); context.restore(); });
    } else {
      const source = uploadedLogoCrop || { width: uploadedLogo.naturalWidth, height: uploadedLogo.naturalHeight };
      const rotation = Math.abs(Number(document.querySelector('#logoOrientation').value) || 0);
      const sourceAspect = source.width / source.height;
      // Fit once in the editor's local coordinate system. A new destination
      // clips that same framing; it must not shrink/recentre the source image.
      const aspect=rotation===90?1/sourceAspect:sourceAspect;
      if(!sourceLayout.fits.has(aspect))sourceLayout.fits.set(aspect,largestLogoRect(sourceCells,sourceBounds,aspect,sourceBounds.width,sourceBounds.height));
      const safeRect=sourceLayout.fits.get(aspect);
      drawRotated((sourceBounds.left + safeRect.x - bounds.left) * px, (sourceBounds.top + safeRect.y - bounds.top) * py, safeRect.width * px, safeRect.height * py);
    }
    context.restore();
  }
  // Group vector overrides by colour, keeping bulk fills bounded at large counts.
  const overrides=new Map();
  for(const cell of cells) {
    if(!cell.transparent&&!cell.color)continue;
    const key=cell.transparent?'clear':cell.color;
    if(!overrides.has(key))overrides.set(key,[]);overrides.get(key).push(cell);
  }
  context.setTransform(px,0,0,py,-bounds.left*px,-bounds.top*py);
  for(const [color,group] of overrides){const path=layoutFor(group).path;context.globalCompositeOperation=color==='clear'?'destination-out':'source-over';context.fillStyle=color==='clear'?'#000':color;context.fill(path);}
  context.resetTransform();context.globalCompositeOperation='source-over';
  artworkCache.set(cells,{signature,image:uploadedLogo,source:sourceCells,art});
  return art;
}

function pointForCell(cell) { return new THREE.Vector3(...topology.centre(cell.id)).multiplyScalar(radius+.0006); }

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
  const vertexCount=selectedCells.reduce((sum,cell)=>sum+topology.degrees[cell.id-1]*3,0);
  const positions=new Float32Array(vertexCount*3),uvs=new Float32Array(vertexCount*2),frame=topology.frame(selectedCell.id);
  let pi=0,ui=0;
  const add=p=>{positions[pi++]=p[0]*(radius+.0006);positions[pi++]=p[1]*(radius+.0006);positions[pi++]=p[2]*(radius+.0006);const local=topology.project(p,frame);uvs[ui++]=(local.x-bounds.left)/bounds.width;uvs[ui++]=1-(local.y-bounds.top)/bounds.height;};
  for(const cell of selectedCells){const polygon=topology.polygon(cell.id),middle=topology.centre(cell.id);for(let k=0;k<polygon.length;k++){add(middle);add(polygon[k]);add(polygon[(k+1)%polygon.length]);}}
  const mergedGeometry=new THREE.BufferGeometry();mergedGeometry.setAttribute('position',new THREE.BufferAttribute(positions,3));mergedGeometry.setAttribute('uv',new THREE.BufferAttribute(uvs,2));
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
  const sum=cells.reduce((vector,cell)=>vector.add(new THREE.Vector3(...topology.centre(cell.id))),new THREE.Vector3()).normalize();
  const placementRecord={website,count:amount,anchor:cells.reduce((best,cell)=>sum.dot(new THREE.Vector3(...topology.centre(cell.id)))>sum.dot(new THREE.Vector3(...topology.centre(best.id)))?cell:best,cells[0]).id};
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
  const designing=active==='design'&&innerWidth>1000;
  const editorWidth=designing?document.querySelector('#buyPanel').getBoundingClientRect().width+36:0;
  const width = designing?Math.max(200,innerWidth-editorWidth):active && !narrow ? innerWidth - 490 : innerWidth;
  canvas.style.left=designing?`${editorWidth}px`:'0px';
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
  const grid=await ensureTopology(),sessionAreas=[...new Set(sessionPlacements.values())].map((placement,index)=>({anchor:placement.anchor,name:'Your placement',key:`session-${index}`}));
  const candidates=[...(bootstrap.sampleAreas||[]).map((area,index)=>({anchor:area.anchor,name:bootstrap.sampleCampaigns[area.campaign].name,key:`sample-${index}`})),...sessionAreas]
    .filter(area=>occupiedCells[area.anchor-1]);
  if(!candidates.length)return [
    {name:'Globe overview',normal:[0,0,1],angle:.4,overview:true,offset:0},
    {name:'Globe overview',normal:[1,0,0],angle:.4,overview:true,offset:0},
    {name:'Globe overview',normal:[0,0,-1],angle:.4,overview:true,offset:0},
  ];
  const pool=[...candidates],selected=[pool.splice(Math.floor(Math.random()*pool.length),1)[0]],limit=Math.min(24,candidates.length);
  while(selected.length<limit&&pool.length){
    let best=0,bestScore=Infinity;
    for(let i=0;i<pool.length;i++){
      const point=grid.centre(pool[i].anchor);
      const separation=Math.max(...selected.map(area=>{const other=grid.centre(area.anchor);return point[0]*other[0]+point[1]*other[1]+point[2]*other[2];}));
      const score=separation+Math.random()*.08;
      if(score<bestScore){best=i;bestScore=score;}
    }
    selected.push(pool.splice(best,1)[0]);
  }
  const firstDetail=Math.floor(Math.random()*selected.length),detailSlots=new Set([firstDetail]);
  if(selected.length>1)detailSlots.add((firstDetail+1+Math.floor(Math.random()*(selected.length-1)))%selected.length);
  return selected.map((area,index)=>({id:area.anchor,name:area.name,normal:Array.from(grid.centre(area.anchor)),angle:.012,detail:detailSlots.has(index)||Math.random()<.35,offset:(Math.random()-.5)*.07}));
}
const demoTour=createDemoTour({camera,globe,controls,radius,button:document.querySelector('#demoTour'),wideDistance:globeFitDistance,cancelZoom(){zoom.cancel();cameraDistanceTarget=null;},loadStops:createTourStops,prepareDetail(){void ensureTopology().catch(()=>{});},timeScale:import.meta.env.DEV&&new URLSearchParams(location.search).has('tourFast')?.005:1});
const rotationToggle=document.querySelector('#rotationToggle');
let displayedRotationState=null;
function updateRotationControl(){
  const rotating=controls.autoRotate&&!demoTour.active;
  if(rotating===displayedRotationState)return;
  displayedRotationState=rotating;
  rotationToggle.textContent=rotating?'⏸':'⟳';
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
    available: occupiedCells.findIndex(value=>!value)+1,
    focus(id, distance = .6) {
      controls.autoRotate=false;orientToCell(id,radius+distance);
    },
    place(id) { choosePatternOrigin({uv:new THREE.Vector2(),point:pointForCell({id})},cellForId(id));focusSelection(); },
    state() { return { selected: selectedCells.map(c=>c.id), design: previewCells().map(c=>c.id), designAnchor, requestedAnchor, sold, committed: [...sessionPlacements.keys()], connected: topology.isConnected(selectedCells), camera:camera.position.toArray(), detailVertices:cellDetail?.mesh.geometry.attributes.position?.count||0, drawCalls:renderer.info.render.calls,tiles:{...artworkTiles.stats},retainedPlacements:placementLayers.children.length }; },
    screen(id) { const p=pointForCell({id}).applyMatrix4(globe.matrixWorld).project(camera),r=canvas.getBoundingClientRect();return {x:r.x+(p.x+1)*r.width/2,y:r.y+(1-p.y)*r.height/2}; },
  };
}
if(import.meta.env.DEV)window.performanceQA={tiles:artworkTiles.stats,focus(direction,altitude){zoom.cancel();controls.autoRotate=false;cameraDistanceTarget=null;globe.rotation.set(0,0,0);camera.position.set(...direction).normalize().multiplyScalar(radius+altitude);controls.update();},state(){return{tiles:{...artworkTiles.stats},topologyLoaded:!!topology,drawCalls:renderer.info.render.calls,textures:renderer.info.memory.textures,geometries:renderer.info.memory.geometries,camera:camera.position.toArray(),retainedPlacements:placementLayers.children.length};}};
