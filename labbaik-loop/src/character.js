// ตัวละครผู้แสวงบุญ
// 1) ถ้ามีไฟล์โมเดลใน assets/characters/manifest.json จะโหลดโมเดลจริง (GLB/GLTF/FBX) พร้อมแอนิเมชัน
// 2) ถ้าไม่มี จะใช้หุ่นที่สร้างจากโค้ด (ProcFigure) แทน
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { figureParts, toonGradient, PART, SHOULDER_Y, KNEE_Y, WAIST_Y } from './people.js';

let manifest = null, manifestBase = '';
const assetCache = new Map();

export async function loadManifest(url) {
  try {
    const r = await fetch(url, { cache: 'no-cache' });
    if (!r.ok) throw new Error(r.status);
    manifest = await r.json();
    manifestBase = url.slice(0, url.lastIndexOf('/') + 1);
  } catch (e) { manifest = null; }
  return manifest;
}
export const hasModels = () => !!(manifest && manifest.models && Object.values(manifest.models).some(Boolean));

function loadAsset(file) {
  if (assetCache.has(file)) return assetCache.get(file);
  const url = manifestBase + file;
  const p = /\.fbx$/i.test(file)
    ? new FBXLoader().loadAsync(url).then(o => ({ scene: o, animations: o.animations || [] }))
    : new GLTFLoader().loadAsync(url).then(g => ({ scene: g.scene, animations: g.animations || [] }));
  assetCache.set(file, p);
  return p;
}
function modelKeyFor(look) {
  const g = look.gender === 'm' ? 'male' : 'female';
  if (look.gender === 'm' && look.ihram && look.idtiba) return ['male_ihram_idtiba', 'male_ihram'];
  return [`${g}_${look.ihram ? 'ihram' : 'travel'}`];
}
const findClip = (clips, names) => clips.find(c => names.some(n => c.name.toLowerCase().includes(n)));

/* ---------------- procedural figure (สไตล์การ์ตูน แรเงา 3 ระดับ) ---------------- */
class ProcFigure {
  constructor() {
    this.root = new THREE.Group();
    this.mats = new Map(); this.key = ''; this.phase = 0; this.scale = 1;
    this.build({ g: 'm', ihram: false, skin: '#DDA87C', hair: '#1d1814', hairStyle: 'short', beard: 'short', cloth: '#F4F3EE', cap: true });
  }
  mat(c) { if (!this.mats.has(c)) this.mats.set(c, new THREE.MeshToonMaterial({ color: c, gradientMap: toonGradient(), side: THREE.DoubleSide })); return this.mats.get(c); }
  build(o) {
    const key = JSON.stringify(o); if (key === this.key) return; this.key = key;
    while (this.root.children.length) { const c = this.root.children.pop(); c.traverse(x => x.geometry && x.geometry.dispose()); }
    const { parts, scale } = figureParts(o, 'hi'); this.scale = scale;
    const body = this.body = new THREE.Group(); this.root.add(body);
    const upper = this.upper = new THREE.Group(); upper.position.y = WAIST_Y * scale; body.add(upper);
    const pivot = (parent, y) => { const g = new THREE.Group(); g.position.y = y; parent.add(g); return g; };
    this.arms = [pivot(upper, (SHOULDER_Y - WAIST_Y) * scale), pivot(upper, (SHOULDER_Y - WAIST_Y) * scale)];
    this.legs = [pivot(body, KNEE_Y * scale), pivot(body, KNEE_Y * scale)];
    for (const p of parts) {
      let parent = body, dy = 0;
      if (p.part === PART.UPPER) { parent = upper; dy = WAIST_Y * scale; }
      else if (p.part === PART.ARM_R || p.part === PART.ARM_L) { parent = this.arms[p.part === PART.ARM_R ? 0 : 1]; dy = SHOULDER_Y * scale; }
      else if (p.part === PART.LEG_R || p.part === PART.LEG_L) { parent = this.legs[p.part === PART.LEG_R ? 0 : 1]; dy = KNEE_Y * scale; }
      if (dy) p.geo.translate(0, -dy, 0);
      const m = new THREE.Mesh(p.geo, this.mat(p.color)); m.castShadow = true; m.receiveShadow = true; parent.add(m);
    }
  }
  setLook(look) {
    const m = look.gender === 'm', white = '#F6F5F0';
    const light = c => '#' + new THREE.Color(c).lerp(new THREE.Color('#ffffff'), .25).getHexString();
    this.build({
      g: look.gender, kid: !!look.kid, ihram: !!look.ihram, idtiba: !!look.idtiba, skin: look.skin,
      hair: look.hairColor || '#1d1814', hairStyle: look.hair === 'halq' ? 'none' : (look.hairStyle || 'short'),
      beard: m && look.beard ? 'short' : 'none', beardColor: look.hairColor || '#1d1814', cloth: look.cloth,
      cap: m && !look.ihram && look.hair !== 'halq' && look.cap !== false,
      dress: look.ihram || look.clothIndex === 0 ? white : look.cloth,
      khimar: look.ihram || look.clothIndex === 0 ? white : light(look.cloth)
    });
  }
  update(dt, speed, pose) {
    const moving = speed > .1 && pose === 'stand', s = this.scale;
    this.phase += dt * (moving ? 2.4 + speed * .8 : 0);
    const amp = moving ? Math.min(.7, .3 + speed * .06) : 0, ph = this.phase;
    const k = Math.min(1, dt * 10), lerp = (a, b) => a + (b - a) * k;
    let up = 0, by = moving ? Math.abs(Math.sin(ph)) * .03 * s : 0, arm = [Math.sin(ph) * amp * .9, -Math.sin(ph) * amp * .9], leg = [-Math.sin(ph) * amp * .7, Math.sin(ph) * amp * .7];
    if (!moving) { const br = Math.sin(performance.now() / 900) * .02; arm = [br, -br]; leg = [0, 0]; }
    if (pose === 'ruku') { up = 1.35; arm = [-1.0, -1.0]; leg = [0, 0]; }
    if (pose === 'sujud') { up = 1.75; by = -.5 * s; arm = [-1.5, -1.5]; leg = [1.55, 1.55]; }
    if (pose === 'julus') { up = .05; by = -.5 * s; arm = [-.55, -.55]; leg = [1.55, 1.55]; }
    if (pose === 'raise') { arm = [-1.9, 0]; }
    this.upper.rotation.x = lerp(this.upper.rotation.x, up);
    this.body.position.y = lerp(this.body.position.y, by);
    this.arms.forEach((a, i) => { a.rotation.x = lerp(a.rotation.x, arm[i]); });
    this.legs.forEach((l, i) => { l.rotation.x = lerp(l.rotation.x, leg[i]); });
  }
}
/* ---------------- Avatar: model or procedural ---------------- */
export class Avatar {
  constructor() {
    this.group = new THREE.Group();
    this.proc = new ProcFigure();
    this.group.add(this.proc.root);
    this.model = null; this.mixer = null; this.actions = {}; this.current = null; this.file = '';
    this.pose = 'stand';
    this.look = null;
  }
  get usingModel() { return !!this.model; }
  async setLook(look) {
    this.look = look;
    this.proc.setLook(look);
    const keys = modelKeyFor(look);
    const file = manifest && manifest.models ? keys.map(k => manifest.models[k]).find(Boolean) : null;
    if (!file) { this.dropModel(); return; }
    if (file !== this.file) {
      this.file = file;
      try {
        const asset = await loadAsset(file);
        if (this.file !== file) return;
        const obj = SkeletonUtils.clone(asset.scene);
        const box = new THREE.Box3().setFromObject(obj), h = box.max.y - box.min.y;
        const s = (manifest.height || 1.72) / (h || 1);
        obj.scale.setScalar(s * (manifest.scale || 1));
        obj.position.y = -box.min.y * s;
        if (manifest.rotateY) obj.rotation.y = manifest.rotateY * Math.PI / 180;
        obj.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; if (o.material) o.material = o.material.clone(); } });
        let clips = asset.animations.slice();
        if (manifest.animations) for (const [name, f] of Object.entries(manifest.animations)) {
          if (!f || findClip(clips, [name])) continue;
          try { const a = await loadAsset(f); const c = a.animations[0]; if (c) { const cc = c.clone(); cc.name = name; clips.push(cc); } } catch (e) { console.warn('animation', f, e); }
        }
        this.dropModel();
        this.model = obj; this.group.add(obj); this.proc.root.visible = false;
        this.mixer = new THREE.AnimationMixer(obj); this.actions = {};
        const map = { idle: ['idle', 'stand', 'breath'], walk: ['walk'], run: ['run', 'jog'], ruku: ['ruku', 'bow'], sujud: ['sujud', 'prostrat'], julus: ['julus', 'sit', 'kneel'] };
        for (const [k, names] of Object.entries(map)) { const c = findClip(clips, names); if (c) this.actions[k] = this.mixer.clipAction(c); }
        if (!this.actions.idle && clips[0]) this.actions.idle = this.mixer.clipAction(clips[0]);
        this.current = null; this.play('idle');
      } catch (e) { console.warn('โหลดโมเดลตัวละครไม่สำเร็จ', file, e); this.file = ''; this.dropModel(); return; }
    }
    this.tint(look);
  }
  tint(look) {
    if (!this.model || !manifest) return;
    const names = [].concat(manifest.tintMaterial || []).map(s => s.toLowerCase());
    if (!names.length || look.ihram) return;
    this.model.traverse(o => { if (o.isMesh) for (const m of [].concat(o.material)) if (names.some(n => (m.name || '').toLowerCase().includes(n))) m.color.set(look.cloth); });
  }
  dropModel() {
    if (this.model) { this.group.remove(this.model); this.model = null; }
    this.mixer = null; this.actions = {}; this.current = null;
    this.proc.root.visible = true;
  }
  play(name, fade = .25) {
    const a = this.actions[name] || this.actions.idle; if (!a || a === this.current) return;
    a.reset().fadeIn(fade).play(); if (this.current) this.current.fadeOut(fade);
    this.current = a;
  }
  setPose(p) { this.pose = p; }
  update(dt, speed) {
    if (this.model && this.mixer) {
      if (this.pose !== 'stand' && this.actions[this.pose]) this.play(this.pose);
      else this.play(speed > 5.5 ? 'run' : speed > .1 ? 'walk' : 'idle');
      this.mixer.update(dt);
    } else this.proc.update(dt, speed, this.pose);
  }
}
