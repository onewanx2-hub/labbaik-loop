// ชีวิตในเมือง: รถยนต์วิ่งตามถนนจริง (เลี้ยวที่ทางแยก ชะลอเมื่อมีรถหรือคนข้างหน้า) และผู้คนเดินบนทางเท้า/ลาน
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import * as PE from './people.js';
import { roadInfo, pIn, pBounds } from './citymap.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const key = (x, z) => Math.round(x * 2) + ',' + Math.round(z * 2);

/* ---------------- เส้นทาง (เส้นหลายจุด) + จุดเชื่อม ---------------- */
function makePath(pts, ground, extra) {
  const L = [0]; for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return Object.assign({ pts, y: pts.map(p => ground(p[0], p[1])), len: L[L.length - 1] }, extra);
}
function linkGraph(paths) {
  const J = new Map();
  paths.forEach((p, pi) => p.pts.forEach((q, i) => { const k = key(q[0], q[1]); let l = J.get(k); if (!l) J.set(k, l = []); l.push([pi, i]); }));
  for (const p of paths) p.j = p.pts.map(q => J.get(key(q[0], q[1])).length > 1 ? J.get(key(q[0], q[1])) : null);
  return J;
}
// เลือกทางต่อที่ทางแยก (ไม่ย้อนทางเดิม ถ้าเลี่ยงได้)
function nextAt(paths, p, i, cur, allowOneway) {
  const list = p.j[i]; if (!list) return null;
  const opts = [];
  for (const [pi, vi] of list) {
    const q = paths[pi];
    for (const d of [1, -1]) {
      if (pi === cur && ((d === 1 && vi >= i) || (d === -1 && vi <= i)) && false) continue;
      if (vi + d < 0 || vi + d >= q.pts.length) continue;
      if (q.oneway && d === -1 && !allowOneway) continue;
      if (pi === cur && vi === i) continue;
      opts.push([pi, vi, d]);
    }
  }
  return opts.length ? opts[Math.floor(Math.random() * opts.length)] : null;
}

/* ---------------- โมเดลรถ ---------------- */
function colorize(g, fn) {
  g = g.index ? g.toNonIndexed() : g;
  const p = g.attributes.position, n = g.attributes.normal, c = new Float32Array(p.count * 3), C = new THREE.Color();
  for (let i = 0; i < p.count; i++) { fn(C, p.getX(i), p.getY(i), p.getZ(i), n.getX(i), n.getY(i), n.getZ(i)); c[i * 3] = C.r; c[i * 3 + 1] = C.g; c[i * 3 + 2] = C.b; }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'color'].includes(k)) g.deleteAttribute(k);
  return g;
}
const GLASS = new THREE.Color(0x1d2830), TIRE = new THREE.Color(0x161616), RIM = new THREE.Color(0x9a9ea3), TRIM = new THREE.Color(0x2a2a2c);
function carBody(prof, L, W, belt, roofY) {
  const s = new THREE.Shape(prof.map(([x, y]) => new THREE.Vector2(x * L / 2, y)));
  const g = new THREE.ExtrudeGeometry(s, { depth: W, bevelEnabled: true, bevelThickness: .06, bevelSize: .06, bevelSegments: 1, steps: 1 });
  g.translate(0, 0, -W / 2);
  return colorize(g, (C, x, y, z, nx, ny) => {
    if (y > belt + .02 && !(ny > .8 && y > roofY - .08)) C.copy(GLASS);
    else if (y < .42) C.copy(TRIM);
    else C.setRGB(1, 1, 1);
  });
}
function wheels(L, W, r, xs) {
  const out = [];
  for (const x of xs) for (const s of [-1, 1]) {
    const t = new THREE.CylinderGeometry(r, r, .26, 12); t.rotateX(Math.PI / 2); t.translate(x, r, s * (W / 2 - .1));
    out.push(colorize(t, (C, X, Y, Z, nx, ny, nz) => C.copy(Math.abs(nz) > .9 && Math.hypot(X - x, Y - r) < r * .6 ? RIM : TIRE)));
  }
  return out;
}
const TYPES = {
  sedan: { L: 4.7, W: 1.82, prof: [[-1, .3], [-1, .82], [-.86, .98], [-.56, 1.02], [-.32, 1.42], [.22, 1.44], [.48, 1.02], [.92, .9], [1, .7], [1, .3]], belt: 1.0, roof: 1.44, r: .33, wx: [-.62, .62] },
  suv: { L: 4.9, W: 1.96, prof: [[-1, .38], [-1, 1.0], [-.94, 1.72], [.3, 1.76], [.56, 1.16], [.96, 1.05], [1, .78], [1, .38]], belt: 1.14, roof: 1.76, r: .38, wx: [-.62, .64] },
  van: { L: 5.3, W: 2.0, prof: [[-1, .36], [-1, 2.12], [.66, 2.16], [.9, 1.24], [1, 1.02], [1, .36]], belt: 1.2, roof: 2.16, r: .37, wx: [-.64, .66] },
  pickup: { L: 5.2, W: 1.9, prof: [[-1, .38], [-1, 1.02], [-.18, 1.02], [-.16, 1.68], [.32, 1.7], [.54, 1.12], [.96, 1.02], [1, .74], [1, .38]], belt: 1.08, roof: 1.7, r: .38, wx: [-.62, .64] },
  bus: { L: 12, W: 2.5, prof: [[-1, .4], [-1, 3.15], [.98, 3.15], [1, 2.6], [1, .4]], belt: 1.25, roof: 3.15, r: .5, wx: [-.62, .58], bus: true }
};
function carGeo(t) {
  const T = TYPES[t], parts = [];
  if (T.bus) {
    const b = new THREE.BoxGeometry(T.L, 2.75, T.W, 12, 3, 1); b.translate(0, 1.78, 0);
    parts.push(colorize(b, (C, x, y, z, nx, ny, nz) => {
      if (Math.abs(nz) > .9 && y > 1.85 && y < 2.85 && Math.abs(x) < T.L / 2 - .3) C.copy(GLASS);
      else if (nx > .9 && y > 1.4 && y < 2.95) C.copy(GLASS);
      else if (y < 1.25 && y > 1.0) C.setHex(0x1f7a4a);
      else if (y < .6) C.copy(TRIM); else C.setHex(0xf2f2ee);
    }));
  } else parts.push(carBody(T.prof, T.L, T.W, T.belt, T.roof));
  parts.push(...wheels(T.L, T.W, T.r, T.wx.map(f => f * T.L)));
  return mergeGeometries(parts, false);
}
function lightGeo(t) {
  const T = TYPES[t], parts = [];
  const add = (x, y, z, w, h, d, col) => { const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y, z); parts.push(colorize(g, C => C.setHex(col))); };
  const fy = T.bus ? .9 : T.prof.find(p => p[0] === 1)[1] - .08, ry = T.bus ? .9 : T.prof[1][1] - .1;
  for (const s of [-1, 1]) { add(T.L / 2 + .02, fy, s * (T.W / 2 - .28), .06, .14, .34, 0xfff4d6); add(-T.L / 2 - .02, ry, s * (T.W / 2 - .22), .06, .14, .3, 0xff2a1a); }
  return mergeGeometries(parts, false);
}
const PAINT = [0xf2f2f0, 0xf2f2f0, 0xf2f2f0, 0xeeeeea, 0xc9ccd0, 0xb8bcc2, 0x2a2c30, 0x1c1d20, 0x8c9096, 0x23314f, 0x7a1e1e, 0xd8c8a6, 0x5a6b5a, 0xa8a49b];

/* ---------------- การจราจร ---------------- */
export function createTraffic(parent, roads, ground, o = {}) {
  const paths = [];
  for (const r of roads) {
    if (r[0] > 6) continue; const I = roadInfo(r), f = r[4], pts = [];
    for (let i = 0; i < f.length; i += 2) pts.push([f[i], f[i + 1]]);
    const mid = pts[Math.floor(pts.length / 2)];
    if (o.noCars && o.noCars(mid[0], mid[1])) continue;
    paths.push(makePath(pts, ground, { oneway: I.oneway, lanes: I.oneway ? I.lanes : Math.max(1, Math.floor(I.lanes / 2)), cls: I.cls, w: I.w }));
  }
  if (!paths.length) return null;
  linkGraph(paths);
  // น้ำหนักการสุ่มตำแหน่งรถ: ถนนใหญ่และใกล้ใจกลางเมืองมีรถมากกว่า
  const Cc = o.center || [0, 0], Rr = o.radius || 1200;
  for (const p of paths) { const m = p.pts[Math.floor(p.pts.length / 2)], d = Math.hypot(m[0] - Cc[0], m[1] - Cc[1]); p.wt = p.len * (p.cls <= 2 ? 2 : p.cls <= 4 ? 1.3 : p.cls === 5 ? .7 : .35) * (d < Rr ? 1 + 2.5 * (1 - d / Rr) : .15); }
  const total = paths.reduce((a, p) => a + p.wt, 0);
  const N = Math.min(o.max || 260, Math.round(paths.reduce((a, p) => a + p.len * (p.cls <= 4 ? 1 : .5), 0) / (o.spacing || 55)));
  const kinds = ['sedan', 'sedan', 'sedan', 'suv', 'suv', 'pickup', 'van', 'bus'];
  const cars = [], mats = { body: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .35, metalness: .35 }), light: new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }) };
  const pick = () => { let r = Math.random() * total; for (const p of paths) { r -= p.wt; if (r <= 0) return p; } return paths[0]; };
  const spawn = c => {
    const p = pick(); c.p = paths.indexOf(p); c.dir = p.oneway ? 1 : (Math.random() < .5 ? 1 : -1);
    c.i = c.dir === 1 ? Math.floor(Math.random() * (p.pts.length - 1)) : 1 + Math.floor(Math.random() * (p.pts.length - 1));
    c.s = Math.random() * segLen(p, c.i, c.dir); c.lane = Math.floor(Math.random() * p.lanes);
    c.vmax = (p.cls <= 1 ? 15 : p.cls <= 3 ? 11.5 : p.cls === 4 ? 9 : 6.5) * (.8 + Math.random() * .35); c.v = c.vmax * .6;
  };
  const segLen = (p, i, d) => { const a = p.pts[i], b = p.pts[i + d]; return b ? Math.hypot(b[0] - a[0], b[1] - a[1]) : 0; };
  const counts = {}; for (let k = 0; k < N; k++) { const t = kinds[Math.floor(Math.random() * kinds.length)]; counts[t] = (counts[t] || 0) + 1; cars.push({ t }); }
  const meshes = {};
  for (const [t, n] of Object.entries(counts)) {
    const body = new THREE.InstancedMesh(carGeo(t), mats.body, n), lit = new THREE.InstancedMesh(lightGeo(t), mats.light, n);
    body.castShadow = true; body.receiveShadow = true; body.frustumCulled = lit.frustumCulled = false;
    parent.add(body); parent.add(lit); meshes[t] = { body, lit, n: 0 };
  }
  const col = new THREE.Color();
  for (const c of cars) { const M = meshes[c.t]; c.slot = M.n++; spawn(c); M.body.setColorAt(c.slot, col.setHex(TYPES[c.t].bus ? 0xffffff : PAINT[Math.floor(Math.random() * PAINT.length)])); }
  for (const M of Object.values(meshes)) M.body.instanceColor.needsUpdate = true;
  const o3 = new THREE.Object3D(), cell = new Map();
  const state = { cars, paths, meshes };
  state.setNight = n => mats.light.color.setScalar(n ? 2.2 : .75);
  state.setNight(false);
  state.update = (dt, P) => {
    cell.clear();
    for (const c of cars) { const k = Math.floor(c.x / 24) * 7919 + Math.floor(c.z / 24); let l = cell.get(k); if (!l) cell.set(k, l = []); l.push(c); }
    for (const c of cars) {
      const p = paths[c.p];
      // ระยะว่างข้างหน้า (รถคันอื่น/ผู้เล่น)
      let gap = 1e9;
      if (c.x !== undefined) {
        const hx = c.hx, hz = c.hz;
        for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
          const l = cell.get((Math.floor(c.x / 24) + a) * 7919 + Math.floor(c.z / 24) + b); if (!l) continue;
          for (const d of l) { if (d === c) continue; const dx = d.x - c.x, dz = d.z - c.z, f = dx * hx + dz * hz; if (f <= 0 || f > 22) continue; const lat = Math.abs(dx * -hz + dz * hx); if (lat < 1.8 && d.hx * hx + d.hz * hz > .3) gap = Math.min(gap, f - (TYPES[d.t].L + TYPES[c.t].L) / 2); }
        }
        if (P) { const dx = P.x - c.x, dz = P.z - c.z, f = dx * hx + dz * hz; if (f > 0 && f < 14 && Math.abs(dx * -hz + dz * hx) < 2.2) gap = Math.min(gap, f - TYPES[c.t].L / 2 - 1.5); }
      }
      const want = gap < 1e8 ? clamp((gap - 2.5) * 1.1, 0, c.vmax) : c.vmax;
      c.v += clamp(want - c.v, -9 * dt, 3 * dt);
      c.s += c.v * dt;
      let L = segLen(p, c.i, c.dir), guard = 0;
      while (c.s >= L && guard++ < 8) {
        c.s -= L; c.i += c.dir;
        const P2 = paths[c.p], end = c.i + c.dir < 0 || c.i + c.dir >= P2.pts.length;
        if (end || (P2.j[c.i] && Math.random() < .3)) {
          const nx = nextAt(paths, P2, c.i, c.p, false);
          if (nx) { c.p = nx[0]; c.i = nx[1]; c.dir = nx[2]; c.lane = Math.min(c.lane, paths[c.p].lanes - 1); }
          else if (end) { if (!P || Math.hypot(P.x - c.x, P.z - c.z) > 160 || P2.oneway) spawn(c); else { c.dir = -c.dir; } }
        }
        L = segLen(paths[c.p], c.i, c.dir); if (!L) { spawn(c); L = segLen(paths[c.p], c.i, c.dir); }
      }
      const q = paths[c.p], A = q.pts[c.i], B = q.pts[c.i + c.dir], t = L ? c.s / L : 0;
      let hx = B[0] - A[0], hz = B[1] - A[1]; const hl = Math.hypot(hx, hz) || 1; hx /= hl; hz /= hl;
      const off = q.oneway ? (c.lane - (q.lanes - 1) / 2) * 3.3 : (.5 + c.lane) * 3.2 - .2;
      c.x = A[0] + (B[0] - A[0]) * t - hz * off; c.z = A[1] + (B[1] - A[1]) * t + hx * off; c.hx = hx; c.hz = hz;
      const y = q.y[c.i] + (q.y[c.i + c.dir] - q.y[c.i]) * t + .06;
      o3.position.set(c.x, y, c.z); o3.rotation.set(0, Math.atan2(-hz, hx), 0); o3.updateMatrix();
      const M = meshes[c.t]; M.body.setMatrixAt(c.slot, o3.matrix); M.lit.setMatrixAt(c.slot, o3.matrix);
    }
    for (const M of Object.values(meshes)) { M.body.instanceMatrix.needsUpdate = true; M.lit.instanceMatrix.needsUpdate = true; }
  };
  // ดันผู้เล่นออกจากตัวรถ
  state.push = P => {
    for (const c of cars) {
      const dx = P.x - c.x, dz = P.z - c.z; if (dx * dx + dz * dz > 49) continue;
      const T = TYPES[c.t], f = dx * c.hx + dz * c.hz, l = dx * -c.hz + dz * c.hx, hl = T.L / 2 + .35, hw = T.W / 2 + .35;
      if (Math.abs(f) < hl && Math.abs(l) < hw) { if (hl - Math.abs(f) < hw - Math.abs(l)) { const nf = Math.sign(f) * hl; P.x = c.x + c.hx * nf - c.hz * l; P.z = c.z + c.hz * nf + c.hx * l; } else { const nl = Math.sign(l) * hw; P.x = c.x + c.hx * f - c.hz * nl; P.z = c.z + c.hz * f + c.hx * nl; } }
    }
  };
  state.update(0, null);
  return state;
}

/* ---------------- ผู้คนเดินในเมือง ---------------- */
export function createWalkers(parent, o) {
  const { looks, ground } = o, paths = [];
  for (const r of o.roads) {
    const f = r[4], pts = []; for (let i = 0; i < f.length; i += 2) pts.push([f[i], f[i + 1]]);
    if (pts.length < 2) continue;
    const mid = pts[Math.floor(pts.length / 2)]; if (o.skip && o.skip(mid[0], mid[1])) continue;
    if (r[0] >= 7) paths.push(makePath(pts, ground, { side: 0, w: r[0] === 7 ? 4 : 1.4 }));
    else if (r[0] >= 2 && r[0] <= 6) {
      // ทางเท้าสองข้างถนน
      const I = roadInfo(r);
      for (const s of [-1, 1]) {
        const sp = pts.map((p, k) => { const a = pts[Math.max(0, k - 1)], b = pts[Math.min(pts.length - 1, k + 1)]; let dx = b[0] - a[0], dz = b[1] - a[1]; const l = Math.hypot(dx, dz) || 1; return [p[0] - dz / l * (I.w / 2 + 1.6) * s, p[1] + dx / l * (I.w / 2 + 1.6) * s]; });
        paths.push(makePath(sp, ground, { side: s, w: 1.2 }));
      }
    }
  }
  linkGraph(paths);
  const C = o.center || [0, 0], R = o.radius || 900;
  const weight = p => { const m = p.pts[Math.floor(p.pts.length / 2)], d = Math.hypot(m[0] - C[0], m[1] - C[1]); return p.len * (d < R ? 1 + 2.5 * (1 - d / R) : .15) * (p.side ? .6 : 1.4); };
  const tot = paths.reduce((a, p) => a + weight(p), 0);
  const pick = () => { let r = Math.random() * tot; for (const p of paths) { r -= weight(p); if (r <= 0) return p; } return paths[0]; };
  const plazas = (o.plazas || []).map(f => ({ f, b: pBounds(f) }));
  const insideOK = (x, z) => !(o.blocked && o.blocked(x, z));
  const randIn = Z => { for (let k = 0; k < 30; k++) { const x = Z.b[0] + Math.random() * (Z.b[2] - Z.b[0]), z = Z.b[1] + Math.random() * (Z.b[3] - Z.b[1]); if (pIn(Z.f, x, z) && insideOK(x, z)) return [x, z]; } return null; };
  const N = Math.min(o.count || 300, 900), nPlaza = plazas.length ? Math.round(N * (o.plazaShare ?? .4)) : 0;
  const ag = [], o3 = new THREE.Object3D();
  const variants = looks.map(l => ({ l, list: [] }));
  for (let k = 0; k < N; k++) {
    const a = { v: .95 + Math.random() * .6, off: (Math.random() - .5) };
    if (paths.length && k >= nPlaza) { a.mode = 'path'; const p = pick(); a.p = paths.indexOf(p); a.dir = Math.random() < .5 ? 1 : -1; a.i = a.dir === 1 ? Math.floor(Math.random() * (p.pts.length - 1)) : 1 + Math.floor(Math.random() * (p.pts.length - 1)); a.s = Math.random() * 4; a.off *= p.w; }
    else if (plazas.length) { a.mode = 'plaza'; a.z0 = plazas[Math.floor(Math.random() * plazas.length)]; const s = randIn(a.z0) || [a.z0.f[0], a.z0.f[1]]; a.x = s[0]; a.z = s[1]; a.t = randIn(a.z0) || s; }
    else continue;
    const vr = variants[Math.floor(Math.random() * variants.length)]; vr.list.push(a); a.vr = vr; ag.push(a);
  }
  const mat = PE.crowdMaterial();
  for (const vr of variants) {
    if (!vr.list.length) continue;
    const geo = PE.mergedFigure(vr.l, 'xlo'), ph = new Float32Array(vr.list.length);
    vr.list.forEach(a => { a.ph = Math.random() * 6.28; });
    vr.phase = new THREE.InstancedBufferAttribute(ph, 1); vr.phase.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('aPhase', vr.phase);
    vr.mesh = new THREE.InstancedMesh(geo, mat, vr.list.length); vr.mesh.frustumCulled = false; vr.mesh.receiveShadow = true; parent.add(vr.mesh);
  }
  const segLen = (p, i, d) => { const a = p.pts[i], b = p.pts[i + d]; return b ? Math.hypot(b[0] - a[0], b[1] - a[1]) : 0; };
  // วาดเฉพาะคนที่อยู่ใกล้ผู้เล่น (ลดภาระการเรนเดอร์) แต่ทุกคนยังเดินต่อไปตามปกติ
  const NEAR = o.near || 190;
  const update = (dt, V) => {
    for (const vr of variants) vr.k = 0;
    for (const a of ag) {
      let x, z, y, hx, hz;
      if (a.mode === 'path') {
        let p = paths[a.p]; a.s += a.v * dt; let L = segLen(p, a.i, a.dir), g = 0;
        while (a.s >= L && g++ < 6) {
          a.s -= L; a.i += a.dir; const end = a.i + a.dir < 0 || a.i + a.dir >= p.pts.length;
          if (end || (p.j[a.i] && Math.random() < .35)) { const nx = nextAt(paths, p, a.i, a.p, true); if (nx) { a.p = nx[0]; a.i = nx[1]; a.dir = nx[2]; } else if (end) a.dir = -a.dir; }
          p = paths[a.p]; L = segLen(p, a.i, a.dir); if (!L) { a.dir = -a.dir; L = segLen(p, a.i, a.dir) || 1; }
        }
        const A = p.pts[a.i], B = p.pts[a.i + a.dir], t = a.s / L;
        hx = (B[0] - A[0]) / L; hz = (B[1] - A[1]) / L;
        x = A[0] + (B[0] - A[0]) * t - hz * a.off; z = A[1] + (B[1] - A[1]) * t + hx * a.off; y = p.y[a.i] + (p.y[a.i + a.dir] - p.y[a.i]) * t;
      } else {
        const dx = a.t[0] - a.x, dz = a.t[1] - a.z, d = Math.hypot(dx, dz);
        if (d < .6) { a.t = randIn(a.z0) || [a.x + 1, a.z]; hx = a.hx || 0; hz = a.hz || 1; }
        else { hx = dx / d; hz = dz / d; a.x += hx * a.v * dt; a.z += hz * a.v * dt; a.hx = hx; a.hz = hz; }
        x = a.x; z = a.z;
        a.gy = a.gy === undefined || (a.gt = (a.gt || 0) + dt) > .5 ? (a.gt = 0, ground(x, z)) : a.gy; y = a.gy;
      }
      a.x = x; a.z = z;
      if (V && Math.abs(x - V.x) + Math.abs(z - V.z) > NEAR) continue;
      const vr = a.vr; o3.position.set(x, y + .02, z); o3.rotation.set(0, Math.atan2(hx, hz), 0); o3.updateMatrix(); vr.mesh.setMatrixAt(vr.k, o3.matrix); vr.phase.array[vr.k] = a.ph; vr.k++;
    }
    for (const vr of variants) if (vr.mesh) { vr.mesh.count = vr.k; vr.mesh.instanceMatrix.needsUpdate = true; vr.phase.needsUpdate = true; }
  };
  update(0);
  return { update, count: ag.length, paths };
}

// กลุ่มคนยืน/นั่งพัก (ไม่เคลื่อนที่) เช่น ใต้ร่มลานมัสยิด
export function createStill(parent, looks, spots) {
  const mat = PE.crowdMaterial(true), o3 = new THREE.Object3D(), by = looks.map(() => []);
  spots.forEach(s => by[Math.floor(Math.random() * looks.length)].push(s));
  by.forEach((list, i) => {
    if (!list.length) return;
    const geo = PE.mergedFigure(looks[i], 'xlo'); geo.setAttribute('aPhase', new THREE.InstancedBufferAttribute(new Float32Array(list.length), 1));
    const m = new THREE.InstancedMesh(geo, mat, list.length); m.receiveShadow = true;
    list.forEach(([x, y, z, r], k) => { o3.position.set(x, y, z); o3.rotation.set(0, r, 0); o3.updateMatrix(); m.setMatrixAt(k, o3.matrix); });
    m.computeBoundingSphere(); parent.add(m);
  });
}
