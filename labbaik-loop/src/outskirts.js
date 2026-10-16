// นอกเมือง: ชุมชนริมถนน เส้นจราจร และต้นอินทผลัม (ฉากสำรอง)
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { ROADS } from './data.js';

// พื้นที่พิเศษที่ไม่ควรมีบ้านเรือน (มินา ญะมะรอต มุซดะลิฟะฮ์ อะเราะฟะฮ์ ตันอีม)
const NO_BUILD = [[6700, 650, 1350], [4819, -22, 520], [11431, 4301, 1400], [16364, 7475, 2400], [-3637, -5131, 260]];
const blocked = (x, z) => NO_BUILD.some(([cx, cz, r]) => Math.hypot(x - cx, z - cz) < r);

// ส่วนของถนนที่อยู่นอกรัศมีเมือง (ในเมืองใช้ถนนจริงจากแผนที่)
function segments(minR = 0) {
  const out = [];
  for (const r of ROADS) for (let k = 0; k < r.length - 1; k++) {
    let [ax, az] = r[k], [bx, bz] = r[k + 1];
    const da = Math.hypot(ax, az), db = Math.hypot(bx, bz);
    if (da < minR && db < minR) continue;
    if (da < minR || db < minR) { let lo = 0, hi = 1; for (let i = 0; i < 24; i++) { const t = (lo + hi) / 2; if ((Math.hypot(ax + (bx - ax) * t, az + (bz - az) * t) < minR) === (da < minR)) lo = t; else hi = t; } const x = ax + (bx - ax) * lo, z = az + (bz - az) * lo; if (da < minR) { ax = x; az = z; } else { bx = x; bz = z; } }
    const L = Math.hypot(bx - ax, bz - az); if (L < 1) continue;
    out.push({ ax, az, L, ux: (bx - ax) / L, uz: (bz - az) / L });
  }
  return out;
}

export function buildOutskirts(c) {
  const rr = c.rng(311), segs = segments(c.minR || 0), o = new THREE.Object3D(), col = new THREE.Color();

  /* ชุมชนสองข้างถนน */
  const boxes = [];
  for (const s of segs) {
    const nx = -s.uz, nz = s.ux;
    for (let d = 0; d < s.L; d += 38) {
      const px = s.ax + s.ux * d, pz = s.az + s.uz * d, dc = Math.hypot(px, pz);
      if (dc < 1500 || dc > 9500 || blocked(px, pz)) continue;
      const rows = dc < 4000 ? 6 : 3;
      for (const side of [-1, 1]) for (let row = 0; row < rows; row++) {
        if (rr() < .3) continue;
        const off = 32 + row * 40 + rr() * 10, x = px + nx * side * off + (rr() - .5) * 12, z = pz + nz * side * off + (rr() - .5) * 12;
        const w = 13 + rr() * 16, dd = 13 + rr() * 16;
        if (blocked(x, z) || c.roadD(x, z) < 22) continue;
        if (c.ground(x, z) > .3 || c.ground(x - w / 2, z - dd / 2) > .3 || c.ground(x + w / 2, z + dd / 2) > .3) continue;
        const h = 6 + rr() * (dc < 3500 ? 30 : 13);
        boxes.push([x, z, w, dd, h]);
      }
    }
  }
  const bg = new THREE.BoxGeometry(1, 1, 1); bg.translate(0, .5, 0);
  const bm = new THREE.InstancedMesh(bg, c.windowMat, boxes.length), pal = [0xe6dccb, 0xd8ccb6, 0xefe9df, 0xcfc4b0, 0xe0d0b4, 0xc9bfae, 0xd7c2a3];
  boxes.forEach(([x, z, w, d, h], k) => { o.position.set(x, 0, z); o.scale.set(w, h, d); o.rotation.set(0, 0, 0); o.updateMatrix(); bm.setMatrixAt(k, o.matrix); col.setHex(pal[k % pal.length]); bm.setColorAt(k, col); if (Math.hypot(x, z) < 4500) c.addAABB(x - w / 2, z - d / 2, x + w / 2, z + d / 2); });
  bm.receiveShadow = true; c.fb.add(bm);

  /* เส้นจราจร: เส้นประกลางถนน + เส้นขอบถนน */
  const dashes = [];
  for (const s of segs) for (let d = 6; d < s.L - 3; d += 14) dashes.push([s.ax + s.ux * d, s.az + s.uz * d, Math.atan2(-s.uz, s.ux)]);
  const dm = new THREE.InstancedMesh(new THREE.BoxGeometry(6, .02, .32), new THREE.MeshStandardMaterial({ color: 0xf2f0ea, roughness: .6 }), dashes.length);
  dashes.forEach(([x, z, a], k) => { o.position.set(x, .09, z); o.rotation.set(0, a, 0); o.scale.set(1, 1, 1); o.updateMatrix(); dm.setMatrixAt(k, o.matrix); });
  c.fb.add(dm);
  const edgeMat = new THREE.MeshStandardMaterial({ color: 0xd9c98a, roughness: .7 });
  for (const s of segs) for (const side of [-1, 1]) {
    const nx = -s.uz * side * 10.6, nz = s.ux * side * 10.6, L = s.L;
    const m = new THREE.Mesh(new THREE.BoxGeometry(L, .02, .25), edgeMat);
    m.position.set(s.ax + s.ux * L / 2 + nx, .09, s.az + s.uz * L / 2 + nz); m.rotation.y = Math.atan2(-s.uz, s.ux); c.fb.add(m);
  }

  /* ต้นอินทผลัมริมถนน */
  const palms = [];
  for (const s of segs) {
    const nx = -s.uz, nz = s.ux;
    for (let d = 10; d < s.L; d += 36) for (const side of [-1, 1]) {
      const x = s.ax + s.ux * d + nx * side * 15, z = s.az + s.uz * d + nz * side * 15, dc = Math.hypot(x, z);
      if (dc < Math.max(620, c.minR || 0) || dc > 4500 || c.ground(x, z) > .2 || c.inPoly(x, z)) continue;
      palms.push([x, z, .85 + rr() * .35, rr() * Math.PI * 2]);
    }
  }
  const trunk = new THREE.CylinderGeometry(.17, .3, 9, 6, 3); trunk.translate(0, 4.5, 0);
  { const p = trunk.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setX(i, p.getX(i) + Math.sin(y * .35) * .25); } trunk.computeVertexNormals(); }
  const fronds = [];
  for (let k = 0; k < 7; k++) {
    const g = new THREE.ConeGeometry(.55, 4.2, 3, 1); g.scale(1, 1, .18); g.translate(0, 2.1, 0);
    g.rotateZ(-1.15 - (k % 2) * .25); g.rotateY(k / 7 * Math.PI * 2); g.translate(.25 * Math.sin(9 * .35), 9, 0);
    fronds.push(g);
  }
  fronds.push(new THREE.SphereGeometry(.45, 6, 4).translate(.25 * Math.sin(9 * .35), 8.8, 0));
  const crown = mergeGeometries(fronds.map(g => { for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k); return g.index ? g : g; }), false);
  const tm = new THREE.InstancedMesh(trunk, new THREE.MeshStandardMaterial({ color: 0x7a6047, roughness: 1 }), palms.length);
  const cm = new THREE.InstancedMesh(crown, new THREE.MeshStandardMaterial({ color: 0x5f8a3e, roughness: .85, flatShading: true, side: THREE.DoubleSide }), palms.length);
  palms.forEach(([x, z, s, a], k) => { o.position.set(x, 0, z); o.rotation.set(0, a, 0); o.scale.setScalar(s); o.updateMatrix(); tm.setMatrixAt(k, o.matrix); cm.setMatrixAt(k, o.matrix); });
  c.fb.add(tm); c.fb.add(cm);
  return { buildings: boxes.length, palms: palms.length, dashes: dashes.length };
}
