// เครื่องยนต์ 3 มิติ: สตูดิโอตัวละคร + โลกมักกะฮ์ (แผนที่จริงจาก Google/Cesium หรือฉากสำรองที่สร้างจากโค้ด)
import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { Avatar } from './character.js';
import * as HR from './haram.js';
import * as PE from './people.js';
import { buildOutskirts } from './outskirts.js';
import * as SITEB from './sites.js';
import * as LM from './landmarks.js';
import * as LF from './life.js';
import { SAFA, MARWA, MAQAM, HIJR_C, HIJR_R, BARBER, MASA, POLY, ROADS, SITES, DUA } from './data.js';

const D2R = Math.PI / 180;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const $ = s => document.querySelector(s);

let renderer, canvas, S, H, CFG;
export const engine = { view: 'studio', mode: 'fallback', site: 'makkah', stage: null, ready: false };

/* =============== renderer =============== */
export function initEngine(cv, state, hooks, config) {
  canvas = cv; S = state; H = hooks; CFG = config;
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, logarithmicDepthBuffer: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio || 1));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  buildStudio();
  buildWorldBase();
  new ResizeObserver(resize).observe(canvas.parentElement); resize();
  bindInput();
  requestAnimationFrame(loop);
  engine.ready = true;
}
function resize() {
  const r = canvas.parentElement.getBoundingClientRect();
  renderer.setSize(r.width, r.height, false);
  for (const c of [studio.cam, wcam]) { c.aspect = r.width / Math.max(1, r.height); c.updateProjectionMatrix(); }
  if (tiles) tiles.setResolutionFromRenderer(wcam, renderer);
}

/* =============== avatars =============== */
export const avatar = new Avatar();
const companions = [];
let lastLook = null;
export function setLook(look, group) {
  lastLook = look;
  avatar.setLook(look);
  const want = group === 'pair' ? 1 : group === 'family' ? 2 : 0;
  while (companions.length > want) { const c = companions.pop(); c.group.removeFromParent(); }
  while (companions.length < want) { const c = new Avatar(); companions.push(c); (engine.view === 'studio' ? studio.scene : wscene).add(c.group); }
  companions.forEach((c, i) => {
    const spouse = i === 0;
    const g = spouse ? (look.gender === 'm' ? 'f' : 'm') : 'm';
    c.setLook({ ...look, gender: g, kid: !spouse, beard: spouse && g === 'm', idtiba: look.idtiba && g === 'm', cap: g === 'm' && !look.ihram && spouse, hair: '', hairColor: spouse ? '#2b1d14' : '#3a2416', cloth: spouse ? '#2D3A55' : '#7B4C39', clothIndex: 1, skin: look.skin });
    c.group.scale.setScalar(spouse ? (g === 'f' ? .95 : 1.02) : 1);
  });
  layoutStudioCompanions();
}

/* =============== studio =============== */
const studio = { scene: new THREE.Scene(), cam: new THREE.PerspectiveCamera(30, 1, .05, 100), yaw: 0, yawT: 0, focus: 'body', preset: 'front', anim: 'idle', spin: false, zoom: 1 };
function buildStudio() {
  const sc = studio.scene;
  sc.add(new THREE.HemisphereLight(0xcfe6ff, 0x1a130d, .7));
  const key = new THREE.DirectionalLight(0xfff1df, 2.6); key.position.set(2.2, 4, 3); key.castShadow = true; key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3, near: .5, far: 15 }); key.shadow.bias = -.0005; sc.add(key);
  const rim = new THREE.DirectionalLight(0x7fe9c8, 2.2); rim.position.set(-3, 2.6, -3.5); sc.add(rim);
  const fill = new THREE.DirectionalLight(0xbcd2ff, .6); fill.position.set(-3, 1.5, 2); sc.add(fill);
  const plat = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.22, .08, 96), new THREE.MeshStandardMaterial({ color: 0x0f161c, metalness: .35, roughness: .38 }));
  plat.position.y = -.04; plat.receiveShadow = true; sc.add(plat);
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.16, 1.2, 128).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x3DD39A, transparent: true, opacity: .8 }));
  ring.position.y = .002; sc.add(ring);
  const catcher = new THREE.Mesh(new THREE.CircleGeometry(1.14, 64).rotateX(-Math.PI / 2), new THREE.ShadowMaterial({ opacity: .45 }));
  catcher.position.y = .003; catcher.receiveShadow = true; sc.add(catcher);
  // ซุ้มโค้งด้านหลังแบบลานมัสยิด
  const archMat = new THREE.MeshStandardMaterial({ color: 0x18242d, roughness: .8, metalness: .1 });
  const toneArch = [0x18242d, 0xd9e1dd];
  for (let k = -4; k <= 4; k++) {
    const a = k * .26, r = 7.5, g = new THREE.Group();
    g.position.set(Math.sin(a) * r, 0, -Math.cos(a) * r); g.rotation.y = -a; sc.add(g);
    const shape = new THREE.Shape(); const w = 1.25, h = 3.6;
    shape.moveTo(-w, 0); shape.lineTo(-w, h); shape.quadraticCurveTo(-w, h + 1.1, 0, h + 1.6); shape.quadraticCurveTo(w, h + 1.1, w, h); shape.lineTo(w, 0); shape.lineTo(w + .35, 0); shape.lineTo(w + .35, h + .1); shape.quadraticCurveTo(w + .35, h + 1.35, 0, h + 2.05); shape.quadraticCurveTo(-w - .35, h + 1.35, -w - .35, h + .1); shape.lineTo(-w - .35, 0);
    const am = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: .3, bevelEnabled: false }), archMat); am.userData.studioTone = toneArch; g.add(am);
  }
  const floor = new THREE.Mesh(new THREE.CircleGeometry(12, 64).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x0b1116, roughness: .55, metalness: .2 }));
  floor.position.y = -.081; floor.receiveShadow = true; floor.userData.studioTone = [0x0b1116, 0xe8eeeb]; sc.add(floor);
  plat.userData.studioTone = [0x0f161c, 0xf4f7f5];
  sc.fog = new THREE.Fog(0x070b10, 8, 18);
  sc.add(avatar.group);
}
function layoutStudioCompanions() {
  if (engine.view !== 'studio') return;
  companions.forEach((c, i) => { c.group.position.set(i === 0 ? -.85 : .85, 0, -.55); c.group.rotation.set(0, i === 0 ? .25 : -.25, 0); });
}
// เลื่อนตำแหน่งตัวละครบนจอ (สัดส่วนแนวนอน 0–1) ให้ไม่ชนหัวข้อและแผงด้านขวา
export function setStudioFocus(fx, fy = .5) { studio.fx = fx; studio.fy = fy; }
// โทนสตูดิโอสว่าง/มืด ให้เข้ากับธีมของหน้าเว็บ
export function setStudioTheme(light) {
  const sc = studio.scene; sc.fog.color.setHex(light ? 0xdfe6e3 : 0x070b10);
  sc.traverse(o => { if (o.userData.studioTone) o.material.color.setHex(light ? o.userData.studioTone[1] : o.userData.studioTone[0]); });
}
export function studioSet(o) { Object.assign(studio, o); if (o.preset) { studio.spin = o.preset === 'spin'; const map = { front: 0, '45': -Math.PI / 4, side: -Math.PI / 2, back: Math.PI }; if (o.preset in map) studio.yawT = map[o.preset]; } }
function studioFrame(dt) {
  if (studio.spin) studio.yawT += dt * .5;
  studio.yaw += (studio.yawT - studio.yaw) * Math.min(1, dt * 6);
  avatar.group.position.set(0, 0, 0); avatar.group.rotation.y = studio.yaw;
  const sp = studio.anim === 'walk' ? 1.4 : studio.anim === 'run' ? 7 : 0;
  avatar.update(dt, sp);
  companions.forEach(c => c.update(dt, sp));
  const face = studio.focus === 'face';
  const ty = face ? 1.66 : .92, dist = (face ? 1.3 : 5.6) * studio.zoom;
  const W0 = renderer.domElement.width, H0 = renderer.domElement.height, fx = studio.fx ?? .5;
  const fy = studio.fy ?? .5;
  if (Math.abs(fx - .5) > .01 || Math.abs(fy - .5) > .01) studio.cam.setViewOffset(W0, H0, (.5 - fx) * W0, (.5 - fy) * H0, W0, H0); else studio.cam.clearViewOffset();
  studio.cam.position.set(0, ty + (face ? .05 : .35), dist);
  studio.cam.lookAt(0, ty, 0);
  renderer.setClearColor(0x000000, 0);
  renderer.render(studio.scene, studio.cam);
}

/* =============== world base =============== */
const wscene = new THREE.Scene();
const wcam = new THREE.PerspectiveCamera(60, 1, .3, 200000);
let sky, hemi, sun, blob, beam, beamRing;
const fb = new THREE.Group(), masaGroup = new THREE.Group(), props = new THREE.Group(), cityG = new THREE.Group();
// กลุ่มฉากของแต่ละเมือง (ฉากสำรองที่สร้างจากข้อมูลแผนที่จริง) และสถานะการโหลด
const siteG = { makkah: fb, madinah: new THREE.Group(), aqsa: new THREE.Group() };
const SITE = {};
const P = { x: 0, z: 45, y: 0, heading: Math.PI, gy: null };
// pitch > 0 = กล้องอยู่สูงมองลง, pitch < 0 = กล้องต่ำเงยมองขึ้น; fp = มุมมองสายตา (บุคคลที่หนึ่ง); k = ระยะที่ถูกผนังบัง (ปรับแบบนุ่มนวล)
const cam = { yaw: 0, pitch: .3, dist: 7, fp: false, k: 1, zacc: 1 };
const MAT = {};
function std(c, o) { return new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: .85, metalness: 0 }, o || {})); }

function canvasTex(w, h, draw, repeat) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
  if (repeat) t.repeat.set(repeat[0], repeat[1]); return t;
}
const nightU = { value: 0 };
function hctx() { return { fb, MAT, std, canvasTex, addWall, addRing, inPoly, distToPolyEdge, MASA_L: MASA.L, wallPlain: (ax, az, bx, bz, h) => wall(fb, ax, az, bx, bz, h, MAT.wall, 2) }; }
function buildMaterials() {
  const R = rng(5);
  const marble = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#f3f2ee'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 18; i++) { g.strokeStyle = `rgba(150,150,155,${.05 + R() * .12})`; g.lineWidth = .6 + R() * 1.6; g.beginPath(); let x = R() * w, y = R() * h; g.moveTo(x, y); for (let k = 0; k < 14; k++) { x += (R() - .5) * 70; y += (R() - .3) * 50; g.lineTo(x, y); } g.stroke(); }
    g.strokeStyle = 'rgba(0,0,0,.06)'; g.lineWidth = 2; for (let x = 0; x <= w; x += 128) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); g.beginPath(); g.moveTo(0, x); g.lineTo(w, x); g.stroke(); }
  });
  const sand = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#c5ad86'; g.fillRect(0, 0, w, h); for (let i = 0; i < 5000; i++) { const v = 150 + R() * 70 | 0; g.fillStyle = `rgba(${v},${v - 20},${v - 50},.25)`; g.fillRect(R() * w, R() * h, 1.5, 1.5); } }, [400, 400]);
  const kiswa = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#0b0b0d'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(70,70,76,.55)'; g.lineWidth = 2;
    for (let y = 0; y < h; y += 64) for (let x = (y / 64 % 2) * 32; x < w; x += 64) { g.beginPath(); g.ellipse(x, y, 22, 12, 0, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.moveTo(x - 22, y); g.bezierCurveTo(x - 8, y - 22, x + 8, y + 22, x + 22, y); g.stroke(); }
  }, [3, 3]);
  const band = canvasTex(1024, 128, (g, w, h) => {
    g.fillStyle = '#0b0b0d'; g.fillRect(0, 0, w, h);
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#f2d58a'); gr.addColorStop(.5, '#c9a24a'); gr.addColorStop(1, '#8c6b22');
    g.strokeStyle = gr; g.fillStyle = gr; g.lineWidth = 5; g.lineCap = 'round';
    g.fillRect(0, 6, w, 6); g.fillRect(0, h - 12, w, 6);
    for (let x = 20; x < w; x += 46) { g.beginPath(); g.moveTo(x, 92); g.quadraticCurveTo(x + 10, 30, x + 20, 92); g.moveTo(x + 6, 64); g.lineTo(x + 32, 64); g.moveTo(x + 30, 40); g.lineTo(x + 30, 96); g.stroke(); g.beginPath(); g.arc(x + 14, 30, 4, 0, Math.PI * 2); g.fill(); }
  }, [2, 1]);
  Object.assign(MAT, {
    sand: std(0xffffff, { map: sand, roughness: 1 }), paving: std(0xd8cdb8, { roughness: .9 }), floor: std(0xeeebe4, { roughness: .6, side: THREE.DoubleSide }),
    mataf: std(0xffffff, { map: (() => { const t = marble.clone(); t.repeat.set(26, 26); t.needsUpdate = true; return t; })(), roughness: .32 }),
    wall: std(0xe6e1d5, { roughness: .8 }), stone: std(0xd6cebf, { roughness: .9 }), marble: std(0xf4f3ef, { roughness: .35 }),
    roof: std(0xe7e3da, { roughness: .9, side: THREE.DoubleSide }), kiswa: std(0xffffff, { map: kiswa, roughness: .95 }), band: std(0xffffff, { map: band, roughness: .4, metalness: .5 }),
    gold: std(0xd2ab55, { roughness: .3, metalness: .85 }), silver: std(0xcfd3d8, { roughness: .25, metalness: .8 }), road: std(0x55534f, { roughness: .95 }),
    masa: std(0xffffff, { map: (() => { const t = marble.clone(); t.repeat.set(8, 70); t.needsUpdate = true; return t; })(), roughness: .3 }),
    rock: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true }), hill: std(0x8c7a63, { roughness: 1, flatShading: true }),
    tent: std(0xf6f4ee), tree: std(0x6e8c4b, { flatShading: true }), build: HR.windowMaterial(nightU), clock: std(0xf7f7f2, { roughness: .5 }), dark: std(0x3a3a3e),
    green: new THREE.MeshBasicMaterial({ color: 0x35d07f }), crowd: std(0xffffff, { roughness: .9 }), head: std(0xffffff, { roughness: .6 })
  });
  MAT.lit = [[MAT.mataf, 0x8c8a84], [MAT.floor, 0x5e5b55], [MAT.wall, 0x6a665e], [MAT.marble, 0x77756f], [MAT.roof, 0x3c3934], [MAT.masa, 0x6e6c66], [MAT.stone, 0x4a463f], [MAT.clock, 0xe8f2e8], [MAT.tent, 0x2a2925], [MAT.band, 0x5a4214], [MAT.gold, 0x4a3510], [MAT.kiswa, 0x101012]];
}

function buildWorldBase() {
  buildMaterials();
  sky = new Sky(); sky.scale.setScalar(150000); wscene.add(sky);
  const u = sky.material.uniforms; u.turbidity.value = 6; u.rayleigh.value = 1.6; u.mieCoefficient.value = .005; u.mieDirectionalG.value = .8;
  hemi = new THREE.HemisphereLight(0xdfeaff, 0xa08c70, .9); wscene.add(hemi);
  sun = new THREE.DirectionalLight(0xfff0d8, 2.6); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 1, far: 400 }); sun.shadow.bias = -.0004; sun.shadow.normalBias = .03;
  wscene.add(sun); wscene.add(sun.target);
  const bt = canvasTex(128, 128, (g, w) => { const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); gr.addColorStop(0, 'rgba(0,0,0,.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, w); });
  blob = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.4).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: bt, transparent: true, depthWrite: false }));
  wscene.add(blob);
  beam = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 60, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0x3DD39A, transparent: true, opacity: .22, depthWrite: false, side: THREE.DoubleSide }));
  beamRing = new THREE.Mesh(new THREE.RingGeometry(1.6, 2.3, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x3DD39A, transparent: true, opacity: .85, depthWrite: false }));
  wscene.add(beam); wscene.add(beamRing);
  wscene.add(fb); wscene.add(masaGroup); wscene.add(props); fb.add(cityG);
  for (const k of ['madinah', 'aqsa']) { siteG[k].visible = false; wscene.add(siteG[k]); }
  buildMasa(masaGroup);
  buildCoolers(props);
  const q = location.search;
  setNight(/[?&]day/.test(q) ? false : /[?&]night/.test(q) ? true : isMakkahNight());
}
function isMakkahNight() { try { const h = +new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hour12: false, timeZone: 'Asia/Riyadh' }).format(new Date()); return h < 6 || h >= 18; } catch (e) { return false; } }
export function setNight(n) {
  engine.night = n;
  const sunDir = n ? new THREE.Vector3(-.3, -.2, .5) : new THREE.Vector3(-.45, .9, .55);
  sky.material.uniforms.sunPosition.value.copy(sunDir.clone().multiplyScalar(1000));
  sky.visible = !n;
  wscene.background = n ? new THREE.Color(0x070b16) : null;
  wscene.fog = engine.mode === 'tiles' ? new THREE.FogExp2(n ? 0x070b16 : 0xc9d6e2, n ? .00008 : .00003) : new THREE.Fog(n ? 0x070b16 : 0xc9d6e2, n ? 300 : 600, n ? 9000 : 18000);
  // กลางคืน: ฮะรอมเปิดไฟสว่างทั้งลาน จึงใช้แสงไฟจากด้านบนแทนดวงอาทิตย์
  hemi.intensity = n ? .8 : .9; hemi.color.setHex(n ? 0xdde6ff : 0xdfeaff); sun.intensity = n ? 1.3 : 2.6; sun.color.setHex(n ? 0xfff1d6 : 0xfff0d8);
  engine.sunDir = n ? new THREE.Vector3(-.2, 1, .3).normalize() : sunDir.normalize();
  for (const [m, c] of MAT.lit) m.emissive.setHex(n ? c : 0);
  for (const [m, c] of HR.haramMats(hctx()).lit) m.emissive.setHex(n ? c : 0);
  for (const [m, c] of LM.LIT) m.emissive.setHex(n ? c : 0);
  for (const st of Object.values(SITE)) if (st.traffic) st.traffic.setNight(n);
  nightU.value = n ? 1 : 0;
  renderer && (renderer.toneMappingExposure = n ? 1.2 : 1);
  H && H.refresh && H.refresh();
}

/* =============== collision =============== */
const CELL = 40, grid = new Map(); let stamp = 0;
const layers = new Set(['world', 'masa', 'kaaba']);
function addWall(ax, az, bx, bz, r, layer) {
  const s = { ax, az, bx, bz, r: r || 0, st: 0, layer: layer || 'world' };
  const i0 = Math.floor((Math.min(ax, bx) - 3) / CELL), i1 = Math.floor((Math.max(ax, bx) + 3) / CELL);
  const j0 = Math.floor((Math.min(az, bz) - 3) / CELL), j1 = Math.floor((Math.max(az, bz) + 3) / CELL);
  for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) { const k = i + ',' + j; if (!grid.has(k)) grid.set(k, []); grid.get(k).push(s); }
}
function addRing(x, z, r, n, layer) { n = n || 8; for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2, b = (k + 1) / n * Math.PI * 2; addWall(x + Math.cos(a) * r, z + Math.sin(a) * r, x + Math.cos(b) * r, z + Math.sin(b) * r, 0, layer); } }
function addAABB(x0, z0, x1, z1, layer) { addWall(x0, z0, x1, z0, 0, layer); addWall(x1, z0, x1, z1, 0, layer); addWall(x1, z1, x0, z1, 0, layer); addWall(x0, z1, x0, z0, 0, layer); }
function collide(p, pr) {
  stamp++;
  const i0 = Math.floor((p.x - 4) / CELL), i1 = Math.floor((p.x + 4) / CELL), j0 = Math.floor((p.z - 4) / CELL), j1 = Math.floor((p.z + 4) / CELL);
  for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
    const list = grid.get(i + ',' + j); if (!list) continue;
    for (const s of list) {
      if (s.st === stamp || !layers.has(s.layer)) continue; s.st = stamp;
      const dx = s.bx - s.ax, dz = s.bz - s.az, L2 = dx * dx + dz * dz;
      const t = L2 ? clamp(((p.x - s.ax) * dx + (p.z - s.az) * dz) / L2, 0, 1) : 0;
      const cx = s.ax + dx * t, cz = s.az + dz * t, ox = p.x - cx, oz = p.z - cz, d = Math.hypot(ox, oz), R = pr + s.r;
      if (d < R && d > 1e-6) { p.x = cx + ox / d * R; p.z = cz + oz / d * R; }
    }
  }
}

/* =============== helpers =============== */
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function mesh(parent, geo, mat, x, y, z, ry) { const m = new THREE.Mesh(geo, mat); m.position.set(x || 0, y || 0, z || 0); if (ry) m.rotation.y = ry; parent.add(m); return m; }
function box(parent, w, h, d, mat, x, y, z, ry) { return mesh(parent, new THREE.BoxGeometry(w, h, d), mat, x, y, z, ry); }
function obox(parent, ax, az, bx, bz, wid, h, y0, mat) { const dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz); return mesh(parent, new THREE.BoxGeometry(L, h, wid), mat, (ax + bx) / 2, y0 + h / 2, (az + bz) / 2, Math.atan2(-dz, dx)); }
function wall(parent, ax, az, bx, bz, h, mat, thick, layer) { thick = thick || 2.5; const m = obox(parent, ax, az, bx, bz, thick, h, 0, mat); m.castShadow = m.receiveShadow = true; addWall(ax, az, bx, bz, thick / 2, layer); return m; }
function segD(px, pz, ax, az, bx, bz) { const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz; const t = L2 ? clamp(((px - ax) * dx + (pz - az) * dz) / L2, 0, 1) : 0; return Math.hypot(px - ax - dx * t, pz - az - dz * t); }
function roadD(x, z) { let m = 1e9; for (const r of ROADS) for (let k = 0; k < r.length - 1; k++) m = Math.min(m, segD(x, z, r[k][0], r[k][1], r[k + 1][0], r[k + 1][1])); return m; }
export function inPoly(x, z, poly = POLY) { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, zi] = poly[i], [xj, zj] = poly[j]; if (((zi > z) !== (zj > z)) && (x < (xj - xi) * (z - zi) / (zj - zi) + xi)) c = !c; } return c; }
function distToPolyEdge(x, z) { let m = 1e9; for (let i = 0; i < POLY.length; i++) { const a = POLY[i], b = POLY[(i + 1) % POLY.length]; m = Math.min(m, segD(x, z, a[0], a[1], b[0], b[1])); } return m; }

/* =============== fallback terrain =============== */
const MTS = [];
const mtN = (m, a) => 1 + .13 * Math.sin(3 * a + m.s) + .08 * Math.sin(5 * a + m.s * 2.3) + .05 * Math.sin(9 * a + m.s * .7);
// รูปทรงภูเขา: ลาดชันด้านบน มีสันเขาและร่องหินตามมุม
const mtP = (m, a, u) => m.H * Math.pow(1 - u, 1.25) * (1 + u * (.16 * Math.sin(7 * a + m.s) + .08 * Math.sin(15 * a + m.s * 3.1)));
function mtH(m, x, z) { const dx = x - m.x, dz = z - m.z, d = Math.hypot(dx, dz); if (d > m.R * 1.3) return 0; const a = Math.atan2(dz, dx), Re = m.R * mtN(m, a); return d >= Re ? 0 : mtP(m, a, d / Re); }
function fbGround(x, z) { let h = 0; for (const m of MTS) { if (m.off || Math.abs(x - m.x) > m.R * 1.3 || Math.abs(z - m.z) > m.R * 1.3) continue; const v = mtH(m, x, z); if (v > h) h = v; } return h; }
// ระยะห่างแนวขวางจากแกนมัสอา (ใช้กันไม่ให้ตึก/ถนนจากแผนที่ทับอาคารมัสอา)
const masaLat = (x, z) => { const rx = x - SAFA[0], rz = z - SAFA[1], t = (rx * MASA.d[0] + rz * MASA.d[1]) / MASA.L; return (t > -.15 && t < 1.15) ? Math.abs(rx * MASA.e[0] + rz * MASA.e[1]) : 1e9; };
let fbBuilt = false;
const AGENTS = []; let crowdMeshes = [];
function buildFallback() {
  if (fbBuilt) return; fbBuilt = true;
  const R = rng(1446);
  // ภูเขาใกล้ฮะรอมใช้รูปร่างจริงจากแผนที่ (โหลดภายหลัง) จึงปิดภูเขาจำลองลูกแรก
  [[394, 111, 105, 200], [3430, -3881, 380, 800], [2425, 5009, 450, 1000], [16364, 7475, 55, 140]].forEach(([x, z, H, Rr], k) => MTS.push({ x, z, H, R: Rr, s: k * 1.7 + .4, off: k === 0 }));
  const FLAT = [[0, -150, 1550], [6700, 650, 1250], [4819, -22, 450], [11431, 4301, 1350], [16364, 7475, 2300], [-3637, -5131, 420], [13500, 5800, 700]];
  for (let tries = 0, made = 0; tries < 900 && made < 120; tries++) {
    const x = -6500 + R() * 26000, z = -8500 + R() * 19000, H = 90 + R() * 330, Rr = 250 + R() * 650;
    if (FLAT.some(([fx, fz, fr]) => Math.hypot(x - fx, z - fz) < fr + Rr * .9)) continue;
    if (roadD(x, z) < Rr * 1.3 + 60) continue;
    if (MTS.slice(0, 4).some(m => Math.hypot(x - m.x, z - m.z) < m.R * .6)) continue;
    MTS.push({ x, z, H, R: Rr, s: R() * 10 }); made++;
  }
  // mountains
  // หินแกรนิตสีเข้มแบบภูเขามักกะฮ์ และฝุ่นทรายที่เชิงเขา
  const pos = [], col = [], RINGS = 14, SEG = 40, cDark = new THREE.Color(0x3f362f), cMid = new THREE.Color(0x76654f), cSand = new THREE.Color(0xc4aa80), tmp = new THREE.Color();
  for (const m of MTS) {
    if (m.off) continue;
    const V = (i, j) => { if (i === 0) return [m.x, m.H, m.z, 0]; const u = i / RINGS, a = j / SEG * Math.PI * 2, Re = m.R * mtN(m, a) * u; return [m.x + Math.cos(a) * Re, mtP(m, a, u), m.z + Math.sin(a) * Re, u]; };
    const push = v => { pos.push(v[0], v[1], v[2]); const n = .5 + .5 * Math.sin(v[0] * .031 + v[2] * .022) * Math.cos(v[2] * .017 - v[0] * .009); tmp.copy(cDark).lerp(cMid, clamp(n * .9 + v[1] / 900, 0, 1)).lerp(cSand, clamp((v[3] - .72) / .28, 0, 1) * .85); col.push(tmp.r, tmp.g, tmp.b); };
    for (let i = 0; i < RINGS; i++) for (let j = 0; j < SEG; j++) { const a = V(i, j), b = V(i, j + 1), c = V(i + 1, j), d = V(i + 1, j + 1); if (i === 0) { push(a); push(d); push(c); } else { push(a); push(d); push(c); push(a); push(b); push(d); } }
  }
  const mg = new THREE.BufferGeometry(); mg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); mg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); mg.computeVertexNormals();
  mesh(fb, mg, MAT.rock);
  const gGeo = new THREE.PlaneGeometry(70000, 70000, 140, 140).rotateX(-Math.PI / 2);
  { const p = gGeo.attributes.position, gc = new Float32Array(p.count * 3); for (let i = 0; i < p.count; i++) { const x = p.getX(i) + 6000, z = p.getZ(i) + 1500, n = .5 + .25 * Math.sin(x * .0011 + 1.3) * Math.cos(z * .0013) + .25 * Math.sin(x * .0043 - z * .0037); gc[i * 3] = .9 + n * .14; gc[i * 3 + 1] = .87 + n * .13; gc[i * 3 + 2] = .82 + n * .12; } gGeo.setAttribute('color', new THREE.BufferAttribute(gc, 3)); }
  MAT.sand.vertexColors = true; MAT.sand.needsUpdate = true;
  const ground = mesh(fb, gGeo, MAT.sand, 6000, -.05, 1500); ground.receiveShadow = true;
  // ถนนหลักนอกเมือง (ในรัศมี 1.45 กม. ใช้ถนนจริงจากแผนที่แทน)
  const CITY_R = 1450;
  for (const r of ROADS) for (let k = 0; k < r.length - 1; k++) {
    let [ax, az] = r[k], [bx, bz] = r[k + 1]; const da = Math.hypot(ax, az), db = Math.hypot(bx, bz);
    if (da < CITY_R && db < CITY_R) continue;
    if (da < CITY_R || db < CITY_R) { let lo = 0, hi = 1; for (let i = 0; i < 24; i++) { const t = (lo + hi) / 2, x = ax + (bx - ax) * t, z = az + (bz - az) * t; if ((Math.hypot(x, z) < CITY_R) === (da < CITY_R)) lo = t; else hi = t; } const x = ax + (bx - ax) * lo, z = az + (bz - az) * lo; if (da < CITY_R) { ax = x; az = z; } else { bx = x; bz = z; } }
    obox(fb, ax, az, bx, bz, 24, .05, .03, MAT.road).receiveShadow = true;
  }
  HR.buildHaram(hctx()); buildKaaba(fb, true); buildDetails(); buildCrowds(); buildHallPeople();
  const os = buildOutskirts({ fb, rng, ground: fbGround, roadD, addAABB, inPoly, windowMat: MAT.build, minR: CITY_R }); console.info('outskirts:', JSON.stringify(os));
}
// ผู้คนนั่งอ่านอัลกุรอาน/ละหมาดในโถงฮะรอม (ไม่เคลื่อนที่)
function buildHallPeople() {
  const L1 = PE.crowdLooks(false), looks = [...L1.men.map(l => ({ ...l, ihram: false, cloth: '#f4f3ee', cap: true })), ...L1.women], R = rng(21), spots = [];
  for (let k = 0; k < 900 && spots.length < 260; k++) {
    const x = -244 + R() * 344, z = -324 + R() * 520;
    if (!inPoly(x, z) || inPoly(x, z, HR.C0) || distToPolyEdge(x, z) < 4) continue;
    const fx = ((x + 244) / 11) % 1, fz = ((z + 324) / 11) % 1; if (Math.abs(fx - .5) > .32 || Math.abs(fz - .5) > .32) continue;
    spots.push([x, .1, z, Math.atan2(-x, -z)]);
  }
  LF.createStill(fb, looks, spots);
}
// หลังโหลดแผนที่จริงของเมืองเสร็จ
function afterSiteBuilt(id, st) {
  if (id === 'makkah') {
    buildClockFaces(st.clock);
    HR.buildLampPosts(hctx(), (x, z) => !inPoly(x, z) && distToPolyEdge(x, z) > 20 && distToPolyEdge(x, z) < 46 && masaLat(x, z) > 32 && !st.blocked(x, z, 3) && roadD(x, z) > 16 && Math.hypot(x - BARBER[0], z - BARBER[1]) > 40);
  }
  setNight(engine.night);
  for (const L of LABELS) if (L.site === id && engine.mode === 'fallback') { const g = st.C.ground(L.x, L.z); L.sp.position.y = Math.max(L.baseY, g + L.rel); L.baseY = L.sp.position.y; }
  H && H.attribution && engine.site === id && H.attribution('');
  console.info('site ready:', id, st.city ? st.city.count + ' buildings' : '', Math.round(performance.now() - st.t0) + 'ms');
}
export function ensureSite(id) {
  if (engine.mode !== 'fallback') return null;
  if (id === 'makkah' && !fbBuilt) { buildFallback(); setNight(engine.night); }
  if (SITE[id]) return SITE[id];
  const st = SITE[id] = { state: 'loading', t0: performance.now() };
  SITEB.loadSite(id, {
    group: id === 'makkah' ? cityG : siteG[id], layer: id === 'makkah' ? 'world' : id, addWall, addRing, nightU, rockMat: MAT.rock, plazaMat: HR.haramMats(hctx()).plaza,
    makkah: { fbGround, inPoly, distToPolyEdge, masaLat }
  }).then(S => { Object.assign(st, S); st.state = 'ready'; afterSiteBuilt(id, st); H && H.refresh && H.refresh(); })
    .catch(e => { console.error('โหลดเมืองไม่สำเร็จ', id, e); st.state = 'error'; H && H.toast && H.toast('โหลดแผนที่เมืองไม่สำเร็จ', '', String(e.message || e), 6000); });
  return st;
}
export const siteState = id => SITE[id] ? SITE[id].state : 'none';
export function cityMap(id, wide) { const st = SITE[id]; if (!st || st.state !== 'ready') return null; if (!wide && st.minimapWide && st.minimap) { const b = st.minimap.bbox; if (P.x < b[0] || P.x > b[2] || P.z < b[1] || P.z > b[3]) return st.minimapWide; } return (wide && st.minimapWide) || st.minimap || null; }
function minaret(parent, x, z, H, layer) { HR.minaret(hctx(), parent, x, z, H, layer); }
function buildKaaba(parent, full) {
  const g = new THREE.Group(); g.rotation.y = Math.PI / 4; parent.add(g);
  const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; g.add(m); return m; };
  add(new THREE.BoxGeometry(12.9, .5, 12.9), MAT.marble, 0, .25, 0);
  add(new THREE.BoxGeometry(12, 13, 12), MAT.kiswa, 0, 6.5, 0);
  add(new THREE.BoxGeometry(12.14, 1.1, 12.14), MAT.band, 0, 9.3, 0);
  add(new THREE.BoxGeometry(.16, 3.2, 1.9), MAT.gold, 6.05, 3.8, 2.2);
  add(new THREE.BoxGeometry(.12, 4.3, 2.8), std(0x2a2116), 6.03, 3.9, 2.2);
  const bs = add(new THREE.SphereGeometry(.42, 16, 12), MAT.silver, 6.02, 1.5, 6.02); bs.scale.set(1, 1.3, .5); bs.rotation.y = Math.PI / 4;
  const a0 = Math.atan2(HIJR_C[1], HIJR_C[0]);
  for (let k = -10; k < 10; k++) { const a = a0 + k * 8 * D2R, b = a + 8 * D2R; obox(parent, HIJR_C[0] + Math.cos(a) * HIJR_R, HIJR_C[1] + Math.sin(a) * HIJR_R, HIJR_C[0] + Math.cos(b) * HIJR_R, HIJR_C[1] + Math.sin(b) * HIJR_R, .9, 1.3, 0, MAT.marble).castShadow = true; }
  box(parent, 2.6, .4, 2.6, MAT.marble, MAQAM[0], .2, MAQAM[1], Math.PI / 4);
  mesh(parent, new THREE.CylinderGeometry(1.05, 1.05, 2, 12), std(0xd8b864, { transparent: true, opacity: .7, metalness: .6, roughness: .2 }), MAQAM[0], 1.4, MAQAM[1]);
  mesh(parent, new THREE.SphereGeometry(1.05, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), MAT.gold, MAQAM[0], 2.4, MAQAM[1]);
  obox(parent, 10, 0, 55, 0, .45, .02, .15, std(0xc9c3b6));
  box(parent, .4, 1.2, .6, MAT.green, 56, 5, 0);
}
const KAABA_WALLS = (() => { const c = [[9, 0], [0, -9], [-9, 0], [0, 9]]; for (let k = 0; k < 4; k++) addWall(c[k][0], c[k][1], c[(k + 1) % 4][0], c[(k + 1) % 4][1], 0, 'kaaba'); addRing(MAQAM[0], MAQAM[1], 1.5, 8, 'kaaba'); return true; })();
export const COOLERS = [];
function buildCoolers(parent) {
  const g1 = new THREE.CylinderGeometry(.34, .34, 1.1, 16), g2 = new THREE.SphereGeometry(.34, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  for (let k = 0; k < 16; k++) {
    const a = (k + .5) / 16 * Math.PI * 2, x = Math.cos(a) * 51, z = Math.sin(a) * 51;
    const grp = new THREE.Group(); grp.position.set(x, 0, z); parent.add(grp);
    const b = mesh(grp, g1, MAT.silver, 0, .55, 0); b.castShadow = true; mesh(grp, g2, MAT.silver, 0, 1.1, 0);
    COOLERS.push({ x, z, obj: grp, grounded: false });
  }
}
function buildMasa(parent) {
  const { L, d, e } = MASA, S0 = SAFA;
  const at = (t, lat, ex) => [S0[0] + d[0] * (t * L + (ex || 0)) + e[0] * lat, S0[1] + d[1] * (t * L + (ex || 0)) + e[1] * lat];
  const a = at(0, 0, -12), b = at(1, 0, 12);
  obox(parent, a[0], a[1], b[0], b[1], 40, .06, .07, MAT.masa).receiveShadow = true;
  obox(parent, a[0], a[1], b[0], b[1], 42, 1, 14, MAT.roof);
  const l1 = at(.03, 0), l2 = at(.97, 0); obox(parent, l1[0], l1[1], l2[0], l2[1], .35, .02, .14, std(0xbdb6a8));
  const total = L + 24; let cur = 0;
  // ผนังด้านนอก หลังคา และโดมศ็อฟา/มัรวะฮ์
  HR.buildMasaExterior(hctx(), parent, at);
  // ฝั่งตะวันตก (ด้านมัสยิด) เป็นแนวเสาพร้อมช่องเปิด
  const W = s => at(0, -20, -12 + s); cur = 0;
  for (let k = 0; k < 8; k++) { const s0 = 12 + (.08 + k * .12) * L - 12; const p = W(cur), q = W(s0); if (s0 > cur) wall(parent, p[0], p[1], q[0], q[1], 16, MAT.wall, 2, 'masa-w'); cur = s0 + 24; }
  { const p = W(cur), q = W(total); wall(parent, p[0], p[1], q[0], q[1], 16, MAT.wall, 2, 'masa-w'); }
  for (let s = .30 * L; s <= .47 * L; s += 6) { const p = at(0, -19, s), q = at(0, 19, s); obox(parent, p[0], p[1], q[0], q[1], .5, .3, 13.2, MAT.green); }
  for (const t of [.30, .47]) for (const lat of [-19.2, 19.2]) { const p = at(t, lat); box(parent, .5, 12, .5, MAT.green, p[0], 6, p[1]); }
  const lamp = new THREE.MeshBasicMaterial({ color: 0xfff6e0 });
  for (let s = 0; s < L; s += 18) { const p = at(0, 0, s); box(parent, 30, .15, .6, lamp, p[0], 13.3, p[1], Math.atan2(-d[1], d[0]) + Math.PI / 2); }
  for (const h of [SAFA, MARWA]) { const r = mesh(parent, new THREE.IcosahedronGeometry(7, 1), MAT.hill, h[0], 1.2, h[1]); r.scale.set(1, .42, 1); r.castShadow = r.receiveShadow = true; addRing(h[0], h[1], 6, 8, 'masa'); }
  // ผนังปิดทึบ ใช้เฉพาะตอนอยู่ในมัสอาบนแผนที่จริง (ด้านนอกไม่มีฉากให้เดินต่อ)
  const c1 = at(0, -21.2, -12), c2 = at(1, -21.2, 12), c3 = at(0, 21.2, -12), c4 = at(1, 21.2, 12);
  parent.userData.closers = [obox(parent, c1[0], c1[1], c2[0], c2[1], .5, 16, 0, MAT.wall), obox(parent, c3[0], c3[1], c4[0], c4[1], .5, 16, 0, MAT.wall)];
  addWall(c1[0], c1[1], c2[0], c2[1], .4, 'masa-closed'); addWall(c3[0], c3[1], c4[0], c4[1], .4, 'masa-closed');
}
const HANDS = [];
// หน้าปัดนาฬิกา 4 ด้านบนตัวหอนาฬิกาจริง (ตัวอาคารมาจากข้อมูลแผนที่ที่มีความสูงแต่ละชั้น)
function buildClockFaces(c) {
  const cx = c.x, tz = c.z, y = c.y, off = c.half + .4, R = Math.min(21.5, c.half * .82);
  const faceMat = new THREE.MeshBasicMaterial({ color: 0xf4f6f0 }), ringMat = new THREE.MeshBasicMaterial({ color: 0x2e8b57 }), handMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
  [[0, off, 0], [0, -off, Math.PI], [off, 0, Math.PI / 2], [-off, 0, -Math.PI / 2]].forEach(([ox, oz, ry]) => {
    const f = new THREE.Group(); f.position.set(cx + ox, y, tz + oz); f.rotation.y = ry; cityG.add(f);
    f.add(new THREE.Mesh(new THREE.CircleGeometry(R, 48), faceMat));
    const ring = new THREE.Mesh(new THREE.RingGeometry(R, R * 1.09, 48), ringMat); ring.position.z = .05; f.add(ring);
    const hg = new THREE.BoxGeometry(R * .075, R * .5, .3); hg.translate(0, R * .25, 0); const mg = new THREE.BoxGeometry(R * .05, R * .84, .3); mg.translate(0, R * .42, 0);
    const hh = new THREE.Mesh(hg, handMat), mm = new THREE.Mesh(mg, handMat); hh.position.z = .3; mm.position.z = .4; f.add(hh); f.add(mm); HANDS.push([hh, mm]);
  });
  updateClockHands(); setInterval(updateClockHands, 30000);
}
function updateClockHands() {
  let h = 0, m = 0;
  try { const p = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Riyadh' }).formatToParts(new Date()); h = +p.find(x => x.type === 'hour').value; m = +p.find(x => x.type === 'minute').value; } catch (e) { }
  for (const [hh, mm] of HANDS) { hh.rotation.z = -((h % 12) + m / 60) / 12 * Math.PI * 2; mm.rotation.z = -m / 60 * Math.PI * 2; }
}
function buildDetails() {
  for (let k = 0; k < 4; k++) { const x = BARBER[0] + 8 + k * 9, z = BARBER[1] - 14; box(fb, 7, 4, 6, MAT.stone, x, 2, z); box(fb, 7.2, .8, .3, MAT.green, x, 3.6, z + 3.1); addAABB(x - 3.5, z - 3, x + 3.5, z + 3); }
  const mx = 25, mz = -1061;
  [[-135, -120, 135, -120], [135, -120, 135, 120], [135, 120, -135, 120], [-135, 120, -135, 10], [-135, -10, -135, -120]].forEach(([a, b, c, d]) => wall(fb, mx + a, mz + b, mx + c, mz + d, 3, MAT.stone, 1.5));
  const o = new THREE.Object3D(), rr = rng(9);
  const gm = new THREE.InstancedMesh(new THREE.BoxGeometry(.5, .35, 1.1), MAT.stone, 700);
  for (let k = 0; k < 700; k++) { o.position.set(mx - 125 + rr() * 250, .17, mz - 110 + rr() * 220); o.rotation.y = rr() * .2; o.updateMatrix(); gm.setMatrixAt(k, o.matrix); }
  fb.add(gm);
  const mosqueAt = (x, z, w, d, mins) => { box(fb, w, 16, d, MAT.wall, x, 8, z); addAABB(x - w / 2, z - d / 2, x + w / 2, z + d / 2); mesh(fb, new THREE.SphereGeometry(Math.min(w, d) * .18, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), MAT.marble, x, 16, z); mins.forEach(([dx, dz]) => minaret(fb, x + dx, z + dz, 60)); };
  mosqueAt(-3637, -5131, 70, 70, [[-40, 40], [40, 40]]);
  mosqueAt(11431, 4301, 90, 50, [[-50, 30], [50, 30]]);
  mosqueAt(6604, 877, 100, 100, [[-55, -55], [55, -55], [-55, 55], [55, 55]]);
  const jr = MTS[3]; box(fb, 1.6, 8, 1.6, MAT.marble, jr.x, jr.H + 4, jr.z);
  const ja = -.4, jc = [4819, -22], ux = Math.cos(ja), uz = Math.sin(ja);
  for (const y of [10, 20, 30]) obox(fb, jc[0] - ux * 475, jc[1] - uz * 475, jc[0] + ux * 475, jc[1] + uz * 475, 70, 1.5, y, MAT.stone);
  const tg = new THREE.ConeGeometry(3.4, 3.2, 4); tg.translate(0, 1.6, 0); const tpos = [];
  for (let x = 5500; x < 8300; x += 34) for (let z = -350; z < 1900; z += 34) { const dx = (x - 6900) / 1350, dz = (z - 700) / 950; if (dx * dx + dz * dz > 1 || fbGround(x, z) > .2 || roadD(x, z) < 22) continue; tpos.push([x, z]); }
  const tm = new THREE.InstancedMesh(tg, MAT.tent, tpos.length);
  tpos.forEach(([x, z], k) => { o.position.set(x, 0, z); o.rotation.y = Math.PI / 4; o.updateMatrix(); tm.setMatrixAt(k, o.matrix); }); fb.add(tm);
  const trg = new THREE.IcosahedronGeometry(4, 0); trg.translate(0, 5, 0); const trees = [];
  for (let k = 0; k < 900 && trees.length < 520; k++) { const a = rr() * Math.PI * 2, d = 250 + rr() * 2100, x = 16364 + Math.cos(a) * d, z = 7475 + Math.sin(a) * d; if (fbGround(x, z) > .2 || roadD(x, z) < 20) continue; trees.push([x, z]); }
  const trm = new THREE.InstancedMesh(trg, MAT.tree, trees.length);
  trees.forEach(([x, z], k) => { o.position.set(x, 0, z); o.rotation.y = 0; o.scale.setScalar(.8 + rr() * .6); o.updateMatrix(); trm.setMatrixAt(k, o.matrix); }); fb.add(trm);
}
// ฝูงชนแบบการ์ตูน: หลายแบบ (ชาย/หญิง/เด็ก สีผิวและทรงผมต่างกัน) แต่ละแบบเป็น InstancedMesh เดียว
function buildCrowds() {
  const mat = PE.crowdMaterial(), L1 = PE.crowdLooks(true), L0 = PE.crowdLooks(false);
  const variants = [
    ...L1.men.map(l => ({ l, kind: 'tawaf', w: 9 })), ...L0.men.map(l => ({ l, kind: 'sai', w: 9 })),
    ...L1.women.map(l => ({ l, kind: 'both', w: 9 })), ...L1.kids.map(l => ({ l, kind: 'both', w: 3 }))
  ];
  const pick = kind => { const list = variants.filter(v => v.kind === kind || v.kind === 'both'), tot = list.reduce((a, v) => a + v.w, 0); let r = Math.random() * tot; for (const v of list) { r -= v.w; if (r <= 0) return v; } return list[0]; };
  for (let k = 0; k < 320; k++) AGENTS.push({ kind: 'tawaf', a: Math.random() * Math.PI * 2, r: 16 + Math.random() * 38, v: .75 + Math.random() * .55, vr: pick('tawaf') });
  for (let k = 0; k < 140; k++) AGENTS.push({ kind: 'sai', t: Math.random(), lane: k % 2, lat: (k % 2 ? 9 : -9) + (Math.random() - .5) * 14, v: (.85 + Math.random() * .7) / MASA.L, vr: pick('sai') });
  for (const v of variants) {
    const mine = AGENTS.filter(a => a.vr === v); if (!mine.length) continue;
    const geo = PE.mergedFigure(v.l), ph = new Float32Array(mine.length);
    mine.forEach((a, i) => { a.slot = i; ph[i] = Math.random() * 6.28; });
    geo.setAttribute('aPhase', new THREE.InstancedBufferAttribute(ph, 1));
    const im = new THREE.InstancedMesh(geo, mat, mine.length); im.castShadow = false; im.receiveShadow = true; im.frustumCulled = false;
    v.mesh = im; fb.add(im); crowdMeshes.push(im);
  }
}
const tmpO = new THREE.Object3D();
function updateCrowds(dt) {
  if (!crowdMeshes.length || !fb.visible) return;
  for (const p of AGENTS) {
    if (p.kind === 'tawaf') { p.a += p.v / p.r * dt; tmpO.position.set(Math.cos(p.a) * p.r, .2, -Math.sin(p.a) * p.r); tmpO.rotation.y = Math.atan2(-Math.sin(p.a), -Math.cos(p.a)); }
    else { p.t += p.v * dt * (p.lane ? -1 : 1); if (p.t > 1.02) p.t = -.02; if (p.t < -.02) p.t = 1.02; const s = p.t * MASA.L; tmpO.position.set(SAFA[0] + MASA.d[0] * s + MASA.e[0] * p.lat, .14, SAFA[1] + MASA.d[1] * s + MASA.e[1] * p.lat); tmpO.rotation.y = p.lane ? Math.atan2(-MASA.d[0], -MASA.d[1]) : Math.atan2(MASA.d[0], MASA.d[1]); }
    tmpO.updateMatrix(); p.vr.mesh.setMatrixAt(p.slot, tmpO.matrix);
  }
  for (const m of crowdMeshes) m.instanceMatrix.needsUpdate = true;
}
/* =============== real 3D map (Google / Cesium) =============== */
let tiles = null, geo = null, reorient = null, tilesErr = 0, tilesLoaded = 0;
export async function initMap() {
  const prov = CFG.mapProvider, key = prov === 'google' ? CFG.googleApiKey : prov === 'cesium' ? CFG.cesiumIonToken : '';
  // ไม่มีคีย์: ใช้ฉากที่สร้างจากข้อมูลแผนที่ (สร้างเมื่อเข้าเมืองนั้นครั้งแรก)
  if (!key) { engine.mode = 'fallback'; if (engine.view === 'world') ensureSite(engine.site); setNight(engine.night); console.info('map: no key, using built-in scene'); return 'fallback'; }
  try {
    const lib = await import('3d-tiles-renderer');
    const pl = await import('3d-tiles-renderer/plugins');
    tiles = new lib.TilesRenderer();
    if (prov === 'google') tiles.registerPlugin(new pl.GoogleCloudAuthPlugin({ apiToken: key, autoRefreshToken: false }));
    else tiles.registerPlugin(new pl.CesiumIonAuthPlugin({ apiToken: key, assetId: String(CFG.cesiumAssetId || '2275207'), autoRefreshToken: true }));
    const draco = new DRACOLoader(); draco.setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/libs/draco/gltf/');
    tiles.registerPlugin(new pl.GLTFExtensionsPlugin({ dracoLoader: draco }));
    tiles.registerPlugin(new pl.TileCompressionPlugin());
    tiles.registerPlugin(new pl.TilesFadePlugin());
    const o = SITES.makkah.origin;
    reorient = new pl.ReorientationPlugin({ lat: o.lat * D2R, lon: o.lon * D2R, height: 0, recenter: true });
    tiles.registerPlugin(reorient);
    tiles.errorTarget = CFG.tileDetail || 12;
    geo = new THREE.Group(); geo.rotation.y = Math.PI + (CFG.mapRotationDeg || 0) * D2R; geo.add(tiles.group); wscene.add(geo);
    tiles.setCamera(wcam); tiles.setResolutionFromRenderer(wcam, renderer);
    tiles.addEventListener('load-model', ({ scene }) => { tilesLoaded++; scene.traverse(c => { if (c.material) { for (const m of [].concat(c.material)) m.toneMapped = false; } }); });
    tiles.addEventListener('load-error', ev => {
      tilesErr++; console.warn('3D tiles error', ev && (ev.error || ev));
      // ถ้ายังโหลดแผนที่ไม่ได้เลยสักชิ้น (เช่น คีย์ผิด) ให้สลับไปฉากสำรองทันที
      if (!tilesLoaded && engine.mode === 'tiles') { H.mapProblem && H.mapProblem(ev && ev.error ? String(ev.error.message || ev.error) : ''); engine.mode = 'switching'; setTimeout(switchToFallback, 0); }
    });
    engine.mode = 'tiles';
    setNight(engine.night);
    console.info('map: real 3D tiles started (' + prov + ')');
    if (/[?&]debug/.test(location.search)) { window.__tiles = tiles; const d = tiles.dispatchEvent.bind(tiles); window.__tileEvents = []; tiles.dispatchEvent = e => { window.__tileEvents.push(e.type); return d(e); }; }
    return 'tiles';
  } catch (e) {
    console.error('ไม่สามารถเริ่มแผนที่ 3 มิติจริง', e);
    H.mapProblem && H.mapProblem(String(e.message || e));
    engine.mode = 'fallback'; buildFallback(); setNight(engine.night); return 'fallback';
  }
}
export function fallbackNow() { if (tiles) { geo.visible = false; } engine.mode = 'fallback'; buildFallback(); fb.visible = true; setNight(engine.night); }
function switchToFallback() {
  console.info('map: switching to built-in scene');
  fallbackNow();
  if (tiles) { try { tiles.dispose(); } catch (e) { } geo.removeFromParent(); tiles = null; }
  if (engine.view === 'world') enterWorld(engine.site === 'makkah' ? engine.stage : 'explore', { site: 'makkah' });
  H.refresh && H.refresh();
}
const rc = new THREE.Raycaster(), DOWN = new THREE.Vector3(0, -1, 0), vtmp = new THREE.Vector3();
function tileGround(x, z, fromY) {
  if (!tiles || !geo.visible) return null;
  rc.set(vtmp.set(x, fromY, z), DOWN); rc.far = 6000;
  const hits = rc.intersectObject(tiles.group, true);
  return hits.length ? hits[0].point.y : null;
}
let groundRef = null;
function groundAt(x, z) {
  if (engine.mode === 'fallback') {
    const st = SITE[engine.site];
    if (engine.site === 'makkah') return Math.max(fbGround(x, z), st && st.T ? st.T.height(x, z) : 0, .2);
    if (!st || st.state !== 'ready') return null;
    return st.C.ground(x, z) + .08;
  }
  if (inside === 'masa') return groundRef ?? 0;
  let y = tileGround(x, z, (P.gy ?? 400) + 40);
  if (y === null) y = tileGround(x, z, 4000);
  return y;
}

/* =============== world stages =============== */
let inside = null; // 'masa' when inside the Mas'a interior on the real map
export function enterWorld(stage, opts = {}) {
  const newSite = opts.site || 'makkah'; if (newSite !== engine.site) groundRef = null;
  engine.stage = stage; engine.site = newSite;
  setView('world');
  if (engine.mode === 'fallback') { ensureSite(newSite); for (const k in siteG) siteG[k].visible = k === newSite; }
  const site = SITES[engine.site];
  if (engine.mode === 'tiles') {
    const o = site.origin; reorient.transformLatLonHeightToOrigin(o.lat * D2R, o.lon * D2R);
  }
  let spawn = site.spawn, yaw = site.yaw;
  if (stage === 'tawaf') { spawn = [0, 46]; yaw = 0; }
  if (stage === 'salah') { spawn = [8, 34]; yaw = 0; }
  if (stage === 'sai') { spawn = [SAFA[0] - 2 + MASA.d[0] * 12, SAFA[1] + MASA.d[1] * 12]; yaw = Math.atan2(-MASA.d[0], -MASA.d[1]); }
  if (stage === 'tahallul') { const t = .9 * MASA.L; spawn = [SAFA[0] + MASA.d[0] * t + MASA.e[0] * 34, SAFA[1] + MASA.d[1] * t + MASA.e[1] * 34]; yaw = Math.atan2(-(BARBER[0] - spawn[0]), -(BARBER[1] - spawn[1])); }
  if (opts.place) { const p = site.places.find(q => q.id === opts.place); if (p) { spawn = p.go; yaw = p.yaw ?? Math.atan2(-(p.x - p.go[0]), -(p.z - p.go[1])); } }
  teleport(spawn[0], spawn[1], yaw);
  if (/[?&]aerial/.test(location.search)) { cam.dist = 420; cam.pitch = .78; cam.yaw = -.55; }
  { const q = location.search, sp = q.match(/spawn=([-\d.]+),([-\d.]+)/), vw = q.match(/view=([-\d.]+),([-\d.]+),([-\d.]+)/); if (sp) { P.x = +sp[1]; P.z = +sp[2]; } if (vw) { cam.dist = +vw[1]; cam.pitch = +vw[2]; cam.yaw = +vw[3]; } }
  setInside(engine.mode === 'tiles' && stage === 'sai' ? 'masa' : null);
  S.tawaf.last = null;
  if (engine.mode === 'tiles') { fb.visible = false; }
  props.visible = engine.site === 'makkah';
  updateLabels(true);
}
function setInside(v) {
  inside = v;
  if (engine.mode === 'tiles') {
    geo.visible = v !== 'masa';
    masaGroup.visible = v === 'masa' || false;
    if (v === 'masa') masaGroup.position.y = groundRef ?? 0;
    layers.clear(); if (engine.site === 'makkah') layers.add('kaaba'); if (v === 'masa') { layers.add('masa'); layers.add('masa-closed'); }
  } else {
    masaGroup.visible = engine.site === 'makkah'; masaGroup.position.y = 0;
    layers.clear(); (engine.site === 'makkah' ? ['world', 'masa', 'masa-w', 'kaaba'] : [engine.site]).forEach(l => layers.add(l));
  }
  for (const c of masaGroup.userData.closers || []) c.visible = engine.mode === 'tiles';
}
export function teleport(x, z, yaw) {
  P.x = x; P.z = z; P.gy = null; cam.yaw = yaw ?? cam.yaw; P.heading = cam.yaw + Math.PI;
  S.tawaf.last = null; setAuto(false);
}
export function setView(v) {
  engine.view = v;
  const target = v === 'studio' ? studio.scene : wscene;
  target.add(avatar.group); companions.forEach(c => target.add(c.group));
  if (v === 'studio') { avatar.group.visible = true; avatar.group.position.set(0, 0, 0); avatar.setPose('stand'); layoutStudioCompanions(); }
}
export function worldPos() { return { x: P.x, z: P.z, yaw: cam.yaw }; }

/* =============== labels =============== */
const LABELS = [];
function makeLabel(text, sub, x, y, z, max) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 128; const g = c.getContext('2d');
  g.fillStyle = 'rgba(8,14,20,.82)'; g.beginPath(); g.roundRect ? g.roundRect(8, 16, 496, 96, 48) : g.rect(8, 16, 496, 96); g.fill();
  g.strokeStyle = 'rgba(61,211,154,.7)'; g.lineWidth = 3; g.stroke();
  g.fillStyle = '#ECF3F0'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '600 42px Anuphan, "Noto Sans Thai", sans-serif'; g.fillText(text, 256, sub ? 52 : 64, 460);
  if (sub) { g.fillStyle = '#E3B866'; g.font = '30px Amiri, serif'; g.fillText(sub, 256, 93, 460); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, toneMapped: false }));
  sp.position.set(x, y, z); sp.renderOrder = 5; wscene.add(sp);
  const L = { sp, max: max || 30000, x, z, baseY: y, site: 'makkah', grounded: false }; LABELS.push(L); return L;
}
export function buildLabels() {
  const LH = { greenDome: 37, rawdah: 4.2, dome: 46, qibli: 30, kas: 4.5, chain: 18, marwani: 7, nabawi: 40, buraq: 22, shuhada: 26, quba: 30, qiblatain: 26 };
  for (const s of Object.values(SITES)) for (const p of s.places) {
    const tall = LH[p.id] ?? ((p.id === 'safa' || p.id === 'marwa') ? 9 : p.id === 'clock' ? 640 : p.id === 'nur' ? 450 : p.id === 'thawr' ? 520 : p.r > 400 ? 120 : p.r > 100 ? 60 : 16);
    const L = makeLabel(p.th, p.ar, p.x, tall, p.z, p.r < 40 ? 600 : 40000); L.site = s.id; L.rel = tall; L.id = p.id;
  }
  makeLabel('ฮะญัรุลอัสวัด · แนวเริ่มฏอวาฟ', '', 15, 3.4, 0, 160).rel = 3.4;
  makeLabel('มะกอมอิบรอฮีม', '', MAQAM[0], 4.8, MAQAM[1], 160).rel = 4.8;
  makeLabel('ฮิจร์อิสมาอีล', '', -11, 3.2, -11, 160).rel = 3.2;
  makeLabel('ร้านตัดผม', '', BARBER[0] + 20, 8, BARBER[1] - 14, 700).rel = 8;
}
function groundLabels() {
  if (engine.mode !== 'tiles' || inside === 'masa') return;
  let n = 0;
  for (const L of LABELS) {
    if (L.grounded || L.site !== engine.site || n > 2) continue;
    if (Math.hypot(L.x - P.x, L.z - P.z) < 3000) { n++; const y = tileGround(L.x, L.z, 4000); if (y !== null) { L.sp.position.y = y + L.rel; L.grounded = true; continue; } }
    if (groundRef !== null) L.sp.position.y = groundRef + L.rel;
  }
}
function updateLabels(reset) {
  for (const L of LABELS) {
    if (reset) { L.grounded = false; L.sp.position.y = L.baseY; }
    let vis = L.site === engine.site;
    if (vis && engine.mode === 'tiles') {
      if (inside === 'masa') { vis = L.id === 'safa' || L.id === 'marwa'; if (vis) L.sp.position.y = (groundRef ?? 0) + L.rel; }
      else if (!L.grounded && groundRef === null) vis = false;
    }
    const d = wcam.position.distanceTo(L.sp.position);
    L.sp.visible = vis && d < L.max;
    if (L.sp.visible) { const s = clamp(d * .05, 1.2, 1e5); L.sp.scale.set(s * 4, s, 1); }
  }
}

/* =============== input =============== */
const keys = {}; const inp = { jx: 0, jy: 0, run: false };
let auto = false;
export function setAuto(v) { auto = v; H && H.autoChanged && H.autoChanged(v); }
export function toggleAuto() { setAuto(!auto); }
export function setRun(v) { inp.run = v; }
// ซูม: ซูมเข้าจนสุดแล้วซูมต่อ = เข้ามุมมองสายตา, ซูมออกจากมุมมองสายตา = กลับมุมมองบุคคลที่สาม
export function zoomBy(f) {
  if (engine.view === 'studio') { studio.zoom = clamp(studio.zoom * f, .55, 1.8); return; }
  if (cam.fp) { if (f > 1) { cam.zacc *= f; if (cam.zacc > 1.18) setFP(false); } else cam.zacc = 1; return; }
  if (f < 1 && cam.dist <= 2.21) { cam.zacc /= f; if (cam.zacc > 1.18) setFP(true); return; }
  cam.zacc = 1; cam.dist = clamp(cam.dist * f, 2.2, 650);
}
export function setFP(v) {
  cam.fp = !!v; cam.zacc = 1;
  if (cam.fp) cam.pitch = clamp(cam.pitch, -.2, .15); else { cam.dist = Math.max(cam.dist, 3.4); cam.pitch = clamp(cam.pitch, .12, 1.35); }
  H && H.fpChanged && H.fpChanged(cam.fp);
}
export const toggleFP = () => setFP(!cam.fp);
export const isFP = () => cam.fp;
const ptrs = new Map(); let pinch = 0;
function bindInput() {
  if (/[?&]debug/.test(location.search)) { window.__keys = keys; window.__eng = engine; window.__P = P; window.__r = renderer; window.__sun = sun; window.__wscene = wscene; window.__siteState = () => SITE[engine.site] ? SITE[engine.site].state : 'none'; window.__SITE = SITE; window.__cam = cam; }
  // อ่านจากตำแหน่งปุ่ม (e.code) ไม่ใช่ตัวอักษร เพื่อให้ใช้ได้ทั้งแป้นพิมพ์ไทยและอังกฤษ
  const KEYMAP = { KeyW: 'w', KeyA: 'a', KeyS: 's', KeyD: 'd', ArrowUp: 'arrowup', ArrowDown: 'arrowdown', ArrowLeft: 'arrowleft', ArrowRight: 'arrowright', ShiftLeft: 'shift', ShiftRight: 'shift', KeyE: 'e', KeyR: 'r', KeyT: 't', KeyF: 'f', KeyM: 'm', KeyV: 'v', PageUp: 'pageup', PageDown: 'pagedown', Space: ' ' };
  const keyOf = e => KEYMAP[e.code] || (e.key || '').toLowerCase();
  window.addEventListener('keydown', e => {
    if (e.target.matches && e.target.matches('input,textarea,select')) return;
    if (H.modalOpen && H.modalOpen()) return;
    const k = keyOf(e); keys[k] = true; keys.shift = e.shiftKey || k === 'shift';
    if (engine.view !== 'world') return;
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'w', 'a', 's', 'd'].includes(k)) e.preventDefault();
    if (e.repeat) return;
    if (k === 'e' && action) action.fn();
    if (k === 'r' && action && action.alt) action.alt.fn();
    if (k === 't') H.talbiyah();
    if (k === 'f') toggleAuto();
    if (k === 'm') H.openMap();
    if (k === 'v') toggleFP();
  });
  window.addEventListener('keyup', e => { keys[keyOf(e)] = false; if (!e.shiftKey) keys.shift = false; });
  window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
  // ลากหนึ่งนิ้ว/เมาส์ = หมุนกล้องซ้ายขวา และเงย/ก้มมอง, สองนิ้ว = ถ่าง/หุบเพื่อซูม
  const pd = () => { const [a, b] = [...ptrs.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
  canvas.addEventListener('pointerdown', e => { ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); try { canvas.setPointerCapture(e.pointerId); } catch (_) { } pinch = ptrs.size === 2 ? pd() : 0; });
  canvas.addEventListener('pointermove', e => {
    const p = ptrs.get(e.pointerId); if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
    if (ptrs.size >= 2) { const d = pd(); if (pinch > 20 && d > 20) zoomBy(clamp(pinch / d, .8, 1.25)); pinch = d; return; }
    if (engine.view === 'studio') { studio.spin = false; studio.yawT += dx * .012; return; }
    const sens = e.pointerType === 'touch' ? 1.35 : 1;
    cam.yaw -= dx * .0062 * sens; cam.pitch = clamp(cam.pitch + dy * .0045 * sens, cam.fp ? -1.3 : -.72, 1.35);
  });
  const end = e => { ptrs.delete(e.pointerId); pinch = ptrs.size === 2 ? pd() : 0; };
  canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end); canvas.addEventListener('lostpointercapture', end);
  canvas.addEventListener('wheel', e => { e.preventDefault(); zoomBy(1 + Math.sign(e.deltaY) * .1); }, { passive: false });
}
export function bindJoystick(joy) {
  const knob = joy.querySelector('.knob'); let id = null;
  const move = e => { const r = joy.getBoundingClientRect(); let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2); const m = r.width / 2, l = Math.hypot(dx, dy); if (l > m) { dx *= m / l; dy *= m / l; } inp.jx = dx / m; inp.jy = dy / m; knob.style.transform = `translate(${dx}px,${dy}px)`; };
  joy.addEventListener('pointerdown', e => { id = e.pointerId; try { joy.setPointerCapture(id); } catch (_) { } move(e); });
  joy.addEventListener('pointermove', e => { if (e.pointerId === id) move(e); });
  const end = e => { if (e.pointerId !== id) return; id = null; inp.jx = inp.jy = 0; knob.style.transform = ''; };
  joy.addEventListener('pointerup', end); joy.addEventListener('pointercancel', end);
}

/* =============== rituals =============== */
let action = null, busy = null;
export const getAction = () => action;
export function doAction(alt) { if (!action) return; (alt ? action.alt : action)?.fn(); }
const inMasa = (x = P.x, z = P.z) => { const rx = x - SAFA[0], rz = z - SAFA[1], t = (rx * MASA.d[0] + rz * MASA.d[1]) / MASA.L, lat = rx * MASA.e[0] + rz * MASA.e[1]; return { t, lat, inM: Math.abs(lat) < 21 && t > -.06 && t < 1.06 }; };
const inHijr = (x, z) => { const dx = x - HIJR_C[0], dz = z - HIJR_C[1]; return Math.hypot(dx, dz) < HIJR_R && (dx * -.7071 + dz * -.7071) > 0; };
export const insideMosque = () => inPoly(P.x, P.z) || inMasa().inM;
export function nearestCooler() { let b = null, bd = 1e9; for (const c of COOLERS) { const d = Math.hypot(c.x - P.x, c.z - P.z); if (d < bd) { bd = d; b = c; } } return b; }
export function questTarget() {
  if (engine.site !== 'makkah') return null;
  switch (engine.stage) {
    case 'tawaf': return S.tawaf.started ? null : [26, 4];
    case 'salah': if (!S.salah.prayed) return [17, -17]; { const c = nearestCooler(); return c && S.salah.sips < 3 ? [c.x, c.z] : null; }
    case 'sai': return !S.sai.started ? [SAFA[0] - 1, SAFA[1] - 12] : (S.sai.heading === 1 ? [MARWA[0] + 1, MARWA[1] + 14] : [SAFA[0] - 1, SAFA[1] - 13]);
    case 'tahallul': return S.tahallul.done ? null : BARBER;
  }
  return null;
}
function findAction() {
  if (busy || engine.site !== 'makkah' || P.gy === null) return null;
  const st = engine.stage, male = S.profile.gender === 'm';
  if (st === 'tawaf' && S.tawaf.started && S.tawaf.rounds < 7) {
    const phi = Math.atan2(-P.z, P.x) / D2R, r = Math.hypot(P.x, P.z);
    if (r < 80 && Math.abs(phi) < 7 && S.tawaf.istLap !== S.tawaf.rounds) return { label: 'อิสติลาม', fn: () => { S.tawaf.istLap = S.tawaf.rounds; S.istilam++; H.toast('อิสติลาม', DUA.istilam.ar, 'ยกมือขวาไปทางฮะญัรุลอัสวัด แล้วเดินต่อโดยไม่หยุดขวางทาง', 3000); avatar.setPose('raise'); setTimeout(() => avatar.setPose('stand'), 900); } };
  }
  if (st === 'salah' && !S.salah.prayed) {
    const near = Math.hypot(P.x - MAQAM[0], P.z - MAQAM[1]) < 14 && Math.hypot(P.x, P.z) > 15;
    const under = engine.mode === 'fallback' && inPoly(P.x, P.z) && !inPoly(P.x, P.z, HR.C0);
    if (near || under) return { label: 'ละหมาดสุนัต 2 ร็อกอะฮ์', fn: () => { busy = { t: 0 }; } };
  }
  if (st === 'salah' && S.salah.prayed && S.salah.sips < 3) {
    const c = nearestCooler(); if (c && Math.hypot(c.x - P.x, c.z - P.z) < 3.5) return { label: `ดื่มน้ำซัมซัม อึกที่ ${S.salah.sips + 1}`, fn: () => {
      S.salah.sips++; H.toast(`ดื่มอึกที่ ${S.salah.sips}`, S.salah.sips === 3 ? DUA.zamzam.ar : 'بِسْمِ اللّٰهِ', S.salah.sips === 3 ? 'ขอดุอาอ์ตามที่ปรารถนา' : 'หันไปทางกิบลัต แล้วดื่มอีกอึก', 3000);
      if (S.salah.sips >= 3) H.stageDone('salah'); else H.refresh();
    } };
  }
  if (st === 'tahallul' && !S.tahallul.done && !insideMosque()) {
    const done = m => { S.tahallul.done = true; S.tahallul.method = m; H.stageDone('tahallul'); };
    if (male) return { label: 'โกนศีรษะ (ฮัลก์)', fn: () => done('halq'), alt: { label: 'ตัดผมให้สั้น (ตักศีร)', fn: () => done('taqsir') } };
    return { label: 'ตัดปลายผมประมาณหนึ่งข้อนิ้ว', fn: () => done('taqsir') };
  }
  return null;
}
let wrongT = 0, wrongShown = 0, hijrWarned = false;
function tawafTick(dt, now) {
  const T = S.tawaf, r = Math.hypot(P.x, P.z), phi = Math.atan2(-P.z, P.x) / D2R;
  if (T.rounds >= 7) return;
  if (r > 82) { T.last = null; H.duabar(''); H.status(T.started ? 'กลับเข้าลานมะฏอฟเพื่อฏอวาฟต่อ' : 'เดินเข้าไปในลานมะฏอฟ'); return; }
  if (T.last === null) { T.last = phi; return; }
  let dp = phi - T.last; if (dp > 180) dp -= 360; if (dp < -180) dp += 360;
  const prev = T.last; T.last = phi;
  if (!T.started) {
    H.status('เดินทวนเข็มนาฬิกาผ่านแนวไฟเขียว (ฮะญัรุลอัสวัด) เพื่อเริ่มนับรอบ');
    if (dp > 0 && prev < 0 && phi >= 0 && Math.abs(phi) < 45) { T.started = true; T.acc = 0; T.rounds = 0; T.bad = false; H.refresh(); H.toast('เริ่มฏอวาฟ', DUA.istilam.ar, 'ยกมือขวาไปทางฮะญัรุลอัสวัด แล้วเดินรอบแรก ให้กะอ์บะฮ์อยู่ซ้ายมือ'); }
    return;
  }
  T.acc += dp;
  if (dp < -.02) { wrongT += dt; if (wrongT > 1 && now - wrongShown > 6000) { wrongShown = now; H.toast('เดินผิดทิศ', '', 'ฏอวาฟต้องเดินทวนเข็มนาฬิกา ให้กะอ์บะฮ์อยู่ทางซ้ายมือ', 3000); } } else if (dp > 0) wrongT = 0;
  if (inHijr(P.x, P.z)) { T.bad = true; if (!hijrWarned) { hijrWarned = true; H.toast('คุณอยู่ในฮิจร์อิสมาอีล', '', 'พื้นที่นี้เป็นส่วนหนึ่งของกะอ์บะฮ์ รอบนี้จะไม่ถูกนับ ให้เดินอ้อมด้านนอก', 4500); } }
  if (prev < -90 && phi >= -90) H.toast('รุกนุลยะมานี', '', 'สัมผัสด้วยมือขวาถ้าทำได้ แล้วอ่าน ร็อบบะนา อาตินา… จนถึงฮะญัรุลอัสวัด', 3500);
  H.duabar(phi > -90 && phi < 0 ? 'rabbana' : '');
  const nr = Math.floor(T.acc / 360);
  if (nr > T.rounds) {
    if (T.bad) { T.acc -= 360; T.bad = false; hijrWarned = false; H.toast('รอบนี้ไม่นับ', '', 'เพราะเดินผ่านในฮิจร์อิสมาอีล เดินรอบนี้ใหม่โดยอ้อมด้านนอก', 5000); }
    else {
      T.rounds = nr; hijrWarned = false;
      if (T.rounds >= 7) { H.duabar(''); H.status(''); setAuto(false); H.stageDone('tawaf'); return; }
      H.toast(`ครบรอบที่ ${T.rounds}`, '', T.rounds === 3 && S.profile.gender === 'm' ? 'ตั้งแต่รอบที่ 4 เดินตามปกติ ไม่ต้องวิ่งเหยาะ' : 'อิสติลามที่ฮะญัรุลอัสวัด (กด E) แล้วเดินรอบต่อไป', 3500);
      H.refresh();
    }
  }
  H.status(`ฏอวาฟรอบที่ ${Math.min(7, T.rounds + 1)} จาก 7${S.profile.gender === 'm' && T.rounds < 3 ? ' · วิ่งเหยาะ (รอมัล)' : ''}${T.bad ? ' · อยู่ในฮิจร์ รอบนี้ไม่นับ' : ''}`);
}
let greenShown = -1;
function saiTick() {
  const A = S.sai, m = inMasa();
  if (A.laps >= 7) return;
  if (!m.inM) { H.status(A.started ? 'กลับเข้าทางเดินสะแอเพื่อเดินต่อ' : 'เข้าไปในทางเดินสะแอ (มัสอา)'); H.duabar(''); return; }
  if (!A.started) {
    H.status('ไปยืนที่เนินศ็อฟาเพื่อเริ่มสะแอ');
    if (m.t < .07) { A.started = true; A.heading = 1; H.refresh(); H.toast('เริ่มที่ศ็อฟา', DUA.safa.ar, 'หันไปทางกะอ์บะฮ์ ยกมือขอดุอาอ์ แล้วเดินไปมัรวะฮ์', 6000); }
    return;
  }
  if (A.heading === 1 && m.t > .93) {
    A.laps++;
    if (A.laps >= 7) { H.status(''); H.duabar(''); setAuto(false); H.stageDone('sai'); return; }
    A.heading = -1; H.refresh(); H.toast(`ถึงมัรวะฮ์ · ครบเที่ยวที่ ${A.laps}`, DUA.tahlil.ar, 'หันไปทางกะอ์บะฮ์ ขอดุอาอ์ แล้วเดินกลับไปศ็อฟา', 4500);
  } else if (A.heading === -1 && m.t < .07) {
    A.laps++; A.heading = 1; H.refresh(); H.toast(`ถึงศ็อฟา · ครบเที่ยวที่ ${A.laps}`, DUA.tahlil.ar, 'หันไปทางกะอ์บะฮ์ ขอดุอาอ์ แล้วเดินไปมัรวะฮ์', 4500);
  }
  const green = m.t > .30 && m.t < .47;
  if (green && greenShown !== A.laps) { greenShown = A.laps; if (A.laps < 2) H.toast('ช่วงไฟเขียว', '', S.profile.gender === 'm' ? 'ชายวิ่งเหยาะ (Shift) จนพ้นไฟเขียวอีกฝั่ง' : 'ผู้หญิงเดินตามปกติ', 2600); }
  H.duabar(m.t < .07 || m.t > .93 ? 'tahlil' : '');
  H.status(`สะแอเที่ยวที่ ${A.laps + 1} จาก 7 · ${A.heading === 1 ? 'ศ็อฟา → มัรวะฮ์' : 'มัรวะฮ์ → ศ็อฟา'}${green ? (S.profile.gender === 'm' ? ' · วิ่งเหยาะ' : ' · ช่วงไฟเขียว') : ''}`);
}
const PRAY = [['ยืนตรง · อัลฟาติฮะฮ์ และอัลกาฟิรูน', 2.4, 'stand'], ['รุกูอ์', 1.1, 'ruku'], ['สุญูด', 1.1, 'sujud'], ['นั่ง', .7, 'julus'], ['สุญูด', 1.1, 'sujud'],
  ['ร็อกอะฮ์ที่ 2 · อัลฟาติฮะฮ์ และอัลอิคลาศ', 2.4, 'stand'], ['รุกูอ์', 1.1, 'ruku'], ['สุญูด', 1.1, 'sujud'], ['นั่ง', .7, 'julus'], ['สุญูด', 1.1, 'sujud'], ['ตะชะฮ์ฮุด และให้สลาม', 2, 'julus']];
function prayTick(dt) {
  busy.t += dt; let acc = 0, cur = null;
  for (const s of PRAY) { if (busy.t < acc + s[1]) { cur = s; break; } acc += s[1]; }
  P.heading = Math.atan2(-P.x, -P.z);
  if (!cur) { busy = null; avatar.setPose('stand'); S.salah.prayed = true; H.status(''); H.refresh(); H.toast('ละหมาดเสร็จแล้ว', DUA.maqam.ar, 'ต่อไปเดินไปที่ถังน้ำซัมซัมรอบขอบลาน แล้วดื่ม 3 อึก', 5000); return; }
  H.status(cur[0]); avatar.setPose(cur[2]);
}
function autoDir() {
  const st = engine.stage, r = Math.hypot(P.x, P.z);
  if (st === 'tawaf' && r < 85 && S.tawaf.rounds < 7) {
    const phi = Math.atan2(-P.z, P.x), want = clamp(r, 24, 48), tx = -Math.sin(phi), tz = -Math.cos(phi), rx = P.x / (r || 1), rz = P.z / (r || 1), corr = clamp((want - r) * .15, -.6, .6);
    const vx = tx + rx * corr, vz = tz + rz * corr, l = Math.hypot(vx, vz); return [vx / l, vz / l];
  }
  if (st === 'sai' && inMasa().inM && S.sai.started && S.sai.laps < 7) {
    const end = S.sai.heading === 1 ? .97 : .03, lat = S.sai.heading === 1 ? -8 : 8;
    const gx = SAFA[0] + MASA.d[0] * end * MASA.L + MASA.e[0] * lat, gz = SAFA[1] + MASA.d[1] * end * MASA.L + MASA.e[1] * lat;
    const dx = gx - P.x, dz = gz - P.z, l = Math.hypot(dx, dz); return l > .5 ? [dx / l, dz / l] : null;
  }
  const t = questTarget(); if (!t) return null;
  const dx = t[0] - P.x, dz = t[1] - P.z, l = Math.hypot(dx, dz); return l < 2 ? null : [dx / l, dz / l];
}

// กันกล้องทะลุผนัง: ถ้ามีผนัง (ต่ำกว่าระดับหลังคา) อยู่ระหว่างตัวละครกับกล้อง ให้ดึงกล้องเข้ามา
function camClip(tx, tz, ty, ox, oy, oz) {
  let tmax = 1; if (oy > 0) tmax = Math.min(1, (26 - ty) / oy); if (tmax <= 0) return 1;
  const rx = ox * tmax, rz = oz * tmax, x0 = Math.min(tx, tx + rx), x1 = Math.max(tx, tx + rx), z0 = Math.min(tz, tz + rz), z1 = Math.max(tz, tz + rz);
  let best = 1; stamp++;
  for (let i = Math.floor((x0 - 3) / CELL); i <= Math.floor((x1 + 3) / CELL); i++) for (let j = Math.floor((z0 - 3) / CELL); j <= Math.floor((z1 + 3) / CELL); j++) {
    const list = grid.get(i + ',' + j); if (!list) continue;
    for (const s of list) {
      if (s.st === stamp || !layers.has(s.layer)) continue; s.st = stamp;
      const sx = s.bx - s.ax, sz = s.bz - s.az, den = rx * sz - rz * sx; if (Math.abs(den) < 1e-9) continue;
      const qx = s.ax - tx, qz = s.az - tz, a = (qx * sz - qz * sx) / den, b = (qx * rz - qz * rx) / den;
      if (a >= 0 && a <= 1 && b >= 0 && b <= 1) best = Math.min(best, a * tmax);
    }
  }
  if (best >= 1) return 1;
  const len = Math.hypot(ox, oz) || 1;
  return Math.max(.08, best - (s0 => s0)(1.2 / len));
}
/* =============== main loop =============== */
let last = performance.now(), uiT = 0, attrT = 0, worldWait = 0, zoneWarn = 0;
// พื้นที่ที่เปิดให้เดินได้ของแต่ละเมือง (วงกลม [x, z, รัศมี])
function inZone(x, z) { const zs = SITES[engine.site] && SITES[engine.site].zones; return !zs || zs.some(([cx, cz, r]) => Math.hypot(x - cx, z - cz) < r); }
const camPos = new THREE.Vector3();
// ถ้าเฟรมเรตต่ำต่อเนื่อง ลดความละเอียดภาพลงอัตโนมัติ
let slowT = 0, quality = 2;
function adaptQuality(dt) {
  if (engine.view !== 'world' || quality === 0) return;
  slowT = dt > 1 / 24 ? slowT + dt : Math.max(0, slowT - dt * .5);
  if (slowT > 3) { slowT = 0; quality--; renderer.setPixelRatio(quality === 1 ? 1 : .75); resize(); console.info('quality lowered to', quality); }
}
function loop(now) {
  requestAnimationFrame(loop);
  engine.frames = (engine.frames || 0) + 1;
  // จำกัด dt ที่ 0.1 วินาที: ถ้าเครื่องช้า ตัวละครยังเดินด้วยความเร็วจริง (ไม่สโลว์)
  const dt = Math.min(.1, (now - last) / 1000); last = now;
  adaptQuality(dt);
  if (engine.view === 'studio') { studioFrame(dt); return; }
  worldFrame(dt, now);
}
function worldFrame(dt, now) {
  PE.crowdTime.value += dt;
  updateCrowds(dt);
  const sst = engine.mode === 'fallback' ? SITE[engine.site] : null;
  if (sst && sst.state === 'ready') sst.update(dt, P);
  if (keys.arrowleft) cam.yaw += 1.8 * dt; if (keys.arrowright) cam.yaw -= 1.8 * dt;
  if (keys.pageup) cam.pitch = clamp(cam.pitch - 1.1 * dt, cam.fp ? -1.3 : -.72, 1.35); if (keys.pagedown) cam.pitch = clamp(cam.pitch + 1.1 * dt, cam.fp ? -1.3 : -.72, 1.35);
  let fx = ((keys.w || keys.arrowup) ? 1 : 0) - ((keys.s || keys.arrowdown) ? 1 : 0) - inp.jy, sx = (keys.d ? 1 : 0) - (keys.a ? 1 : 0) + inp.jx;
  const f = [-Math.sin(cam.yaw), -Math.cos(cam.yaw)], rt = [Math.cos(cam.yaw), -Math.sin(cam.yaw)];
  let vx = f[0] * fx + rt[0] * sx, vz = f[1] * fx + rt[1] * sx, vl = Math.hypot(vx, vz);
  if (vl > 1) { vx /= vl; vz /= vl; vl = 1; }
  let speed = (keys.shift || inp.run) ? 7 : 1.9;
  if (vl > .05 && auto) setAuto(false);
  if (auto && !busy) { const v = autoDir(); if (v) { vx = v[0]; vz = v[1]; vl = 1; speed = 7; } else setAuto(false); }
  if (busy) { vl = 0; prayTick(dt); }
  const ready = P.gy !== null;
  if (!ready) H.status('');
  // ถ้าแผนที่จริงไม่ตอบกลับเลยภายใน 25 วินาที ให้ใช้ฉากสำรอง
  if (engine.mode === 'tiles' && !tilesLoaded) { if (!worldWait) worldWait = now; if (now - worldWait > 25000) { worldWait = 0; H.mapProblem && H.mapProblem('ไม่ได้รับข้อมูลแผนที่ภายในเวลาที่กำหนด'); engine.mode = 'switching'; setTimeout(switchToFallback, 0); } } else worldWait = 0;
  if (vl > .05 && ready) {
    const dist = speed * vl * dt; S.walked += dist;
    const steps = Math.ceil(dist / .25), mx = vx / vl, mz = vz / vl, px0 = P.x, pz0 = P.z;
    for (let k = 0; k < steps; k++) { P.x += mx * dist / steps; P.z += mz * dist / steps; collide(P, .35); }
    if (sst && sst.traffic) sst.traffic.push(P);
    // เขตที่ยังไม่เปิดให้บริการ: เดินออกนอกพื้นที่ที่สร้างจากแผนที่จริงไม่ได้
    if (engine.mode === 'fallback' && !inZone(P.x, P.z) && inZone(px0, pz0)) {
      P.x = px0; P.z = pz0; setAuto(false);
      if (now - zoneWarn > 5000) { zoneWarn = now; H.toast('พื้นที่นี้ยังไม่เปิดให้บริการ', '', 'เดินได้เฉพาะบริเวณที่สร้างเสร็จแล้ว กด M เปิดแผนที่เพื่อไปยังสถานที่อื่น', 4000); }
    }
    const target = Math.atan2(mx, mz); let dh = target - P.heading; while (dh > Math.PI) dh -= Math.PI * 2; while (dh < -Math.PI) dh += Math.PI * 2; P.heading += dh * Math.min(1, dt * 10);
  }
  const gy = groundAt(P.x, P.z);
  if (gy !== null) { P.gy = gy; if (engine.site === 'makkah' && Math.hypot(P.x, P.z) < 80 && inside !== 'masa' && engine.mode === 'tiles') groundRef = gy; }
  P.y = P.gy ?? 300;
  avatar.group.position.set(P.x, P.y, P.z); avatar.group.rotation.y = P.heading;
  avatar.update(dt, vl > .05 && ready ? speed * vl : 0);
  // companions follow
  companions.forEach((c, i) => {
    const back = 1.4 + i * .9, side = i === 0 ? -.8 : .8;
    const tx = P.x - Math.sin(P.heading) * back + Math.cos(P.heading) * side, tz = P.z - Math.cos(P.heading) * back - Math.sin(P.heading) * side;
    const g = c.group.position, dx = tx - g.x, dz = tz - g.z, d = Math.hypot(dx, dz);
    if (d > 8) { g.x = tx; g.z = tz; } else { g.x += dx * Math.min(1, dt * 4); g.z += dz * Math.min(1, dt * 4); }
    g.y = P.y; c.group.rotation.y = d > .05 ? Math.atan2(dx, dz) : P.heading; c.update(dt, d > .3 ? Math.min(7, d * 3) : 0);
  });
  // rituals
  if (engine.site === 'makkah' && ready) {
    if (engine.stage === 'tawaf') tawafTick(dt, now);
    else if (engine.stage === 'sai') saiTick();
    else if (!busy) { H.status(''); H.duabar(''); }
  }
  action = findAction(); H.prompt(action);
  // ground props on real map
  if (engine.mode === 'tiles' && props.visible) for (const c of COOLERS) if (!c.grounded && Math.hypot(c.x - P.x, c.z - P.z) < 150) { const y = tileGround(c.x, c.z, 4000); if (y !== null) { c.obj.position.y = y; c.grounded = true; } }
  // camera
  const tx = P.x, ty = P.y + 1.5, tz = P.z;
  let lx, ly, lz;
  if (cam.fp) {
    // มุมมองสายตา: กล้องอยู่ระดับตา หมุนมองได้รอบตัว เงย/ก้มได้
    avatar.group.visible = false;
    const cp = Math.cos(cam.pitch);
    camPos.set(P.x - Math.sin(cam.yaw) * .12, P.y + 1.62, P.z - Math.cos(cam.yaw) * .12);
    lx = camPos.x - Math.sin(cam.yaw) * cp; ly = camPos.y - Math.sin(cam.pitch); lz = camPos.z - Math.cos(cam.yaw) * cp;
  } else {
    avatar.group.visible = true;
    const p = cam.pitch, d = cam.dist * (p < 0 ? 1 + p * .5 : 1);
    let ox = Math.sin(cam.yaw) * Math.cos(p) * d, oy = Math.sin(p) * d, oz = Math.cos(cam.yaw) * Math.cos(p) * d;
    const roofY = engine.mode === 'fallback' ? (engine.site === 'makkah' ? ((inPoly(P.x, P.z) && !inPoly(P.x, P.z, HR.C0)) ? HR.HALL_H : inMasa().inM ? 14 : 0) : (sst && sst.state === 'ready' ? sst.ceil(P.x, P.z) : 0)) : inside === 'masa' ? 14 : 0;
    const relRoof = roofY ? roofY - P.y : 0;
    if (relRoof > 0 && oy > relRoof - 2.7) { const k = (relRoof - 2.7) / oy; if (k > 0) { ox *= k; oy *= k; oz *= k; } }
    // ผนังบังกล้อง: ดึงกล้องเข้าทันที แต่คลายออกช้า ๆ เพื่อไม่ให้ภาพกระตุก
    const kc = camClip(tx, tz, ty, ox, oy, oz);
    cam.k = kc < cam.k ? kc : cam.k + (kc - cam.k) * Math.min(1, dt * 2.5);
    ox *= cam.k; oy *= cam.k; oz *= cam.k;
    camPos.set(tx + ox, ty + oy, tz + oz);
    let lift = 0;
    if (engine.mode === 'fallback') { const gg = groundAt(camPos.x, camPos.z), g2 = (gg ?? fbGround(camPos.x, camPos.z)) + .45; if (camPos.y < g2) { lift = g2 - camPos.y; camPos.y = g2; } }
    if (p < 0) {
      // เงยหน้า: กล้องต่ำลงและหันมองขึ้นตามมุมที่ลาก
      const a = Math.min(1.2, -p * 1.65), hx = tx - camPos.x, hz = tz - camPos.z, hl = Math.hypot(hx, hz) || 1;
      lx = camPos.x + hx / hl * Math.cos(a) * 10; ly = camPos.y + Math.sin(a) * 10; lz = camPos.z + hz / hl * Math.cos(a) * 10;
    } else { lx = tx; ly = ty + lift * .6; lz = tz; }
  }
  wcam.position.copy(camPos); wcam.lookAt(lx, ly, lz);
  // sun follows player for crisp shadows
  // ขยายพื้นที่เงาตามระยะกล้อง เพื่อให้มองจากมุมสูงแล้วยังเห็นเงาอาคาร
  const ext = clamp(cam.dist * 1.4, 45, 480), sc = sun.shadow.camera;
  if (Math.abs(ext - sc.right) > 4) { sc.left = sc.bottom = -ext; sc.right = sc.top = ext; sc.far = 3000; sc.updateProjectionMatrix(); }
  sun.position.set(P.x + engine.sunDir.x * 900, P.y + engine.sunDir.y * 900, P.z + engine.sunDir.z * 900); sun.target.position.set(P.x, P.y, P.z);
  sky.position.copy(wcam.position);
  blob.visible = engine.mode === 'tiles' && inside !== 'masa' && ready; blob.position.set(P.x, P.y + .06, P.z);
  // target beam
  const t = questTarget();
  beam.visible = beamRing.visible = !!t && ready;
  if (t) { const by = engine.mode === 'fallback' ? (groundAt(t[0], t[1]) ?? 0) - .2 : inside === 'masa' ? (groundRef ?? 0) : (groundRef ?? P.y); beam.position.set(t[0], by + 30, t[1]); beamRing.position.set(t[0], by + .32, t[1]); beam.material.opacity = .16 + Math.sin(now / 400) * .06; }
  if (tiles && geo.visible) { tiles.setCamera(wcam); tiles.setResolutionFromRenderer(wcam, renderer); wcam.updateMatrixWorld(); tiles.update(); }
  updateLabels(false);
  uiT += dt; if (uiT > .12) { uiT = 0; groundLabels(); H.tick && H.tick({ x: P.x, z: P.z, heading: P.heading, yaw: cam.yaw, ready, target: t }); }
  attrT += dt;
  if (attrT > 1 && tiles) { attrT = 0; const a = []; try { tiles.getAttributions(a); } catch (e) { } H.attribution && H.attribution(a.map(x => x.value).filter(v => typeof v === 'string').join(' · ')); }
  else if (attrT > 1) { attrT = 0; H.attribution && H.attribution(sst && sst.state === 'ready' ? 'ข้อมูลแผนที่ © OpenStreetMap contributors' + (engine.site === 'aqsa' ? ' · ภูมิประเทศ SRTM' : '') : ''); }
  renderer.setClearColor(0x000000, 1);
  renderer.render(wscene, wcam);
}
export const tilesStatus = () => ({ loaded: tilesLoaded, errors: tilesErr, mode: engine.mode });
