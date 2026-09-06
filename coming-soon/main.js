import * as THREE from 'three';

const canvas = document.querySelector('#globe');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.25;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(35, 1, .1, 100);
camera.position.set(0, 0, 9.2);
const world = new THREE.Group();
world.rotation.x = -.09;
scene.add(world);

const textureCanvas = document.createElement('canvas');
textureCanvas.width = 2040;
textureCanvas.height = 1020;
const ctx = textureCanvas.getContext('2d');
ctx.fillStyle = '#08283b';
ctx.fillRect(0, 0, textureCanvas.width, textureCanvas.height);
// This radius makes the horizontal hex period exactly 12px; 2040px is an
// exact multiple, so the left and right texture edges join without a seam.
const hexR = 12 / Math.sqrt(3);
const hexW = hexR * Math.sqrt(3);
const hexH = hexR * 1.5;

function hexPath(x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 6; i += 1) {
    const a = Math.PI / 3 * i - Math.PI / 6;
    const px = x + Math.cos(a) * r;
    const py = y + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

for (let row = -1; row < textureCanvas.height / hexH + 2; row += 1) {
  for (let col = -1; col < textureCanvas.width / hexW + 2; col += 1) {
    const x = col * hexW + (row % 2 ? hexW / 2 : 0);
    const y = row * hexH;
    const longitude = x / textureCanvas.width * Math.PI * 2;
    const wave = Math.sin(longitude * 7 + row * .19) + Math.cos(longitude * 3 - row * .27) + Math.sin(longitude * 11 + row * .11);
    const land = wave > 1.45 && Math.abs(y - textureCanvas.height / 2) > 82;
    hexPath(x, y, hexR - 1.1);
    ctx.fillStyle = land ? '#164c58' : '#092d42';
    ctx.fill();
    ctx.strokeStyle = land ? '#2d6b70' : '#16516a';
    ctx.lineWidth = 1.25;
    ctx.stroke();
  }
}

ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.font = '900 20px "Segoe UI", Arial, sans-serif';
function drawPhrase(phrase, startX, centreY, tilt = 0, colour = '#d0ff52') {
  [...phrase].forEach((letter, i) => {
    if (letter === ' ') return;
    const x = startX + i * 28;
    const y = centreY + (i - phrase.length / 2) * tilt;
    hexPath(x, y, 15);
    ctx.fillStyle = colour;
    ctx.fill();
    ctx.strokeStyle = '#efffc3';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#07141b';
    ctx.fillText(letter, x, y + .5);
  });
}
// Four repeated sectors close exactly around the globe. Offset rows keep both
// messages in view while rotating, with enough space for the longer name.
for (let x = -510; x <= textureCanvas.width + 510; x += 510) {
  drawPhrase('COMING SOON', x + 255, 370, .22);
  drawPhrase('MILLION HEXAGONS', x, 510, 0, '#bcefff');
  drawPhrase('COMING SOON', x + 255, 650, -.22);
}

const texture = new THREE.CanvasTexture(textureCanvas);
texture.colorSpace = THREE.SRGBColorSpace;
texture.wrapS = THREE.RepeatWrapping;
texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
const globe = new THREE.Mesh(
  new THREE.SphereGeometry(2.45, 160, 96),
  new THREE.MeshStandardMaterial({ map: texture, roughness: .54, metalness: .12 })
);
// Keep the equirectangular texture boundary on the far side of the opening view.
globe.rotation.y = 0;
world.add(globe);

const atmosphere = new THREE.Mesh(
  new THREE.SphereGeometry(2.465, 96, 64),
  new THREE.ShaderMaterial({
    transparent: true,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
    vertexShader: `varying vec3 n; varying vec3 v; void main(){ n=normalize(normalMatrix*normal); vec4 p=modelViewMatrix*vec4(position,1.); v=normalize(-p.xyz); gl_Position=projectionMatrix*p; }`,
    fragmentShader: `varying vec3 n; varying vec3 v; void main(){ float rim=pow(1.-max(dot(n,v),0.),5.5); gl_FragColor=vec4(.08,.48,.7,rim*.14); }`
  })
);
world.add(atmosphere);
scene.add(new THREE.HemisphereLight(0xa8e8ff, 0x020609, 1.6));
const key = new THREE.DirectionalLight(0xffffff, 3.8);
key.position.set(-3, 4, 5);
scene.add(key);
const fill = new THREE.PointLight(0x75cfff, 11, 15);
fill.position.set(3, -2, 4);
scene.add(fill);

const stars = new THREE.BufferGeometry();
const positions = new Float32Array(900);
for (let i = 0; i < positions.length; i += 3) {
  positions[i] = (Math.random() - .5) * 22;
  positions[i + 1] = (Math.random() - .5) * 15;
  positions[i + 2] = -2 - Math.random() * 9;
}
stars.setAttribute('position', new THREE.BufferAttribute(positions, 3));
scene.add(new THREE.Points(stars, new THREE.PointsMaterial({ color: 0x6b9bad, size: .018, transparent: true, opacity: .65 })));

let dragging = false;
let previousX = 0;
let previousY = 0;
let velocityX = 0;
let velocityY = 0;
canvas.addEventListener('pointerdown', (event) => {
  dragging = true;
  previousX = event.clientX;
  previousY = event.clientY;
  canvas.setPointerCapture(event.pointerId);
});
canvas.addEventListener('pointermove', (event) => {
  if (!dragging) return;
  velocityY = (event.clientX - previousX) * .004;
  velocityX = (event.clientY - previousY) * .004;
  world.rotation.y += velocityY;
  world.rotation.x += velocityX;
  previousX = event.clientX;
  previousY = event.clientY;
});
canvas.addEventListener('pointerup', () => { dragging = false; });
canvas.addEventListener('pointercancel', () => { dragging = false; });

function resize() {
  const width = innerWidth;
  const height = innerHeight;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.position.z = width < 600 ? 10.6 : width < 850 ? 10 : 9.2;
  camera.updateProjectionMatrix();
}
function render() {
  if (!dragging) {
    velocityX *= .94;
    velocityY *= .94;
    world.rotation.x += velocityX;
    world.rotation.y += velocityY - .0007;
  }
  renderer.render(scene, camera);
  requestAnimationFrame(render);
}
addEventListener('resize', resize);
resize();
render();
