// ประกอบเมืองแต่ละแห่งจากข้อมูลแผนที่จริง: มักกะฮ์ (รอบฮะรอม) มะดีนะฮ์ และอัลกุดส์ (อัลอักศอ)
// อาคาร ถนน ภูเขา ต้นไม้ สถานที่สำคัญ รถยนต์ และผู้คน
import * as THREE from 'three';
import * as CM from './citymap.js';
import * as LM from './landmarks.js';
import * as LF from './life.js';
import * as PE from './people.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const toPts = f => { const o = []; for (let i = 0; i < f.length; i += 2) o.push([f[i], f[i + 1]]); return o; };
const H = CM.hash;
// อุปกรณ์จอสัมผัส (มือถือ/แท็บเล็ต): ลดจำนวนคนและรถเพื่อให้ลื่น
const Q = (typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches) ? .55 : 1;

const PAL = {
  makkah: { walls: [0xebe6db, 0xe1d8c8, 0xd6cdbd, 0xf2efe8, 0xdccfb7, 0xc9c1b4, 0xe6dfd2, 0xbcb3a6], roof: 0xb9b3a8,
    lc: { base: '#c7bdab', side: '#d9d2c4', asph: '#4d4c4a', plaza: '#e8e4dc', park: '#71894b', park2: '#5f5e5a', cem: '#a8916d', rock: '#7d6b57', foot: '#ddd6c9', steps: '#cfc6b5', relig: '#e3ddd2' } },
  madinah: { walls: [0xe6d9c2, 0xdccdb0, 0xd0bf9f, 0xf0e8d9, 0xcdbd9f, 0xe9dfcc, 0xd8c6a3, 0xc4b496], roof: 0xbfb4a0,
    lc: { base: '#cbbca1', side: '#ddd2bf', asph: '#4b4a48', plaza: '#ebe6dc', park: '#6f8a48', park2: '#5e5c58', cem: '#a48a64', rock: '#5e5045', foot: '#e2d9c8', steps: '#d2c6b2', relig: '#e7e1d6' } },
  aqsa: { walls: [0xe3d6bb, 0xdacaa6, 0xd1c09d, 0xe8dcc2, 0xcbb894, 0xddcfb2, 0xd6c49e, 0xc8b590], roof: 0xd2c4a6,
    lc: { base: '#b5a688', side: '#cdbf9f', asph: '#4c4b48', plaza: '#d9cdb3', park: '#7d8f52', park2: '#5c5a55', cem: '#a2987d', rock: '#8a7c63', foot: '#d3c6a8', steps: '#c9bb9c', relig: '#d6c9ae', wood: '#6f8148', pitch: '#6f8c4a' } }
};

/* ---------------- ส่วนอาคารทั่วไปของเมือง ---------------- */
function cityBuildings(D, C, cfg) {
  const facade = CM.facadeMaterial(C.nightU), chunks = new Map(), idx = new CM.Grid(40), B = new CM.Batch(), col = new THREE.Color(), roofCol = new THREE.Color();
  const roof = { tank: [], ac: [], solar: [], rdome: [] };
  let n = 0;
  D.b.forEach((b, bi) => {
    const [kind, hTag, mh, est, f, holes] = b;
    if (f.length < 6) return;
    const c = CM.pCentroid(f), area = Math.abs(CM.pArea(f)), bb = CM.pBounds(f), seed = H(bi * 1.7 + 3.1);
    const info = { kind, hTag, mh, est, f, c, area, bb, seed, i: bi };
    if (cfg.skip && cfg.skip(info)) return;
    let h = (!est && hTag > 0) ? hTag : cfg.estH(info);
    info.h = h;
    let gmin = 1e9, gsum = 0; const ring = toPts(f);
    for (const p of ring) { const g = C.ground(p[0], p[1]); gmin = Math.min(gmin, g); gsum += g; }
    const gavg = gsum / ring.length, base = mh > 0 ? gavg + mh : gmin - .4, top = Math.max(gavg + h, base + 1.5);
    if (kind === 2 && mh > 0 && hTag - mh > CM.pRadius(f, ...c) * 2.5) { const r = CM.pRadius(f, ...c), sp = hTag - mh; B.mesh(new THREE.ConeGeometry(r, sp, 14), LM.mats().gold, c[0], gavg + mh + sp / 2, c[1]); return; }
    if (kind === 2) { const r = CM.pRadius(f, ...c) * .97; const dh = hTag > mh && mh > 0 ? Math.min(hTag - mh, r * 1.2) : r * .9; LM.dome(B, cfg.domeMat ? cfg.domeMat(info) : LM.mats().white, c[0], mh > 0 ? gavg + mh : top - dh, c[1], r, dh, .5, 0, null, r > 3 ? .6 : 0); return; }
    if (kind === 3) { cfg.minaret(B, info, c[0], c[1], gmin, hTag > 0 ? hTag : 40, Math.max(1.6, Math.sqrt(area) / 2)); C.addRing(c[0], c[1], Math.sqrt(area) / 2 + .3, 8, C.layer); return; }
    const look = cfg.look(info);
    col.setHex(look.color); roofCol.setHex(look.roof || cfg.roofColor);
    if (kind === 5) { CM.extrude(cfg.buf = cfg.buf || new CM_BUF(), [ring], top - .5, top, 8, col, roofCol, seed); return; }
    const ck = Math.floor(c[0] / 300) + ',' + Math.floor(c[1] / 300);
    let buf = chunks.get(ck); if (!buf) chunks.set(ck, buf = new CM_BUF());
    const rings = [ring, ...(holes || []).map(toPts)];
    CM.extrude(buf, rings, base, top, look.style, col, roofCol, seed);
    n++;
    if (base < gmin + 2.5) for (const R of rings) for (let i = 0; i < R.length; i++) { const a = R[i], q = R[(i + 1) % R.length]; C.addWall(a[0], a[1], q[0], q[1], .2, C.layer); }
    idx.add(bb, { f, top, base });
    // ของบนหลังคา
    if (area > 60 && (look.style <= 2 || look.style === 6) && kind !== 6) {
      const cnt = clamp(Math.round(area / (look.style === 2 ? 90 : 160)), 1, 7);
      for (let k = 0; k < cnt; k++) {
        const x = bb[0] + H(bi + k * 7.7) * (bb[2] - bb[0]), z = bb[1] + H(bi * 3.3 + k * 1.9) * (bb[3] - bb[1]);
        if (!CM.pIn(f, x, z) || CM.pDist(f, x, z) < 1.4) continue;
        const r = H(bi * 5 + k);
        if (cfg.roofItems === 'jerusalem') { if (cfg.oldCity && cfg.oldCity(x, z) && r < .45) roof.rdome.push([x, top, z, 1.6 + H(bi + k) * 2]); else if (r < .75) roof.solar.push([x, top, z, H(k + bi * 2) * 6.28]); else roof.tank.push([x, top, z, 0]); }
        else { if (r < .55) roof.tank.push([x, top, z, 0]); else roof.ac.push([x, top, z, H(k * 3 + bi) * 6.28]); }
      }
    }
    // มัสยิดในชุมชน: โดม + หออะซาน
    if (kind === 1 && cfg.mosqueExtras !== false) {
      const r = clamp(Math.sqrt(area) * .26, 2.2, 9);
      LM.dome(B, cfg.smallDomeMat || LM.mats().white, c[0], top, c[1], r, r * .9, .6, area > 250 ? 1.4 : .6, LM.mats().white, area > 120 ? .55 : 0);
      if (area > 220) { let far = ring[0], fd = 0; for (const p of ring) { const d = Math.hypot(p[0] - c[0], p[1] - c[1]); if (d > fd) { fd = d; far = p; } } const mx = far[0] + (c[0] - far[0]) * 1.6 / fd, mz = far[1] + (c[1] - far[1]) * 1.6 / fd; cfg.minaret(B, Object.assign({ small: true }, info), mx, mz, gmin, Math.max(top - gavg + 10, 22 + Math.sqrt(area) * .4), 1.25); }
    }
  });
  for (const buf of chunks.values()) { const m = new THREE.Mesh(buf.geo(), facade); m.castShadow = true; m.receiveShadow = true; C.group.add(m); }
  if (cfg.buf) { const m = new THREE.Mesh(cfg.buf.geo(), facade); m.castShadow = true; C.group.add(m); }
  B.flush(C.group);
  // ของบนหลังคาแบบ instanced
  const o3 = new THREE.Object3D(), inst = (geo, mat, list, f) => { if (!list.length) return; const im = new THREE.InstancedMesh(geo, mat, list.length); list.forEach((p, k) => { f(o3, p); o3.updateMatrix(); im.setMatrixAt(k, o3.matrix); }); im.castShadow = true; im.receiveShadow = true; im.computeBoundingSphere(); C.group.add(im); };
  const std = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: .7 }, o || {}));
  inst(new THREE.CylinderGeometry(.6, .6, 1.4, 10).translate(0, .7, 0), std(0xeceae4), roof.tank, (o, p) => { o.position.set(p[0], p[1], p[2]); o.rotation.set(0, 0, 0); o.scale.setScalar(.8 + H(p[0]) * .5); });
  inst(new THREE.BoxGeometry(1, .72, .82).translate(0, .36, 0), std(0xa9adb1), roof.ac, (o, p) => { o.position.set(p[0], p[1], p[2]); o.rotation.set(0, p[3], 0); o.scale.setScalar(1); });
  inst(new THREE.BoxGeometry(2, .08, 1.1).rotateX(-.55).translate(0, .75, 0), std(0x1f2b3d, { roughness: .25, metalness: .4 }), roof.solar, (o, p) => { o.position.set(p[0], p[1], p[2]); o.rotation.set(0, p[3], 0); o.scale.setScalar(1); });
  inst(new THREE.CylinderGeometry(.3, .3, 1.7, 10).rotateZ(Math.PI / 2).translate(0, 1.25, -.6), std(0xe9e7e2), roof.solar, (o, p) => { o.position.set(p[0], p[1], p[2]); o.rotation.set(0, p[3], 0); o.scale.setScalar(1); });
  inst(CM.domeGeo(1, .8, .2, 14), std(0xd9cbac), roof.rdome, (o, p) => { o.position.set(p[0], p[1], p[2]); o.rotation.set(0, 0, 0); o.scale.setScalar(p[3]); });
  const blocked = (x, z, m = 0) => { for (const it of idx.at(x, z)) if (CM.pIn(it.f, x, z) || (m && CM.pDist(it.f, x, z) < m)) return true; if (m) { for (const dx of [-m, m]) for (const it of idx.at(x + dx, z)) if (CM.pDist(it.f, x, z) < m) return true; for (const dz of [-m, m]) for (const it of idx.at(x, z + dz)) if (CM.pDist(it.f, x, z) < m) return true; } return false; };
  return { idx, blocked, count: n };
}
// บัฟเฟอร์อาคาร (ใช้คลาสภายในของ citymap ผ่านตัวสร้างนี้)
class CM_BUF {
  constructor() { this.p = []; this.n = []; this.f = []; this.b = []; this.c = []; this.i = []; }
  get vc() { return this.p.length / 3; }
  v(x, y, z, nx, ny, nz, fu, fv, Bv, Cc) { this.p.push(x, y, z); this.n.push(nx, ny, nz); this.f.push(fu, fv); this.b.push(Bv[0], Bv[1], Bv[2], Bv[3]); this.c.push(Cc.r, Cc.g, Cc.b); return this.vc - 1; }
  geo() { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3)); g.setAttribute('aF', new THREE.Float32BufferAttribute(this.f, 2)); g.setAttribute('aB', new THREE.Float32BufferAttribute(this.b, 4)); g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3)); g.setIndex(this.i); g.computeBoundingSphere(); return g; }
}

// ดัชนีถนนสำหรับเช็กว่าจุดอยู่บนผิวจราจรหรือไม่
function roadIndex(roads) {
  const G = new CM.Grid(30);
  for (const r of roads) { if (r[0] > 6) continue; const I = CM.roadInfo(r), f = r[4]; for (let i = 0; i + 3 < f.length; i += 2) { const s = [f[i], f[i + 1], f[i + 2], f[i + 3], I.w / 2]; G.add([Math.min(s[0], s[2]) - s[4], Math.min(s[1], s[3]) - s[4], Math.max(s[0], s[2]) + s[4], Math.max(s[1], s[3]) + s[4]], s); } }
  return (x, z, m = 0) => { for (const s of G.at(x, z)) if (CM.segDist(x, z, s[0], s[1], s[2], s[3]) < s[4] + m) return true; return false; };
}

function wallsFromMap(D, C, ground, o = {}) {
  const B = new CM.Batch(), M = LM.mats(), merl = [];
  for (const w of D.w) {
    const [cls, h, f] = w; if (o.skip && o.skip(w)) continue;
    const thick = cls === 0 ? 3.2 : .55, mat = cls === 0 ? M.jstone : M.stone;
    for (let i = 0; i + 3 < f.length; i += 2) {
      const ax = f[i], az = f[i + 1], bx = f[i + 2], bz = f[i + 3], L = Math.hypot(bx - ax, bz - az); if (L < .2) continue;
      const nx = -(bz - az) / L, nz = (bx - ax) / L;
      const side = (x, z) => [ground(x + nx * 4, z + nz * 4), ground(x - nx * 4, z - nz * 4)];
      const sa = side(ax, az), sb = side(bx, bz), lo = Math.min(...sa, ...sb), hi = Math.max(...sa, ...sb);
      const top = cls === 0 ? Math.max(lo + h, hi + 3) : (Math.min(...sa, ...sb) + h);
      const g = new THREE.BoxGeometry(L, top - lo + 1, thick); const o3 = new THREE.Object3D(); o3.position.set((ax + bx) / 2, (top + lo - 1) / 2, (az + bz) / 2); o3.rotation.y = Math.atan2(-(bz - az), bx - ax); o3.updateMatrix();
      const uv = g.attributes.uv, p = g.attributes.position; for (let k = 0; k < uv.count; k++) uv.setXY(k, (p.getX(k) + L / 2) / 4, (p.getY(k)) / 2);
      B.add(mat, g, o3.matrix);
      C.addWall(ax, az, bx, bz, thick / 2, C.layer);
      if (cls === 0) for (let s = 1; s < L - .5; s += 2.2) merl.push([ax + (bx - ax) * s / L, top, az + (bz - az) * s / L, Math.atan2(-(bz - az), bx - ax)]);
    }
  }
  B.flush(C.group);
  if (merl.length) { const im = new THREE.InstancedMesh(new THREE.BoxGeometry(1.1, 1.2, thickM()).translate(0, .6, 0), M.jstone, merl.length), o3 = new THREE.Object3D(); merl.forEach((m, k) => { o3.position.set(m[0], m[1], m[2]); o3.rotation.set(0, m[3], 0); o3.updateMatrix(); im.setMatrixAt(k, o3.matrix); }); im.castShadow = true; im.computeBoundingSphere(); C.group.add(im); }
}
const thickM = () => 3.2;

function areaShapeMesh(C, list, mat, y) {
  const B = new CM.Batch();
  for (const f of list) { const s = new THREE.Shape(toPts(f).map(([x, z]) => new THREE.Vector2(x, z))); const g = new THREE.ShapeGeometry(s); const p = g.attributes.position, uv = g.attributes.uv; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getY(i); p.setXYZ(i, x, y, z); uv.setXY(i, x / 4.8, z / 4.8); } const idx = g.index.array; for (let t = 0; t < idx.length; t += 3) { const a = idx[t], b = idx[t + 1], c = idx[t + 2]; const cy = (p.getZ(b) - p.getZ(a)) * (p.getX(c) - p.getX(a)) - (p.getX(b) - p.getX(a)) * (p.getZ(c) - p.getZ(a)); if (cy < 0) { idx[t + 1] = c; idx[t + 2] = b; } } g.computeVertexNormals(); B.add(mat, g); }
  B.flush(C.group, false);
}
function groundPlane(C, tex, bb, y) {
  const g = new THREE.PlaneGeometry(bb[2] - bb[0], bb[3] - bb[1]); g.rotateX(-Math.PI / 2); g.translate((bb[0] + bb[2]) / 2, y, (bb[1] + bb[3]) / 2);
  const m = new THREE.Mesh(g, CM.groundMaterial(tex)); m.receiveShadow = true; C.group.add(m); return m;
}
function terrainMesh(C, T, bb, res, tex, fill) {
  const nx = Math.ceil((bb[2] - bb[0]) / res), nz = Math.ceil((bb[3] - bb[1]) / res), pos = [], uv = [], idx = [];
  for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) { const x = bb[0] + i * res, z = bb[1] + j * res; pos.push(x, T.height(x, z) - .02, z); uv.push(i / nx, 1 - j / nz); }
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const a = j * (nx + 1) + i; idx.push(a, a + nx + 1, a + 1, a + 1, a + nx + 1, a + nx + 2); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  const m = new THREE.Mesh(g, fill || CM.groundMaterial(tex)); m.receiveShadow = true; C.group.add(m); return m;
}
const solidTex = c => { const cv = document.createElement('canvas'); cv.width = cv.height = 8; const g = cv.getContext('2d'); g.fillStyle = c; g.fillRect(0, 0, 8, 8); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t; };

// เติมบ้านเรือนตามแนวถนนจริงในพื้นที่ที่แผนที่ยังไม่มีข้อมูลอาคาร (ชานเมือง)
function fillAlongRoads(D, o) {
  const occ = new Set(), cell = 9, mark = (x, z) => occ.add(Math.floor(x / cell) + ',' + Math.floor(z / cell)), used = (x, z) => occ.has(Math.floor(x / cell) + ',' + Math.floor(z / cell));
  for (const b of D.b) { const bb = CM.pBounds(b[4]); for (let x = bb[0]; x <= bb[2]; x += cell) for (let z = bb[1]; z <= bb[3]; z += cell) mark(x, z); }
  const roadAt = roadIndex(D.r), out = [];
  for (const r of D.r) {
    const cls = r[0]; if (cls > o.maxCls) continue; const I = CM.roadInfo(r), f = r[4];
    for (let i = 0; i + 3 < f.length; i += 2) {
      const ax = f[i], az = f[i + 1], bx = f[i + 2], bz = f[i + 3], L = Math.hypot(bx - ax, bz - az); if (L < 10) continue;
      const ux = (bx - ax) / L, uz = (bz - az) / L, nx = -uz, nz = ux;
      for (let s = 8; s < L - 8; s += o.step) for (const side of [-1, 1]) for (let row = 0; row < o.rows; row++) {
        const mx = ax + ux * s, mz = az + uz * s; if (!o.allow(mx, mz, cls)) continue;
        const sd = H(mx * .37 + mz * .91 + row * 7 + side), w = 12 + sd * 9, d = 11 + H(sd * 77) * 8, off = I.w / 2 + 6 + row * 24 + d / 2;
        const cx = mx + nx * side * off, cz = mz + nz * side * off;
        if (used(cx, cz) || !o.allow(cx, cz, cls) || o.ground(cx, cz) > .6 || H(cx + cz * 3.1) < .18) continue;
        const pts = [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]].map(([p, q]) => [cx + ux * p + nx * q, cz + uz * p + nz * q]);
        if (pts.some(p => roadAt(p[0], p[1], 2) || used(p[0], p[1]))) continue;
        for (const p of pts) mark(p[0], p[1]); mark(cx, cz);
        out.push([0, o.h(cx, cz, sd), 0, 0, pts.flat()]);
      }
    }
  }
  D.b.push(...out);
  return out.length;
}

/* ---------------- โหลดเมือง ---------------- */
export async function loadSite(id, X) {
  const r = await fetch(`assets/maps/${id}.json`); if (!r.ok) throw new Error('map ' + id + ' ' + r.status);
  const D = await r.json();
  LM.mats(X.nightU);
  const C = { group: X.group, layer: X.layer, addWall: X.addWall, addRing: X.addRing, nightU: X.nightU, ground: null };
  const S = { id, D, C, update: () => { }, ceil: () => 0, halls: [] };
  if (id === 'makkah') buildMakkah(S, X);
  else if (id === 'madinah') buildMadinah(S, X);
  else buildAqsa(S, X);
  return S;
}

/* ---------------- มักกะฮ์: เมืองจริงรอบฮะรอม (ส่วนฮะรอม กะอ์บะฮ์ มัสอา สร้างไว้แล้วใน world.js) ---------------- */
function buildMakkah(S, X) {
  const { D, C } = S, K = X.makkah, P = PAL.makkah;
  const T = CM.makeTerrain(D, { rockMax: 170 });
  S.T = T;
  C.ground = (x, z) => Math.max(K.fbGround(x, z), T.height(x, z));
  const nearHaram = (x, z, m) => K.inPoly(x, z) || K.distToPolyEdge(x, z) < m || K.masaLat(x, z) < 30 + m;
  const fullyHaram = f => { for (let i = 0; i < f.length; i += 2) if (!K.inPoly(f[i], f[i + 1])) return false; return true; };
  const GM = (D.L.greatMosque || []).map(g => g.p), CL = (D.L.clock || []).map(g => g.p);
  const inGM = (x, z) => GM.some(f => CM.pIn(f, x, z)), inCL = (x, z) => CL.some(f => CM.pIn(f, x, z));
  const skipRoad = r => { const f = r[4], i = Math.floor(f.length / 4) * 2; return nearHaram(f[i], f[i + 1], 2) || (r[0] >= 7 && inGM(f[i], f[i + 1])); };
  const bb = [-1400, -1400, 1400, 1400];
  const lc = CM.paintLandcover(D, { bbox: bb, pal: P.lc, skipRoad });
  groundPlane(C, lc, bb, .02);
  const rm = CM.rockMesh(T, X.rockMat); if (rm) C.group.add(rm);
  // ลานหินอ่อนรอบมัสยิด
  areaShapeMesh(C, D.a.filter(a => a[0] === 0 && Math.hypot(...CM.pCentroid(a[1])) < 900 && !fullyHaram(a[1])).map(a => a[1]), LM.mats().marble, .045);
  // ลานหินอ่อนสีขาวรอบมัสยิดอัลฮะรอม
  areaShapeMesh(C, [[-330, -430, 200, -430, 200, 292, -330, 292]], LM.mats().marble, .04);
  CM.buildRoads(C.group, D.r.filter(r => r[0] <= 6 && !skipRoad(r)), C.ground);
  const city = cityBuildings(D, C, {
    skip: i => nearHaram(i.c[0], i.c[1], 6) || (i.kind === 3 && i.hTag <= 0),
    estH: i => { const d = Math.hypot(i.c[0], i.c[1]); return d < 480 ? (i.area > 420 ? 46 + i.seed * 64 : 24 + i.seed * 26) : d < 950 ? 16 + i.seed * (i.area > 600 ? 40 : 24) : 9 + i.seed * 17; },
    look: i => {
      if (inCL(i.c[0], i.c[1])) return i.mh >= 455 ? { style: 7, color: 0xd9b75e, roof: 0xd9b75e } : i.mh >= 380 ? { style: 8, color: 0xf3f2ee, roof: 0xe9e7e2 } : { style: 6, color: 0xe6dcc6 };
      if (inGM(i.c[0], i.c[1])) return { style: 3, color: 0xf2f0ea, roof: 0xe9e6de };
      if (i.kind === 1) return { style: 4, color: 0xf0ede6 };
      if (i.kind === 10) return { style: 5, color: 0xb9b6b0 };
      const tall = i.h > 34;
      return { style: tall ? (i.seed < .55 ? 6 : 1) : 0, color: P.walls[Math.floor(i.seed * 977) % P.walls.length] };
    },
    roofColor: P.roof, roofItems: 'tanks',
    minaret: (B, i, x, z, y, h, r) => LM.minaret(B, i.small ? 'small' : 'nabawi', x, z, y, h, r)
  });
  S.city = city;
  CM.buildTrees(C.group, toPts(D.t).map(p => [p[0], p[1], 'palm']), ['palm'], C.ground);
  wallsFromMap(D, C, C.ground, { skip: w => nearHaram(w[2][0], w[2][1], 4) });
  // หน้าปัดนาฬิกาบนหอนาฬิกาจริง
  let best = null; for (const b of D.b) { if (!(b[2] <= 410 && b[1] >= 420)) continue; const c = CM.pCentroid(b[4]); if (!inCL(c[0], c[1])) continue; const r = CM.pRadius(b[4], ...c); if (!best || r > best.r) best = { c, r, mh: b[2], h: b[1] }; }
  S.clock = best ? { x: best.c[0], z: best.c[1], half: best.r / Math.SQRT2, y: Math.min(best.h - 22, Math.max(best.mh + 22, 408)) } : { x: -69, z: 483, half: 30, y: 410 };
  const roadAt = roadIndex(D.r);
  S.blocked = (x, z, m = 0) => city.blocked(x, z, m) || roadAt(x, z, m);
  const looks = PE.cityLooks('makkah');
  const plazas = [[-330, -430, 200, -430, 200, 292, -330, 292], ...D.a.filter(a => a[0] === 0 && Math.hypot(...CM.pCentroid(a[1])) < 800 && !fullyHaram(a[1])).map(a => a[1])];
  S.walkers = LF.createWalkers(C.group, { roads: D.r.filter(r => !skipRoad(r)), ground: C.ground, looks, count: Math.round(340 * Q), center: [0, 0], radius: 700, plazas, plazaShare: .35, blocked: (x, z) => city.blocked(x, z, .8) || nearHaram(x, z, 3) || roadAt(x, z, 1.5), skip: (x, z) => nearHaram(x, z, 3) });
  S.traffic = LF.createTraffic(C.group, D.r.filter(r => !skipRoad(r)), C.ground, { max: Math.round(230 * Q), spacing: 60, noCars: (x, z) => nearHaram(x, z, 10) });
  S.update = (dt, Pp) => { S.walkers.update(dt, Pp); if (S.traffic) S.traffic.update(dt, Pp); };
  S.minimap = CM.minimapCanvas(D, bb, 1536, { skipRoad });
}

/* ---------------- มะดีนะฮ์ ---------------- */
function buildMadinah(S, X) {
  const { D, C } = S, P = PAL.madinah, L = D.L;
  // ภูเขาจริงรอบเมือง: ญะบัลสะลัอ์ เนินนักธนู และแนวเขาอุฮุด
  if (L.sela) D.a.push([6, L.sela[0].p, 80, 1]);
  if (L.uhudArchers) D.a.push([6, L.uhudArchers[0].p, 18, 2]);
  D.a.push([6, [-4200, -4380, -1500, -4300, 600, -4420, 2600, -4380, 4600, -4600, 5200, -5600, 3000, -6000, 0, -6100, -3000, -5900, -4800, -5300], 330, .9]);
  D.a.push([6, [-5200, 900, -4300, 300, -3700, 1300, -4100, 2600, -5000, 2400], 140, 1.2]);
  const T = CM.makeTerrain(D, {});
  S.T = T; C.ground = (x, z) => T.height(x, z);
  const big = [-6500, -7000, 6500, 5500], core = [-1400, -1400, 1400, 1400];
  groundPlane(C, solidTex('#c9b38e'), [-12000, -12000, 12000, 12000], -.06);
  const nab = L.nabawi[0].p, inNab = (x, z) => CM.pIn(nab, x, z), fullyIn = f => { for (let i = 0; i < f.length; i += 2) if (!inNab(f[i], f[i + 1]) && CM.pDist(nab, f[i], f[i + 1]) > 1) return false; return true; };
  const plazaPolys = D.a.filter(a => a[0] === 0).map(a => a[1]), inPlaza = (x, z) => plazaPolys.some(f => CM.pIn(f, x, z));
  const skipRoad = r => { const f = r[4], i = Math.floor(f.length / 4) * 2; return inNab(f[i], f[i + 1]); };
  groundPlane(C, CM.paintLandcover(D, { bbox: big, size: 2048, pal: P.lc, skipRoad }), big, .01);
  groundPlane(C, CM.paintLandcover(D, { bbox: core, size: 2048, pal: P.lc, skipRoad }), core, .025);
  const rm = CM.rockMesh(T, X.rockMat); if (rm) C.group.add(rm);
  areaShapeMesh(C, D.a.filter(a => a[0] === 0 && !fullyIn(a[1]) && Math.hypot(...CM.pCentroid(a[1])) < 900).map(a => a[1]), LM.mats().marble, .05);
  // ลานหินอ่อนสีขาวรอบมัสยิด (ฝั่งตะวันออกเว้นสุสานอัลบะกีอ์)
  const nb0 = CM.pBounds(nab), ax1 = Math.min(nb0[2] + 70, 200), apron = [nb0[0] - 140, nb0[1] - 150, ax1, nb0[1] - 150, ax1, nb0[3] + 175, nb0[0] - 140, nb0[3] + 175];
  areaShapeMesh(C, [apron], LM.mats().marble, .042);
  const roadAt = roadIndex(D.r);
  CM.buildRoads(C.group, D.r.filter(r => r[0] <= 6 && !skipRoad(r)), C.ground);
  // ชุมชนตามถนนระหว่างมัสยิดนะบะวีย์กับกุบาอ์ กิบลาตัยน์ และอุฮุด
  const SPOTS = [[588, 3122, 115], [-3302, -1836, 80], [124, -3985, 120], [70, -3843, 95]];
  const nFill = fillAlongRoads(D, {
    maxCls: 5, step: 31, rows: 2, ground: C.ground, h: (x, z, s) => 6 + s * 13,
    allow: (x, z, cls) => { const d = Math.hypot(x + 20, z + 110); if (d < 1050 || d > 5200) return false; if (SPOTS.some(s => Math.hypot(x - s[0], z - s[1]) < s[2])) return false; if ((L.uhudBattle && CM.pIn(L.uhudBattle[0].p, x, z)) || (L.baqi && CM.pIn(L.baqi[0].p, x, z))) return false; return cls <= 3 || SPOTS.some(s => Math.hypot(x - s[0], z - s[1]) < 650); }
  });
  console.info('madinah filler buildings:', nFill);
  const city = cityBuildings(D, C, {
    skip: i => (inNab(i.c[0], i.c[1]) && i.kind !== 3),
    estH: i => { const d = Math.hypot(i.c[0], i.c[1]); return d < 480 ? (i.area > 450 ? 38 + i.seed * 26 : 18 + i.seed * 20) : d < 1300 ? (i.area > 700 ? 20 + i.seed * 22 : 11 + i.seed * 15) : 7 + i.seed * 10; },
    look: i => {
      if (i.kind === 1) return { style: 4, color: 0xf1eee7 };
      if (i.kind === 10) return { style: 5, color: 0xb8b4ac };
      if (i.kind === 7) return { style: 4, color: 0xe9e2d4 };
      const tall = i.h > 28 || i.kind === 4;
      return { style: tall ? (i.seed < .7 ? 6 : 1) : 0, color: P.walls[Math.floor(i.seed * 977) % P.walls.length] };
    },
    roofColor: P.roof, roofItems: 'tanks',
    minaret: (B, i, x, z, y, h, r) => LM.minaret(B, (!i.small && CM.pDist(nab, x, z) < 40) ? 'nabawi' : 'small', x, z, y, h, i.small ? r : Math.max(r, 2.6))
  });
  S.city = city;
  const nb = LM.buildNabawi(C, D);
  S.halls.push(nb.hall);
  S.blocked = (x, z, m = 0) => city.blocked(x, z, m) || roadAt(x, z, m) || inNab(x, z);
  const ums = LM.plazaUmbrellas(C, D, nab, nb.ang, (x, z, m) => city.blocked(x, z, m) || roadAt(x, z, 2));
  LM.buildBaqi(C, D, C.ground);
  // มัสยิดกุบาอ์ (มุมทั้ง 4 = หออะซานจริง) / กิบลาตัยน์ / ซัยยิดุชชุฮะดาอ์ (อุฮุด)
  const B = new CM.Batch();
  const qm = D.p.filter(p => p[0] === 0 && p[2] > 2900);
  if (qm.length >= 3) {
    const xs = qm.map(p => p[1]), zs = qm.map(p => p[2]), b = [Math.min(...xs), Math.min(...zs), Math.max(...xs), Math.max(...zs)];
    const ring = [[b[0] + 2, b[1] + 2], [b[2] - 2, b[1] + 2], [b[2] - 2, b[3] - 2], [b[0] + 2, b[3] - 2]];
    const domes = (L.qubaDome || []).map(d => { const c = CM.pCentroid(d.p); return [c[0], c[1], CM.pRadius(d.p, ...c) * .9, 1.4]; });
    LM.simpleMosque(C, B, ring, { H: 12, domes, minarets: qm.map(p => [p[1], p[2]]), minH: 47, minR: 2.2 });
    areaShapeMesh(C, [[b[0] - 60, b[1] - 50, b[2] + 60, b[1] - 50, b[2] + 60, b[3] + 70, b[0] - 60, b[3] + 70]], LM.mats().marble, .04);
  }
  for (const [k, nd, nm] of [['qiblatain', 2, 2], ['shuhada', 3, 4]]) {
    if (!L[k]) continue;
    const f = L[k][0].p, ring = toPts(f), c = CM.pCentroid(f), b = CM.pBounds(f), wide = b[2] - b[0] > b[3] - b[1];
    const domes = [...Array(nd)].map((_, i) => { const t = (i + 1) / (nd + 1) - .5; return wide ? [c[0] + t * (b[2] - b[0]) * .8, c[1], Math.min(b[3] - b[1], b[2] - b[0]) * .18, 1.6] : [c[0], c[1] + t * (b[3] - b[1]) * .8, Math.min(b[3] - b[1], b[2] - b[0]) * .18, 1.6]; });
    const mins = nm === 2 ? (wide ? [[b[0] + 3, c[1]], [b[2] - 3, c[1]]] : [[c[0], b[1] + 3], [c[0], b[3] - 3]]) : [[b[0] + 3, b[1] + 3], [b[2] - 3, b[1] + 3], [b[2] - 3, b[3] - 3], [b[0] + 3, b[3] - 3]];
    LM.simpleMosque(C, B, ring, { H: 11, domes, minarets: mins, minH: nm === 2 ? 34 : 40, minR: 2, y0: C.ground(c[0], c[1]) });
    areaShapeMesh(C, [[b[0] - 35, b[1] - 35, b[2] + 35, b[1] - 35, b[2] + 35, b[3] + 35, b[0] - 35, b[3] + 35]], LM.mats().marble, .04);
  }
  B.flush(C.group);
  CM.buildTrees(C.group, toPts(D.t).filter(p => !inNab(p[0], p[1])), ['palm', 'palm', 'ficus'], C.ground, 3);
  wallsFromMap(D, C, C.ground, { skip: w => inNab(w[2][0], w[2][1]) });
  const looks = PE.cityLooks('madinah');
  const plazas = [apron, ...D.a.filter(a => a[0] === 0 && !fullyIn(a[1]) && Math.hypot(...CM.pCentroid(a[1])) < 800).map(a => a[1])];
  S.walkers = LF.createWalkers(C.group, { roads: D.r.filter(r => !skipRoad(r)), ground: C.ground, looks, count: Math.round(420 * Q), center: [-20, -110], radius: 650, plazas, plazaShare: .5, blocked: (x, z) => city.blocked(x, z, .8) || inNab(x, z) || roadAt(x, z, 1.5), skip: inNab });
  // ผู้คนนั่ง/ยืนใต้ร่ม และแถวละหมาดในมัสยิด
  const still = [];
  for (const u of ums) for (let k = 0; k < 2; k++) { const a = H(u[0] * 3 + k) * 6.28, d = 2 + H(u[2] + k) * 8; still.push([u[0] + Math.cos(a) * d, 0, u[2] + Math.sin(a) * d, H(k + u[0]) * 6.28]); }
  { const ca = Math.cos(nb.ang), sa = Math.sin(nb.ang), cols = nb.hall.cols; for (let k = 0; k < 260; k++) { const c = cols[Math.floor(H(k * 1.3) * cols.length)]; if (!c) break; const ox = 2 + H(k * 2.1) * 3, oz = (H(k * 4.7) - .5) * 4; const x = c[0] + ox * ca - oz * sa, z = c[1] + ox * sa + oz * ca; if (nb.hall.inside(x, z)) still.push([x, .06, z, -nb.ang + Math.PI]); } }
  LF.createStill(C.group, looks, still);
  S.traffic = LF.createTraffic(C.group, D.r.filter(r => !skipRoad(r)), C.ground, { max: Math.round(280 * Q), spacing: 55, center: [-20, -110], radius: 1600, noCars: (x, z) => inNab(x, z) || inPlaza(x, z) });
  S.update = (dt, Pp) => { S.walkers.update(dt, Pp); if (S.traffic) S.traffic.update(dt, Pp); };
  S.ceil = (x, z) => nb.inside(x, z) ? nb.ceil : 0;
  S.minimap = CM.minimapCanvas(D, [-1500, -1500, 1500, 1500], 1536, { skipRoad });
  S.minimapWide = CM.minimapCanvas(D, big, 1536, { skipRoad });
}

/* ---------------- อัลกุดส์: มัสยิดอัลอักศอและเมืองเก่า ---------------- */
function buildAqsa(S, X) {
  const { D, C } = S, P = PAL.aqsa, L = D.L;
  const F = LM.aqsaFlats(D), U = LM.AQSA.up;
  const T0 = CM.makeTerrain(D, { flats: [{ poly: F.up || [0, 0, 0, 0, 0, 0], y: U }, { poly: F.comp, y: 0 }] });
  const height = (x, z) => { const s = F.height(x, z); return s !== null ? s : T0.height(x, z); };
  const T = Object.assign({}, T0, { height, aqsa: F, aqsaHalls: [] });
  S.T = T; C.ground = height;
  // เมืองเก่า = รูปหลายเหลี่ยมจากแนวกำแพงเมือง
  const wp = []; for (const w of D.w) if (w[0] === 0) for (let i = 0; i < w[2].length; i += 2) wp.push([w[2][i], w[2][i + 1]]);
  const oc = wp.reduce((a, p) => [a[0] + p[0] / wp.length, a[1] + p[1] / wp.length], [0, 0]);
  const near = wp.filter(p => Math.hypot(p[0] - oc[0], p[1] - oc[1]) < 900).sort((a, b) => Math.atan2(a[1] - oc[1], a[0] - oc[0]) - Math.atan2(b[1] - oc[1], b[0] - oc[0]));
  const oldF = near.flat(), oldCity = (x, z) => oldF.length > 6 && CM.pIn(oldF, x, z);
  const d = D.dem, bb = [d.x0, d.z0 + (d.ny - 1) * d.dz, d.x0 + (d.nx - 1) * d.dx, d.z0];
  const inComp = (x, z) => CM.pIn(F.comp, x, z);
  const skipRoad = r => false;
  const lc = CM.paintLandcover(D, { bbox: bb, pal: P.lc, skipRoad });
  terrainMesh(C, T, bb, 9, lc);
  // พื้นรอบนอกขอบแผนที่: ไล่ความสูงตามขอบ
  { const bb2 = [bb[0] - 4000, bb[1] - 4000, bb[2] + 4000, bb[3] + 4000]; const m = terrainMesh(C, { height: (x, z) => (x > bb[0] && x < bb[2] && z > bb[1] && z < bb[3]) ? T0.height(x, z) - 3 : T0.height(clamp(x, bb[0], bb[2]), clamp(z, bb[1], bb[3])) - 2 }, bb2, 120, null, CM.groundMaterial(solidTex('#a99a7c'))); m.position.y = -.5; }
  CM.buildRoads(C.group, D.r.filter(r => r[0] <= 6), C.ground, { dem: true });
  const stairsNear = (x, z, m) => F.stairs.some(s => Math.hypot(x - s.ex, z - s.ez) < m);
  const city = cityBuildings(D, C, {
    skip: i => (inComp(i.c[0], i.c[1]) && (stairsNear(i.c[0], i.c[1], 12) || (F.up && CM.pIn(F.up, i.c[0], i.c[1])))) || (i.kind === 3),
    estH: i => i.kind === 8 ? 13 + i.seed * 10 : oldCity(i.c[0], i.c[1]) ? 6.5 + i.seed * 6 : (i.area > 600 ? 15 + i.seed * 12 : 9 + i.seed * 9),
    look: i => {
      if (i.kind === 6) return { style: 8, color: 0xd9cba9 };
      if (i.kind === 10) return { style: 5, color: 0xb8b2a6 };
      if (i.kind === 1) return { style: 2, color: 0xe2d5b9, roof: 0xd8caa8 };
      return { style: 2, color: P.walls[Math.floor(i.seed * 977) % P.walls.length], roof: P.roof };
    },
    roofColor: P.roof, roofItems: 'jerusalem', oldCity,
    smallDomeMat: LM.mats().stoneJ, domeMat: i => inComp(i.c[0], i.c[1]) ? LM.mats().lead : LM.mats().stoneJ,
    minaret: (B, i, x, z, y, h, r) => LM.minaret(B, 'mamluk', x, z, y, Math.max(h, 30), 2.8)
  });
  S.city = city;
  LM.buildAqsa(C, D, T);
  S.halls.push(...T.aqsaHalls);
  // หออะซาน 4 แห่งของอัลอักศอ (จุดจริงจากแผนที่ + ตำแหน่งที่ทราบ)
  const B = new CM.Batch(), mins = D.p.filter(p => p[0] === 0 && inComp(p[1], p[2])).map(p => [p[1], p[2]]);
  for (const q of [[-138, -206], [96, -233]]) if (!mins.some(m => Math.hypot(m[0] - q[0], m[1] - q[1]) < 30)) mins.push(q);
  for (const [x, z] of mins) { LM.minaret(B, 'mamluk', x, z, height(x, z), 38, 2.9); C.addRing(x, z, 3.2, 8, C.layer); }
  B.flush(C.group);
  // ต้นมะกอกและสนไซเปรสบนลานด้านล่าง (ข้อมูลแผนที่มีต้นไม้ในลานไม่ครบ)
  const extraT = [], cb = CM.pBounds(F.comp);
  for (let k = 0; k < 1500 && extraT.length < 170; k++) {
    const x = cb[0] + H(k * 1.31) * (cb[2] - cb[0]), z = cb[1] + H(k * 2.77 + 1) * (cb[3] - cb[1]);
    if (!inComp(x, z) || CM.pDist(F.comp, x, z) < 6 || (F.up && (CM.pIn(F.up, x, z) || CM.pDist(F.up, x, z) < 7)) || stairsNear(x, z, 16) || T.aqsaHalls.some(h => h.inside(x, z) || CM.pDist(L.qibli[0].p, x, z) < 12) || city.blocked(x, z, 4)) continue;
    if (H(k * 7.1) < .35) continue;
    extraT.push([x, z, H(k * 3.3) < .65 ? 'olive' : 'cypress']);
  }
  CM.buildTrees(C.group, [...toPts(D.t).filter(p => !(F.up && CM.pIn(F.up, p[0], p[1]) && Math.hypot(p[0], p[1]) < 40)), ...extraT], ['olive', 'olive', 'cypress', 'pine'], C.ground, 7);
  wallsFromMap(D, C, C.ground);
  const roadAt = roadIndex(D.r);
  S.blocked = (x, z, m = 0) => city.blocked(x, z, m) || roadAt(x, z, m);
  const looks = PE.cityLooks('aqsa');
  const compLow = [F.comp], plazas = [...compLow, ...(F.up ? [F.up] : [])];
  S.walkers = LF.createWalkers(C.group, { roads: D.r.filter(r => r[0] >= 7 || !oldCity(...r[4])), ground: C.ground, looks, count: Math.round(400 * Q), center: [0, 0], radius: 700, plazas, plazaShare: .45, blocked: (x, z) => city.blocked(x, z, .8) || (F.up && CM.pIn(F.up, x, z) && Math.hypot(x, z) < 30) || stairsNear(x, z, 6) || T.aqsaHalls.some(h => h.inside(x, z)) || (F.up && Math.abs(CM.pDist(F.up, x, z)) < 2) });
  const still = []; for (let k = 0; k < 160; k++) { const a = H(k * 3.7) * 6.28, r = 32 + H(k * 1.9) * 40, x = Math.cos(a) * r, z = Math.sin(a) * r; if (F.up && CM.pIn(F.up, x, z) && !city.blocked(x, z, 1)) still.push([x, U + .03, z, H(k) * 6.28]); }
  LF.createStill(C.group, looks, still);
  S.traffic = LF.createTraffic(C.group, D.r, C.ground, { max: Math.round(160 * Q), spacing: 70, noCars: (x, z) => oldCity(x, z) || inComp(x, z) });
  S.update = (dt, Pp) => { S.walkers.update(dt, Pp); if (S.traffic) S.traffic.update(dt, Pp); };
  const dor = CM.pCentroid(L.domeRock[0].p), oct = L.domeRock[0].p, dr = L.domeRockDome ? CM.pRadius(L.domeRockDome[0].p, ...CM.pCentroid(L.domeRockDome[0].p)) : 11;
  S.ceil = (x, z) => { if (CM.pIn(oct, x, z)) return Math.hypot(x - dor[0], z - dor[1]) < dr * .95 ? U + 30 : U + 10.9; for (const h of T.aqsaHalls) if (h.inside(x, z)) return h.ceil; return 0; };
  S.minimap = CM.minimapCanvas(D, bb, 1536, {});
  S.oldCity = oldCity;
}
