// เมืองจากข้อมูลแผนที่จริง (OpenStreetMap ประมวลผลล่วงหน้าเป็น assets/maps/*.json)
// สร้าง: ภูมิประเทศ พื้นผิวเมือง ถนน อาคาร (ลายหน้าต่างจริงในเชดเดอร์) ของบนหลังคา กำแพง ต้นไม้ และแผนที่ย่อ
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const hash = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

/* ---------------- รูปหลายเหลี่ยม (อาร์เรย์แบน [x0,z0,x1,z1,...]) ---------------- */
export function pArea(f) { let a = 0; for (let i = 0, n = f.length; i < n; i += 2) { const j = (i + 2) % n; a += f[i] * f[j + 1] - f[j] * f[i + 1]; } return a / 2; }
export function pCentroid(f) { let x = 0, z = 0; const n = f.length / 2; for (let i = 0; i < f.length; i += 2) { x += f[i]; z += f[i + 1]; } return [x / n, z / n]; }
export function pIn(f, x, z) { let c = false; for (let i = 0, j = f.length - 2; i < f.length; j = i, i += 2) { const xi = f[i], zi = f[i + 1], xj = f[j], zj = f[j + 1]; if (((zi > z) !== (zj > z)) && (x < (xj - xi) * (z - zi) / (zj - zi) + xi)) c = !c; } return c; }
export function segDist(px, pz, ax, az, bx, bz) { const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz; const t = L2 ? clamp(((px - ax) * dx + (pz - az) * dz) / L2, 0, 1) : 0; return Math.hypot(px - ax - dx * t, pz - az - dz * t); }
export function pDist(f, x, z, closed = true) { let m = 1e9; const n = f.length; for (let i = 0; i + 2 < n + (closed ? 2 : 0); i += 2) { const j = (i + 2) % n; m = Math.min(m, segDist(x, z, f[i], f[i + 1], f[j], f[j + 1])); } return m; }
export function pBounds(f) { let a = 1e9, b = 1e9, c = -1e9, d = -1e9; for (let i = 0; i < f.length; i += 2) { a = Math.min(a, f[i]); b = Math.min(b, f[i + 1]); c = Math.max(c, f[i]); d = Math.max(d, f[i + 1]); } return [a, b, c, d]; }
export function pRadius(f, cx, cz) { let r = 0; for (let i = 0; i < f.length; i += 2) r = Math.max(r, Math.hypot(f[i] - cx, f[i + 1] - cz)); return r; }
const pts2 = f => { const o = []; for (let i = 0; i < f.length; i += 2) o.push([f[i], f[i + 1]]); return o; };

/* ---------------- ดัชนีพื้นที่ (ค้นหาอาคาร/ถนนใกล้จุด) ---------------- */
export class Grid {
  constructor(cell = 40) { this.c = cell; this.m = new Map(); }
  add(b, item) { const c = this.c; for (let i = Math.floor(b[0] / c); i <= Math.floor(b[2] / c); i++) for (let j = Math.floor(b[1] / c); j <= Math.floor(b[3] / c); j++) { const k = i * 100003 + j; let l = this.m.get(k); if (!l) this.m.set(k, l = []); l.push(item); } }
  at(x, z) { return this.m.get(Math.floor(x / this.c) * 100003 + Math.floor(z / this.c)) || []; }
}

/* ---------------- ภูมิประเทศ ---------------- */
// DEM: ความสูงจริงจากดาวเทียม (เมตร) เทียบกับจุดกำเนิด; ROCK: ภูเขาหินจากรูปหลายเหลี่ยม natural=bare_rock
export function makeTerrain(D, o = {}) {
  let demH = null, base = 0, rockG = null;
  if (D.dem) {
    const d = D.dem;
    const raw = (x, z) => {
      let fi = clamp((x - d.x0) / d.dx, 0, d.nx - 1.001), fj = clamp((z - d.z0) / d.dz, 0, d.ny - 1.001);
      const i = Math.floor(fi), j = Math.floor(fj), u = fi - i, v = fj - j, H = d.h, n = d.nx;
      return (H[j * n + i] * (1 - u) + H[j * n + i + 1] * u) * (1 - v) + (H[(j + 1) * n + i] * (1 - u) + H[(j + 1) * n + i + 1] * u) * v;
    };
    base = o.baseAt ? raw(o.baseAt[0], o.baseAt[1]) : raw(0, 0);
    demH = (x, z) => raw(x, z) - base;
  }
  const rocks = (D.a || []).filter(a => a[0] === 6 && Math.abs(pArea(a[1])) > 1500);
  if (rocks.length && o.rocks !== false) {
    // หาความสูงของภูเขาจากระยะทางเข้าไปในรูปหลายเหลี่ยม (ยิ่งลึกยิ่งสูง) แล้วเก็บเป็นตารางความสูง
    let bb = [1e9, 1e9, -1e9, -1e9];
    for (const r of rocks) { const b = pBounds(r[1]); bb = [Math.min(bb[0], b[0]), Math.min(bb[1], b[1]), Math.max(bb[2], b[2]), Math.max(bb[3], b[3])]; }
    const res = Math.max(6, Math.round(Math.sqrt((bb[2] - bb[0]) * (bb[3] - bb[1])) / 700)), nx = Math.ceil((bb[2] - bb[0]) / res) + 1, nz = Math.ceil((bb[3] - bb[1]) / res) + 1, g = new Float32Array(nx * nz);
    for (const r of rocks) {
      const f = r[1], b = pBounds(f), A = Math.abs(pArea(f)), Hm = r[2] || clamp(Math.sqrt(A) * .32, 14, o.rockMax || 150), ramp = clamp(Hm * (r[3] || 1.7), 30, r[2] ? 1400 : 220), seed = A % 97;
      for (let i = Math.floor((b[0] - bb[0]) / res); i <= Math.ceil((b[2] - bb[0]) / res); i++) for (let j = Math.floor((b[1] - bb[1]) / res); j <= Math.ceil((b[3] - bb[1]) / res); j++) {
        if (i < 0 || j < 0 || i >= nx || j >= nz) continue;
        const x = bb[0] + i * res, z = bb[1] + j * res; if (!pIn(f, x, z)) continue;
        const dd = pDist(f, x, z), t = clamp(dd / ramp, 0, 1), s = t * t * (3 - 2 * t);
        const n = .82 + .1 * Math.sin(x * .021 + seed) * Math.cos(z * .017 - seed) + .08 * Math.sin(x * .07 + z * .05);
        g[j * nx + i] = Math.max(g[j * nx + i], Hm * s * n);
      }
    }
    rockG = { g, nx, nz, res, x0: bb[0], z0: bb[1] };
  }
  const rockH = (x, z) => {
    const R = rockG; if (!R) return 0;
    const fi = (x - R.x0) / R.res, fj = (z - R.z0) / R.res; if (fi < 0 || fj < 0 || fi >= R.nx - 1 || fj >= R.nz - 1) return 0;
    const i = Math.floor(fi), j = Math.floor(fj), u = fi - i, v = fj - j, n = R.nx, G = R.g;
    return (G[j * n + i] * (1 - u) + G[j * n + i + 1] * u) * (1 - v) + (G[(j + 1) * n + i] * (1 - u) + G[(j + 1) * n + i + 1] * u) * v;
  };
  const flats = o.flats || []; // [{poly, y, edge}] พื้นที่ปรับระดับ (เช่น ลานมัสยิดอัลอักศอ)
  const height = (x, z) => {
    for (const F of flats) if (x > F.b[0] && x < F.b[2] && z > F.b[1] && z < F.b[3] && pIn(F.poly, x, z)) return F.y;
    let h = demH ? demH(x, z) : 0;
    if (rockG) h = Math.max(h, rockH(x, z));
    return h;
  };
  for (const F of flats) F.b = pBounds(F.poly);
  return { height, demH, rockH, rockG, base, hasDem: !!demH };
}
// ตาข่ายภูเขาหินจากตารางความสูง (เฉพาะช่องที่สูงจากพื้น)
export function rockMesh(T, mat) {
  const R = T.rockG; if (!R) return null;
  const step = 2, pos = [], col = [], c1 = new THREE.Color(0x3f362f), c2 = new THREE.Color(0x7a6a55), c3 = new THREE.Color(0xb59d78), tmp = new THREE.Color();
  const H = (i, j) => R.g[Math.min(R.nz - 1, j) * R.nx + Math.min(R.nx - 1, i)];
  const V = (i, j) => { const x = R.x0 + i * R.res, z = R.z0 + j * R.res, y = H(i, j); return [x, y - .4, z]; };
  const push = v => { pos.push(v[0], v[1], v[2]); const n = .5 + .5 * Math.sin(v[0] * .05 + v[2] * .04) * Math.cos(v[2] * .03 - v[0] * .02); tmp.copy(c1).lerp(c2, clamp(n * .8 + v[1] / 160, 0, 1)).lerp(c3, clamp(1 - v[1] / 8, 0, 1) * .7); col.push(tmp.r, tmp.g, tmp.b); };
  for (let i = 0; i < R.nx - step; i += step) for (let j = 0; j < R.nz - step; j += step) {
    if (H(i, j) < .3 && H(i + step, j) < .3 && H(i, j + step) < .3 && H(i + step, j + step) < .3) continue;
    const a = V(i, j), b = V(i + step, j), c = V(i, j + step), d = V(i + step, j + step);
    push(a); push(c); push(b); push(b); push(c); push(d);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals();
  const m = new THREE.Mesh(g, mat); m.receiveShadow = true; m.castShadow = true; return m;
}

/* ---------------- พื้นผิวเมือง (วาดลงผืนผ้าใบ แล้วใช้เป็นพื้นผิวของพื้นดิน) ---------------- */
const ROADW = [16, 14, 13, 10, 8, 6.5, 4.2, 5, 2.2, 2.6];
export function roadInfo(r) {
  const cls = r[0], oneway = !!r[2];
  let lanes = r[1] || [3, 4, 4, 2, 2, 2, 1, 0, 0, 0][cls];
  if (oneway && !r[1]) lanes = [3, 2, 2, 2, 1, 1, 1, 0, 0, 0][cls];
  const w = cls <= 4 ? Math.max(6.4, lanes * 3.3 + .6) : ROADW[cls];
  return { cls, oneway, lanes: Math.max(1, lanes), w };
}
export function paintLandcover(D, o) {
  const [x0, z0, x1, z1] = o.bbox, size = o.size || 2048, P = o.pal;
  const c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d');
  const sx = size / (x1 - x0), sz = size / (z1 - z0);
  const path = (f, close = true) => { g.beginPath(); for (let i = 0; i < f.length; i += 2) { const X = (f[i] - x0) * sx, Y = (f[i + 1] - z0) * sz; i ? g.lineTo(X, Y) : g.moveTo(X, Y); } if (close) g.closePath(); };
  g.fillStyle = P.base; g.fillRect(0, 0, size, size);
  // จุดด่างให้พื้นไม่เรียบเกินไป
  for (let i = 0; i < size * 6; i++) { const v = Math.random(); g.fillStyle = `rgba(${v < .5 ? '0,0,0' : '255,255,255'},${.025 + Math.random() * .04})`; const r = 2 + Math.random() * 18; g.fillRect(Math.random() * size, Math.random() * size, r, r); }
  const AC = { 1: P.park, 2: P.cem, 3: P.park2 || P.asph, 4: P.wood || P.park, 5: P.relig || P.plaza, 6: P.rock, 7: P.pitch || P.park };
  for (const a of D.a) { if (a[0] === 0) continue; const col = AC[a[0]]; if (!col) continue; g.fillStyle = col; path(a[1]); g.fill(); }
  for (const a of D.a) if (a[0] === 0) { g.fillStyle = P.plaza; path(a[1]); g.fill(); }
  g.lineCap = 'round'; g.lineJoin = 'round';
  const roads = D.r.filter(r => !(o.skipRoad && o.skipRoad(r)));
  for (const r of roads) if (r[0] <= 6) { const I = roadInfo(r); g.strokeStyle = P.side; g.lineWidth = (I.w + (r[0] <= 5 ? 5 : 2)) * sx; path(r[4], false); g.stroke(); }
  for (const r of roads) if (r[0] >= 7) { g.strokeStyle = r[0] === 9 ? P.steps || P.side : P.foot || P.side; g.lineWidth = ROADW[r[0]] * sx; path(r[4], false); g.stroke(); }
  for (const r of roads) if (r[0] <= 6) { const I = roadInfo(r); g.strokeStyle = P.asph; g.lineWidth = I.w * sx; path(r[4], false); g.stroke(); }
  // เงาจาง ๆ ใต้ฐานอาคาร
  // รวมทุกอาคารเป็นเส้นทางเดียว แล้วเบลอครั้งเดียว (เบลอทีละอาคารช้ามาก)
  g.save(); g.filter = `blur(${Math.max(1, 2.5 * sx)}px)`; g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath();
  for (const b of D.b) { if (b[0] === 5 || b[2] > 2) continue; const f = b[4]; for (let i = 0; i < f.length; i += 2) { const X = (f[i] - x0) * sx, Y = (f[i + 1] - z0) * sz; i ? g.lineTo(X, Y) : g.moveTo(X, Y); } g.closePath(); }
  g.fill('nonzero'); g.restore();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}
// วัสดุพื้น: พื้นผิวเมือง + ลายละเอียดซ้ำ ๆ ตามพิกัดโลก (ให้ดูคมเมื่อมองใกล้)
let detailTex = null;
function detailTexture() {
  if (detailTex) return detailTex;
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  g.fillStyle = '#808080'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 9000; i++) { const v = 100 + Math.random() * 60 | 0; g.fillStyle = `rgba(${v},${v},${v},.5)`; g.fillRect(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 2, 1 + Math.random() * 2); }
  g.strokeStyle = 'rgba(60,60,60,.25)'; g.lineWidth = 1; for (let p = 0; p <= 256; p += 64) { g.beginPath(); g.moveTo(p, 0); g.lineTo(p, 256); g.stroke(); g.beginPath(); g.moveTo(0, p); g.lineTo(256, p); g.stroke(); }
  detailTex = new THREE.CanvasTexture(c); detailTex.wrapS = detailTex.wrapT = THREE.RepeatWrapping; detailTex.anisotropy = 4;
  return detailTex;
}
export function groundMaterial(map) {
  const m = new THREE.MeshStandardMaterial({ map, roughness: .95, metalness: 0 });
  const dt = detailTexture();
  m.onBeforeCompile = sh => {
    sh.uniforms.uDetail = { value: dt };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vGW;').replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvGW = (modelMatrix * vec4(transformed, 1.0)).xz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec2 vGW; uniform sampler2D uDetail;')
      .replace('#include <map_fragment>', '#include <map_fragment>\n float dtl = texture2D(uDetail, vGW / 4.0).r * 0.6 + texture2D(uDetail, vGW / 23.0).r * 0.4; diffuseColor.rgb *= 0.72 + dtl * 0.56;');
  };
  m.customProgramCacheKey = () => 'city-ground-v1';
  return m;
}

/* ---------------- วัสดุอาคาร: หน้าต่าง ร้านค้าชั้นล่าง หินก่อ ไฟกลางคืน ---------------- */
// สไตล์: 0 ตึกทั่วไป, 1 โรงแรมสูง, 2 หินเยรูซาเล็ม, 3 อาคารฮะรอม, 4 มัสยิด, 5 กำลังก่อสร้าง, 6 หินโรงแรม, 7 ยอดทอง, 8 หินก้อนใหญ่ไม่มีหน้าต่าง
export const BAY = [3.6, 2.6, 4, 7, 4, 6, 2.8, 2, 3];
export function facadeMaterial(nightU) {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .85, metalness: 0 });
  m.onBeforeCompile = sh => {
    sh.uniforms.uNight = nightU;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec4 aB; attribute vec2 aF;\nvarying vec4 vB; varying vec2 vF; varying vec3 vWN; varying vec3 vWP;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvB = aB; vF = aF; vWN = normalize(mat3(modelMatrix) * objectNormal); vWP = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
varying vec4 vB; varying vec2 vF; varying vec3 vWN; varying vec3 vWP; uniform float uNight;
float fh21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float fbox(vec2 p, vec2 a, vec2 b) { return step(a.x, p.x) * step(p.x, b.x) * step(a.y, p.y) * step(p.y, b.y); }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
float fGlass = 0.0; float fMetal = 0.0; vec3 fEmis = vec3(0.0);
{
  vec3 base = diffuseColor.rgb;
  float st = floor(vB.x + 0.5), nb = vB.y, seed = vB.z, H = vB.w;
  float u = vF.x, v = vF.y;
  vec3 col = base;
  if (vWN.y > 0.6) {
    vec2 r = vWP.xz / 3.0; vec2 fr = fract(r);
    float jn = max(step(fr.x, 0.03), step(fr.y, 0.03));
    col = base * (0.84 + 0.08 * fh21(floor(r) + seed)) * (1.0 - 0.08 * jn);
    if (st > 6.5 && st < 7.5) fMetal = 0.85;
  } else {
    float aa = clamp(1.0 - (fwidth(u) + fwidth(v) * 0.32) * 1.3, 0.0, 1.0);
    float inB = step(0.0, u) * step(u, nb);
    float bi = floor(u), fu = fract(u);
    vec3 det = col; float gl = 0.0; vec3 em = vec3(0.0);
    if (st < 1.5 || (st > 5.5 && st < 6.5)) {
      bool tower = st > 0.5;
      float gf = tower ? 5.0 : 4.2, fh = tower ? 3.5 : 3.3;
      if (v < gf) {
        float hs = fh21(vec2(bi, seed * 91.0));
        float shop = inB * fbox(vec2(fu, v), vec2(0.06, 0.2), vec2(0.94, gf - 1.0));
        float sgn = tower ? 0.0 : inB * fbox(vec2(fu, v), vec2(0.02, gf - 0.86), vec2(0.98, gf - 0.18));
        vec3 shutter = vec3(0.6, 0.61, 0.62) * (0.84 + 0.16 * step(0.5, fract(v * 7.0)));
        float isG = tower ? 1.0 : step(0.4, hs);
        det = mix(det, mix(shutter, vec3(0.12, 0.14, 0.16), isG), shop);
        gl += shop * isG;
        float hc = fh21(vec2(bi + 3.0, seed * 17.0));
        vec3 sc = hc < 0.33 ? vec3(0.08, 0.4, 0.27) : (hc < 0.66 ? vec3(0.62, 0.12, 0.1) : vec3(0.93, 0.91, 0.86));
        det = mix(det, sc, sgn * 0.92);
        em += shop * isG * vec3(1.0, 0.86, 0.62) * (0.06 + 1.15 * uNight);
        em += sgn * sc * uNight * 0.75;
      } else {
        float fy = (v - gf) / fh, fl = floor(fy), fv = fract(fy);
        det *= 1.0 - 0.1 * (1.0 - step(0.07, fv));
        float hw = fh21(vec2(bi, fl) + seed * 13.0);
        float win = tower ? inB * fbox(vec2(fu, fv), vec2(0.13, 0.0), vec2(0.87, 0.74)) : inB * fbox(vec2(fu, fv), vec2(0.22, 0.3), vec2(0.78, 0.82));
        float frm = tower ? 0.0 : inB * fbox(vec2(fu, fv), vec2(0.18, 0.26), vec2(0.82, 0.86)) - win;
        det = mix(det, det * 1.14 + 0.03, frm);
        vec3 tint = tower ? mix(vec3(0.14, 0.22, 0.27), vec3(0.3, 0.25, 0.19), step(0.5, fract(seed * 7.0))) : vec3(0.13, 0.16, 0.19);
        vec3 gc = tint + vec3(0.2, 0.23, 0.25) * (0.2 + 0.55 * fract(hw * 7.3)) * (1.0 - fv * 0.55);
        float shut = tower ? 0.0 : step(0.84, hw);
        gc = mix(gc, base * 0.7, shut);
        det = mix(det, gc, win);
        gl += win * (1.0 - shut);
        float ac = tower ? 0.0 : inB * step(0.86, fh21(vec2(bi * 3.1, fl * 1.7) + seed)) * fbox(vec2(fu, fv), vec2(0.56, 0.06), vec2(0.8, 0.24));
        det = mix(det, vec3(0.86, 0.86, 0.84), ac);
        em += win * (1.0 - shut) * step(0.5, fh21(vec2(bi * 1.3 + fl * 7.7, seed * 5.0))) * vec3(1.0, 0.76, 0.46) * uNight * 0.7;
      }
      det = mix(det, det * 0.84, step(H - 1.0, v));
    } else if (st < 2.5) {
      float um = u * 4.0, row = floor(v / 0.42), off = mod(row, 2.0) * 0.5;
      vec2 bf = vec2(fract((um + off) / 1.05), fract(v / 0.42));
      float jn = max(step(bf.x, 0.03), step(bf.y, 0.07));
      det = base * (0.86 + 0.18 * fh21(vec2(floor((um + off) / 1.05), row) + seed)) * (1.0 - 0.2 * jn);
      float fl = floor(v / 3.4), fv = fract(v / 3.4);
      float hw = fh21(vec2(bi, fl) + seed * 3.0);
      vec2 q = vec2((fu - 0.5) * 4.0, fv * 3.4);
      float win = inB * step(0.3, hw) * step(1.0, v) * max(step(abs(q.x), 0.5) * step(1.05, q.y) * step(q.y, 2.3), step(length(q - vec2(0.0, 2.3)), 0.5));
      vec3 wc = hw > 0.84 ? vec3(0.2, 0.32, 0.24) : (hw > 0.72 ? vec3(0.34, 0.22, 0.13) : vec3(0.09, 0.09, 0.1));
      det = mix(det, wc, win);
      float door = inB * step(0.55, fh21(vec2(bi, seed * 7.0))) * step(v, 3.4) * min(1.0, step(abs(q.x), 0.85) * step(q.y, 2.1) + step(length(q - vec2(0.0, 2.1)), 0.85));
      det = mix(det, vec3(0.3, 0.21, 0.13) * (0.82 + 0.18 * step(0.5, fract(q.x * 3.0))), door);
      gl += win * 0.35;
      em += win * step(0.6, fh21(vec2(bi * 1.7, fl * 3.3) + seed)) * vec3(1.0, 0.78, 0.5) * uNight * 0.9;
      em += door * step(0.7, fh21(vec2(bi, seed * 3.0))) * vec3(1.0, 0.8, 0.5) * uNight * 0.6;
      det = mix(det, det * 0.9, step(H - 0.5, v));
    } else if (st < 3.5) {
      det = base * (0.93 + 0.05 * fh21(vec2(bi, floor(v / 0.7)) + seed));
      vec2 q = vec2((fu - 0.5) * 7.0, v);
      float t1 = inB * max(step(abs(q.x), 1.7) * step(0.4, v) * step(v, 6.6), step(length(vec2(q.x, (v - 6.6) * 1.25)), 1.7) * step(6.6, v));
      float t2 = inB * step(9.5, v) * max(step(abs(q.x), 1.1) * step(v, 14.5), step(length(vec2(q.x, (v - 14.5) * 1.3)), 1.1) * step(14.5, v));
      float grill = 0.75 + 0.25 * step(0.5, fract(q.x * 2.5 + v * 2.5)) * step(0.5, fract(q.x * 2.5 - v * 2.5));
      det = mix(det, vec3(0.2, 0.18, 0.15) * grill, max(t1, t2 * step(v, H - 3.0)));
      det = mix(det, vec3(0.75, 0.62, 0.35), inB * step(abs(q.x), 1.9) * step(abs(v - 6.6 - 1.75), 0.12) * 0.6);
      det = mix(det, det * 0.86, step(H - 1.6, v));
      em += max(t1, t2) * vec3(1.0, 0.85, 0.6) * uNight * 0.55;
    } else if (st < 4.5) {
      vec2 q = vec2((fu - 0.5) * 4.0, v);
      float w = inB * step(v, H - 1.5) * max(step(abs(q.x), 0.6) * step(1.3, v) * step(v, 3.4), step(length(vec2(q.x, v - 3.4)), 0.6) * step(3.4, v));
      det = mix(det, vec3(0.16, 0.22, 0.2), w);
      det = mix(det, vec3(0.16, 0.42, 0.3), step(H - 0.7, v) * step(v, H - 0.35));
      em += w * vec3(1.0, 0.86, 0.6) * uNight * 0.8;
    } else if (st < 5.5) {
      float fy = v / 3.3, fv = fract(fy);
      float slab = 1.0 - step(0.16, fv);
      float colm = 1.0 - step(0.08, fu) * step(fu, 0.92);
      det = mix(vec3(0.1, 0.1, 0.11), base, max(slab, colm));
    } else if (st < 7.5) {
      det = base * (0.86 + 0.14 * step(0.5, fract(u * 2.0)));
      fMetal = 0.85;
      em += base * uNight * 0.25;
    } else {
      float row = floor(v / 0.95), off = mod(row, 2.0) * 0.6;
      float um = u * 3.0;
      vec2 bf = vec2(fract((um + off) / 1.3), fract(v / 0.95));
      float jn = max(step(bf.x, 0.025), step(bf.y, 0.05));
      det = base * (0.84 + 0.2 * fh21(vec2(floor((um + off) / 1.3), row) + seed)) * (1.0 - 0.22 * jn);
    }
    col = mix(base * 0.8, det, aa);
    fGlass = gl * aa;
    fEmis = em * aa + (1.0 - aa) * uNight * vec3(1.0, 0.8, 0.5) * (st < 1.5 ? 0.16 : 0.06);
  }
  diffuseColor.rgb = col;
}`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.14, fGlass); roughnessFactor = mix(roughnessFactor, 0.32, fMetal);')
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor = max(metalnessFactor, fMetal);')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += fEmis;');
  };
  m.customProgramCacheKey = () => 'city-facade-v3';
  return m;
}

/* ---------------- เครื่องสร้างตาข่ายอาคาร (รวมเป็นก้อนตามพื้นที่ เพื่อให้ตัดส่วนที่มองไม่เห็นได้) ---------------- */
class BuildBuf {
  constructor() { this.p = []; this.n = []; this.f = []; this.b = []; this.c = []; this.i = []; }
  get vc() { return this.p.length / 3; }
  v(x, y, z, nx, ny, nz, fu, fv, B, C) { this.p.push(x, y, z); this.n.push(nx, ny, nz); this.f.push(fu, fv); this.b.push(B[0], B[1], B[2], B[3]); this.c.push(C.r, C.g, C.b); return this.vc - 1; }
  geo() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('aF', new THREE.Float32BufferAttribute(this.f, 2)); g.setAttribute('aB', new THREE.Float32BufferAttribute(this.b, 4)); g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    g.setIndex(this.i); g.computeBoundingSphere(); return g;
  }
}
// ผนังรอบรูป + หลังคา; ring/hole เป็น [[x,z],...]
export function extrude(buf, rings, y0, y1, style, color, roofColor, seed, opts = {}) {
  const bay = BAY[style] || 3.6, H = y1 - y0, outer = rings[0];
  for (let r = 0; r < rings.length; r++) {
    const R = rings[r], n = R.length; if (n < 3) continue;
    // หาด้านนอกของผนัง: ทดสอบจุดกลางขอบที่ยาวที่สุด
    let best = 0, bl = 0; for (let i = 0; i < n; i++) { const a = R[i], b = R[(i + 1) % n], l = Math.hypot(b[0] - a[0], b[1] - a[1]); if (l > bl) { bl = l; best = i; } }
    const A = R[best], Bp = R[(best + 1) % n], dx = (Bp[0] - A[0]) / bl, dz = (Bp[1] - A[1]) / bl, mx = (A[0] + Bp[0]) / 2 + dz * .05, mz = (A[1] + Bp[1]) / 2 - dx * .05;
    const fl = pts2in(R, mx, mz);
    const sgn = (r === 0 ? (fl ? -1 : 1) : (fl ? 1 : -1)); // นอร์มอล = sgn * (dz, -dx)
    for (let i = 0; i < n; i++) {
      const a = R[i], b = R[(i + 1) % n], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < .05) continue;
      const ux = (b[0] - a[0]) / L, uz = (b[1] - a[1]) / L, nx = uz * sgn, nz = -ux * sgn;
      const nbay = Math.max(1, Math.floor(L / bay)), mg = (L - nbay * bay) / 2;
      const B = [style, L < bay * .8 ? 0 : nbay, seed, H], u0 = -mg / bay, u1 = (L - mg) / bay;
      const ya = opts.yAt ? opts.yAt(a[0], a[1]) : y0, yb = opts.yAt ? opts.yAt(b[0], b[1]) : y0;
      const i0 = buf.v(a[0], ya, a[1], nx, 0, nz, u0, ya - y0, B, color), i1 = buf.v(b[0], yb, b[1], nx, 0, nz, u1, yb - y0, B, color);
      const i2 = buf.v(b[0], y1, b[1], nx, 0, nz, u1, H, B, color), i3 = buf.v(a[0], y1, a[1], nx, 0, nz, u0, H, B, color);
      // ทิศของสามเหลี่ยม (a0,b0,b1) ให้นอร์มอล (-dz, dx) -> ตรงกับ sgn = -1
      if (sgn < 0) buf.i.push(i0, i1, i2, i0, i2, i3); else buf.i.push(i0, i2, i1, i0, i3, i2);
    }
  }
  if (opts.noRoof) return;
  const contour = outer.map(p => new THREE.Vector2(p[0], p[1])), holes = rings.slice(1).map(h => h.map(p => new THREE.Vector2(p[0], p[1])));
  let tris; try { tris = THREE.ShapeUtils.triangulateShape(contour, holes); } catch (e) { return; }
  const all = contour.concat(...holes), B = [style, 0, seed, H], base = buf.vc;
  for (const p of all) buf.v(p.x, y1, p.y, 0, 1, 0, p.x, p.y, B, roofColor);
  for (const t of tris) {
    const a = all[t[0]], b = all[t[1]], c = all[t[2]];
    const cy = (b.y - a.y) * (c.x - a.x) - (b.x - a.x) * (c.y - a.y); // > 0 = หันขึ้น
    if (cy > 0) buf.i.push(base + t[0], base + t[1], base + t[2]); else buf.i.push(base + t[0], base + t[2], base + t[1]);
  }
}
function pts2in(R, x, z) { let c = false; for (let i = 0, j = R.length - 1; i < R.length; j = i++) { const [xi, zi] = R[i], [xj, zj] = R[j]; if (((zi > z) !== (zj > z)) && (x < (xj - xi) * (z - zi) / (zj - zi) + xi)) c = !c; } return c; }

/* ---------------- รวมเรขาคณิตตามวัสดุ ---------------- */
export class Batch {
  constructor() { this.m = new Map(); }
  add(mat, geo, matrix) {
    let g = geo.index ? geo.toNonIndexed() : geo;
    if (matrix) g.applyMatrix4(matrix);
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    if (!this.m.has(mat)) this.m.set(mat, []);
    this.m.get(mat).push(g);
  }
  mesh(geo, mat, x, y, z, ry, sx, sy, sz) { const o = new THREE.Object3D(); o.position.set(x, y, z); o.rotation.y = ry || 0; o.scale.set(sx || 1, sy || sx || 1, sz || sx || 1); o.updateMatrix(); this.add(mat, geo.clone(), o.matrix); }
  flush(parent, shadow = true) {
    for (const [mat, list] of this.m) {
      for (let s = 0; s < list.length; s += 400) {
        const g = mergeGeometries(list.slice(s, s + 400), false); if (!g) continue;
        const m = new THREE.Mesh(g, mat); m.castShadow = shadow; m.receiveShadow = true; parent.add(m);
      }
    }
    this.m.clear();
  }
}
// โดมทรงกลม/แหลม (โปรไฟล์หมุนรอบแกน)
export function domeGeo(r, h, pointed = 0, seg = 24) {
  const pts = [];
  for (let i = 0; i <= 12; i++) { const t = i / 12, a = t * Math.PI / 2; let x = Math.cos(a) * r, y = Math.sin(a) * h; if (pointed) { x *= 1 - pointed * t * t * .25; y = h * (Math.sin(a) * (1 - pointed * .15) + pointed * .15 * t * t); } pts.push(new THREE.Vector2(Math.max(.001, x), y)); }
  pts.push(new THREE.Vector2(.001, h));
  return new THREE.LatheGeometry(pts, seg);
}

/* ---------------- ต้นไม้ ---------------- */
function treeGeo(kind) {
  const parts = [], col = (g, c) => { const n = g.attributes.position.count, a = new Float32Array(n * 3), C = new THREE.Color(c); for (let i = 0; i < n; i++) { a[i * 3] = C.r; a[i * 3 + 1] = C.g; a[i * 3 + 2] = C.b; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; };
  const clean = g => { g = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'color'].includes(k)) g.deleteAttribute(k); return g; };
  if (kind === 'palm') {
    const tr = new THREE.CylinderGeometry(.17, .3, 9, 6, 3); tr.translate(0, 4.5, 0);
    { const p = tr.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setX(i, p.getX(i) + Math.sin(y * .35) * .25); } tr.computeVertexNormals(); }
    parts.push(col(tr, 0x7a6047));
    for (let k = 0; k < 8; k++) { const g = new THREE.ConeGeometry(.55, 4.4, 3, 1); g.scale(1, 1, .18); g.translate(0, 2.2, 0); g.rotateZ(-1.12 - (k % 2) * .28); g.rotateY(k / 8 * Math.PI * 2); g.translate(.25 * Math.sin(9 * .35), 9, 0); parts.push(col(g, k % 2 ? 0x5f8a3e : 0x4f7a34)); }
  } else if (kind === 'cypress') {
    const tr = new THREE.CylinderGeometry(.12, .2, 1.4, 5); tr.translate(0, .7, 0); parts.push(col(tr, 0x5a4636));
    const c = new THREE.ConeGeometry(1.05, 9, 7, 3); c.translate(0, 5.6, 0); { const p = c.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i), s = 1 + .25 * Math.sin((y - 1) / 9 * Math.PI); p.setX(i, p.getX(i) * s); p.setZ(i, p.getZ(i) * s); } c.computeVertexNormals(); }
    parts.push(col(c, 0x2f4a2a));
  } else if (kind === 'olive') {
    const tr = new THREE.CylinderGeometry(.22, .34, 2.2, 6); tr.translate(0, 1.1, 0); tr.rotateZ(.12); parts.push(col(tr, 0x6b5a48));
    for (const [x, y, z, s] of [[0, 3, 0, 2.1], [1.1, 2.7, .3, 1.4], [-1, 2.8, -.4, 1.5], [.2, 3.6, -.9, 1.2]]) { const g = new THREE.IcosahedronGeometry(s, 1); g.scale(1, .72, 1); g.translate(x, y, z); parts.push(col(g, 0x7d8a5c)); }
  } else if (kind === 'pine') {
    const tr = new THREE.CylinderGeometry(.2, .32, 7, 6); tr.translate(0, 3.5, 0); parts.push(col(tr, 0x5e4a3a));
    for (const [x, y, z, s] of [[0, 7.4, 0, 2.8], [1.6, 7, .6, 1.9], [-1.5, 7.1, -.5, 2]]) { const g = new THREE.IcosahedronGeometry(s, 1); g.scale(1, .45, 1); g.translate(x, y, z); parts.push(col(g, 0x3f5a32)); }
  } else {
    const tr = new THREE.CylinderGeometry(.2, .3, 2.6, 6); tr.translate(0, 1.3, 0); parts.push(col(tr, 0x6a5440));
    const g = new THREE.IcosahedronGeometry(2.6, 1); g.scale(1, .82, 1); g.translate(0, 4.2, 0); parts.push(col(g, 0x557a3a));
  }
  return mergeGeometries(parts.map(clean), false);
}
let treeMat = null;
export function buildTrees(parent, list, kinds, ground, seed = 1) {
  if (!list.length) return;
  treeMat = treeMat || new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .9, flatShading: true });
  const by = new Map(), o = new THREE.Object3D(), c = new THREE.Color();
  list.forEach(([x, z, k], i) => { const kind = k || kinds[Math.floor(hash(i * 1.37 + seed) * kinds.length)]; if (!by.has(kind)) by.set(kind, []); by.get(kind).push([x, z]); });
  for (const [kind, pts] of by) {
    const im = new THREE.InstancedMesh(treeGeo(kind), treeMat, pts.length);
    pts.forEach(([x, z], i) => { const s = .8 + hash(x * .13 + z * .71) * .5; o.position.set(x, ground(x, z), z); o.rotation.set(0, hash(x + z) * 6.28, 0); o.scale.setScalar(s); o.updateMatrix(); im.setMatrixAt(i, o.matrix); const v = .85 + hash(x * 3.1 - z) * .3; im.setColorAt(i, c.setRGB(v, v, v)); });
    im.castShadow = true; im.receiveShadow = true; parent.add(im);
  }
}

/* ---------------- ถนน: แถบผิวจราจรพร้อมเส้นจราจร ---------------- */
let roadMats = null;
function roadMaterials() {
  if (roadMats) return roadMats;
  const mk = marked => {
    const c = document.createElement('canvas'); c.width = 128; c.height = 512; const g = c.getContext('2d');
    g.fillStyle = '#4a4a4c'; g.fillRect(0, 0, 128, 512);
    for (let i = 0; i < 2600; i++) { const v = 55 + Math.random() * 45 | 0; g.fillStyle = `rgba(${v},${v},${v + 2},.55)`; g.fillRect(Math.random() * 128, Math.random() * 512, 1.5, 1.5); }
    g.fillStyle = 'rgba(30,30,32,.25)'; g.fillRect(52, 0, 24, 512);
    if (marked) { g.fillStyle = '#e9e6dc'; g.fillRect(4, 0, 3, 512); g.fillRect(121, 0, 3, 512); for (let y = 0; y < 512; y += 128) g.fillRect(62, y, 4, 64); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.ClampToEdgeWrapping; t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
    const m = new THREE.MeshStandardMaterial({ map: t, roughness: .92, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    return m;
  };
  roadMats = { marked: mk(true), plain: mk(false) };
  return roadMats;
}
export function buildRoads(parent, roads, ground, o = {}) {
  const M = roadMaterials(), bufs = { marked: { p: [], uv: [], i: [] }, plain: { p: [], uv: [], i: [] } };
  for (const r of roads) {
    const I = roadInfo(r), pts = [], f = r[4], hw = I.w / 2;
    for (let i = 0; i < f.length; i += 2) {
      if (i) { const px = f[i - 2], pz = f[i - 1], L = Math.hypot(f[i] - px, f[i + 1] - pz), n = o.dem ? Math.ceil(L / 7) : 1; for (let k = 1; k < n; k++) pts.push([px + (f[i] - px) * k / n, pz + (f[i + 1] - pz) * k / n]); }
      pts.push([f[i], f[i + 1]]);
    }
    if (pts.length < 2) continue;
    const B = I.cls <= 4 ? bufs.marked : bufs.plain, yo = .05 + (9 - I.cls) * .006;
    let s = 0;
    for (let k = 0; k < pts.length; k++) {
      const a = pts[Math.max(0, k - 1)], b = pts[Math.min(pts.length - 1, k + 1)];
      let dx = b[0] - a[0], dz = b[1] - a[1]; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
      if (k) s += Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]);
      const nx = -dz * hw, nz = dx * hw, x = pts[k][0], z = pts[k][1];
      const base = B.p.length / 3;
      B.p.push(x + nx, ground(x + nx, z + nz) + yo, z + nz, x - nx, ground(x - nx, z - nz) + yo, z - nz);
      B.uv.push(0, s / 14, 1, s / 14);
      if (k) B.i.push(base - 2, base, base - 1, base - 1, base, base + 1);
    }
  }
  for (const [k, B] of Object.entries(bufs)) {
    if (!B.i.length) continue;
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(B.p, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(B.uv, 2)); g.setIndex(B.i);
    g.computeVertexNormals();
    { const n = g.attributes.normal; for (let i = 0; i < n.count; i++) if (n.getY(i) < 0) n.setXYZ(i, -n.getX(i), -n.getY(i), -n.getZ(i)); }
    const m = new THREE.Mesh(g, M[k]); m.receiveShadow = true; parent.add(m);
  }
}

/* ---------------- แผนที่ย่อของเมือง ---------------- */
export function minimapCanvas(D, bbox, size = 1536, o = {}) {
  const [x0, z0, x1, z1] = bbox, c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d');
  const sx = size / (x1 - x0), sz = size / (z1 - z0);
  const path = (f, close = true) => { g.beginPath(); for (let i = 0; i < f.length; i += 2) { const X = (f[i] - x0) * sx, Y = (f[i + 1] - z0) * sz; i ? g.lineTo(X, Y) : g.moveTo(X, Y); } if (close) g.closePath(); };
  g.fillStyle = '#1b2a2f'; g.fillRect(0, 0, size, size);
  const AC = { 0: '#3a4b50', 1: '#2d4a32', 2: '#4a4535', 3: '#2a3639', 4: '#2a4430', 5: '#33424a', 6: '#3d3a33', 7: '#2d4a32' };
  for (const a of D.a) { g.fillStyle = AC[a[0]] || '#2a3639'; path(a[1]); g.fill(); }
  g.lineCap = 'round'; g.lineJoin = 'round';
  for (const r of D.r) { if (o.skipRoad && o.skipRoad(r)) continue; const I = roadInfo(r); g.strokeStyle = r[0] <= 2 ? '#6b7a7e' : r[0] <= 6 ? '#55666b' : '#45585c'; g.lineWidth = Math.max(1, (r[0] <= 6 ? I.w : 2) * sx); path(r[4], false); g.stroke(); }
  g.fillStyle = '#8b9a98'; for (const b of D.b) { if (o.skipBuilding && o.skipBuilding(b)) continue; path(b[4]); g.fill(); }
  return { canvas: c, bbox };
}
