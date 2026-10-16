// สถาปัตยกรรมมัสยิดอัลฮะรอม (ฉากสำรอง): ซุ้มโค้งหลายชั้น ลานมะฏอฟแปดเหลี่ยมแบบขั้นบันได ประตูใหญ่ หอคอย โดม
// และวัสดุตึกรอบข้างที่มีหน้าต่างจริง
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { POLY } from './data.js';

// รวมชิ้นส่วนที่ใช้วัสดุเดียวกันเป็นเมชเดียว เพื่อลดจำนวนคำสั่งวาดต่อเฟรม
let BATCH = null;
function batchStart() { BATCH = new Map(); }
function batchAdd(mat, geo) { if (!BATCH.has(mat)) BATCH.set(mat, []); BATCH.get(mat).push(geo); }
function batchFlush(parent) {
  for (const [mat, list] of BATCH) { const g = mergeGeometries(list, false); if (!g) continue; const m = new THREE.Mesh(g, mat); m.castShadow = m.receiveShadow = true; parent.add(m); }
  BATCH = null;
}
function splitGroups(geo) {
  const out = new Map();
  for (const gr of geo.groups) { const sub = new THREE.BufferGeometry(); for (const k in geo.attributes) sub.setAttribute(k, geo.attributes[k]); sub.setIndex(Array.from(geo.index.array.slice(gr.start, gr.start + gr.count))); if (!out.has(gr.materialIndex)) out.set(gr.materialIndex, []); out.get(gr.materialIndex).push(sub); }
  return out;
}

export const HALL_H = 11, ROOF_H = 27;
export const octagon = R => [...Array(8)].map((_, k) => { const a = (22.5 + 45 * k) * Math.PI / 180; return [R * Math.cos(a), R * Math.sin(a)]; });
export const C0 = octagon(62), C1 = octagon(71), C2 = octagon(80);

/* ---------------- textures ---------------- */
function noise(g, w, h, a) { for (let i = 0; i < w * h / 18; i++) { const v = Math.random() * 40 | 0; g.fillStyle = `rgba(${120 + v},${115 + v},${105 + v},${a})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); } }
function archPath(g, cx, hw, yBot, yTop, ySpring) {
  g.beginPath(); g.moveTo(cx - hw, yBot); g.lineTo(cx - hw, ySpring);
  g.quadraticCurveTo(cx - hw, ySpring - (ySpring - yTop) * .55, cx, yTop);
  g.quadraticCurveTo(cx + hw, ySpring - (ySpring - yTop) * .55, cx + hw, ySpring);
  g.lineTo(cx + hw, yBot); g.closePath();
}
function opening(g, w, h, m, cx, hw, y0, y1, spring, frame, lattice) {
  const Y = y => h - y * m;
  g.fillStyle = '#d6cfc1'; archPath(g, cx, (hw + frame) * m, Y(y0), Y(y1 + frame), Y(spring)); g.fill();
  g.save(); archPath(g, cx, hw * m, Y(y0), Y(y1), Y(spring)); g.clip();
  const gr = g.createLinearGradient(0, Y(y1), 0, Y(y0)); gr.addColorStop(0, '#262b31'); gr.addColorStop(1, '#3c424a');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  if (lattice) { g.strokeStyle = 'rgba(200,204,208,.32)'; g.lineWidth = 1.1; for (let d = -h; d < w + h; d += 8) { g.beginPath(); g.moveTo(d, 0); g.lineTo(d + h, h); g.stroke(); g.beginPath(); g.moveTo(d, h); g.lineTo(d + h, 0); g.stroke(); } }
  g.restore();
}
function crenel(g, w, h, m, y) {
  const Y = v => h - v * m;
  g.fillStyle = '#d2cbbd'; g.fillRect(0, Y(y), w, .55 * m);
  g.fillStyle = '#e3dfd6';
  for (let x = 0; x < w; x += m) { g.beginPath(); g.moveTo(x + .2 * m, Y(y + .55)); g.lineTo(x + .2 * m, Y(y + .95)); g.lineTo(x + .5 * m, Y(y + 1.35)); g.lineTo(x + .8 * m, Y(y + .95)); g.lineTo(x + .8 * m, Y(y + .55)); g.fill(); }
}
let T = null;
function textures(canvasTex) {
  if (T) return T;
  // ด้านหน้าอาคารหลัก: 1 ช่วงเสา กว้าง 7 ม. สูง 27 ม. (3 ชั้น)
  const facade = canvasTex(224, 864, (g, w, h) => {
    const m = 32, Y = y => h - y * m;
    g.fillStyle = '#efede7'; g.fillRect(0, 0, w, h); noise(g, w, h, .05);
    g.fillStyle = '#d6d0c4'; g.fillRect(0, Y(1.1), w, 1.1 * m);
    g.fillStyle = '#e2ded5'; g.fillRect(0, 0, .45 * m, h); g.fillRect(w - .45 * m, 0, .45 * m, h);
    opening(g, w, h, m, w / 2, 2.1, 1.1, 9.8, 7.5, .38, true);
    g.fillStyle = '#d2ccbf'; g.fillRect(0, Y(11.3), w, .8 * m);
    opening(g, w, h, m, w / 2, 1.6, 12.4, 18.5, 16.6, .32, true);
    g.fillStyle = '#d2ccbf'; g.fillRect(0, Y(19.9), w, .6 * m);
    for (const s of [-1, 1]) opening(g, w, h, m, w / 2 + s * 1.4 * m, .62, 20.9, 24.7, 23.9, .22, false);
    crenel(g, w, h, m, 25.6);
  });
  // ประตูใหญ่: กว้าง 22 ม. สูง 36 ม. ช่องโค้งกลางโปร่ง (ใช้ alphaTest)
  const gate = canvasTex(440, 720, (g, w, h) => {
    const m = 20, Y = y => h - y * m, cx = w / 2;
    g.fillStyle = '#efece5'; g.fillRect(0, 0, w, h); noise(g, w, h, .05);
    g.fillStyle = '#e0dbd1'; g.fillRect(0, 0, 2.2 * m, h); g.fillRect(w - 2.2 * m, 0, 2.2 * m, h);
    for (const sx of [1.1, 20.9]) for (const [a, b, s] of [[4, 9, 7.6], [11.5, 16.5, 15.1], [19, 24, 22.6]]) opening(g, w, h, m, sx * m, .65, a, b, s, .18, false);
    g.fillStyle = '#d5cdbd'; archPath(g, cx, 8.4 * m, Y(0), Y(27.2), Y(18)); g.fill();
    g.strokeStyle = '#c9a24a'; g.lineWidth = 3; archPath(g, cx, 7.3 * m, Y(0), Y(25.6), Y(17.4)); g.stroke();
    g.fillStyle = '#1f3a33'; g.fillRect(2.2 * m, Y(31), w - 4.4 * m, 2 * m);
    g.fillStyle = '#d8b65e'; for (let x = 2.6 * m; x < w - 2.6 * m; x += 14) g.fillRect(x, Y(30.3), 8, 6);
    crenel(g, w, h, m, 34.5);
    g.globalCompositeOperation = 'destination-out'; archPath(g, cx, 6.6 * m, Y(-1), Y(24.6), Y(16.8)); g.fill(); g.globalCompositeOperation = 'source-over';
  });
  // ชั้นลดหลั่นรอบลานมะฏอฟ: ช่วงเสา 5 ม. สูง 8 ม.
  const tier = canvasTex(160, 256, (g, w, h) => {
    const m = 32; g.fillStyle = '#ecebe6'; g.fillRect(0, 0, w, h); noise(g, w, h, .04);
    opening(g, w, h, m, w / 2, 1.75, .5, 6.9, 5.4, .25, false);
    g.fillStyle = '#d4cec2'; g.fillRect(0, 0, w, .5 * m);
  });
  // ระเบียงชั้นล่างรอบลาน (แบบออตโตมัน): ช่วงเสา 5 ม. สูง 11 ม.
  const portico = canvasTex(160, 352, (g, w, h) => {
    const m = 32; g.fillStyle = '#dcd6ca'; g.fillRect(0, 0, w, h); noise(g, w, h, .06);
    opening(g, w, h, m, w / 2, 1.9, 0, 8.6, 6.9, .3, false);
    g.fillStyle = '#c8c0b1'; g.fillRect(0, 0, w, 1.2 * m);
    g.fillStyle = '#9d8f78'; for (let x = 6; x < w; x += 18) g.fillRect(x, .45 * m, 8, 8);
  });
  // หินอ่อนปูพื้น: 4 x 4 ม.
  const paving = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#f2f0eb'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 10; i++) { g.strokeStyle = `rgba(150,150,155,${.04 + Math.random() * .08})`; g.lineWidth = .6 + Math.random(); g.beginPath(); let x = Math.random() * w, y = Math.random() * h; g.moveTo(x, y); for (let k = 0; k < 10; k++) { x += (Math.random() - .5) * 40; y += (Math.random() - .3) * 30; g.lineTo(x, y); } g.stroke(); }
    g.strokeStyle = 'rgba(0,0,0,.09)'; g.lineWidth = 1.5; for (let p = 0; p <= w; p += 64) { g.beginPath(); g.moveTo(p, 0); g.lineTo(p, h); g.stroke(); g.beginPath(); g.moveTo(0, p); g.lineTo(w, p); g.stroke(); }
  });
  // พรมแดงลายแถวละหมาด และเพดานลายช่องสี่เหลี่ยมสีทอง
  const carpet = canvasTex(256, 256, (g, w) => {
    g.fillStyle = '#8c1d22'; g.fillRect(0, 0, w, w);
    for (let r = 0; r < 4; r++) { const y = r * 64; g.fillStyle = '#c9a24a'; g.fillRect(0, y, w, 5); for (let x = 0; x < w; x += 32) { g.fillStyle = '#6b1418'; g.beginPath(); g.moveTo(x + 16, y + 12); g.quadraticCurveTo(x + 30, y + 30, x + 16, y + 54); g.quadraticCurveTo(x + 2, y + 30, x + 16, y + 12); g.fill(); g.strokeStyle = '#b8934a'; g.lineWidth = 1.2; g.strokeRect(x + 3, y + 9, 26, 50); } }
    for (let i = 0; i < 3000; i++) { g.fillStyle = `rgba(0,0,0,${Math.random() * .08})`; g.fillRect(Math.random() * w, Math.random() * w, 1, 1); }
  });
  const ceiling = canvasTex(256, 256, (g, w) => {
    g.fillStyle = '#f1ebdd'; g.fillRect(0, 0, w, w);
    g.strokeStyle = '#c8a45a'; g.lineWidth = 8; g.strokeRect(8, 8, w - 16, w - 16); g.lineWidth = 2; g.strokeRect(28, 28, w - 56, w - 56);
    g.fillStyle = '#e2d4b4'; g.beginPath(); g.arc(w / 2, w / 2, 62, 0, 7); g.fill();
    for (let k = 0; k < 8; k++) { g.save(); g.translate(w / 2, w / 2); g.rotate(k * Math.PI / 4); g.fillStyle = '#b8954c'; g.fillRect(-5, -60, 10, 34); g.restore(); }
  });
  T = { facade, gate, tier, portico, paving, carpet, ceiling };
  return T;
}
const repeatClone = (t, rx, ry) => { const c = t.clone(); c.repeat.set(rx, ry); c.needsUpdate = true; return c; };

let MATS = null;
export function haramMats(ctx) {
  if (MATS) return MATS;
  const t = textures(ctx.canvasTex), std = ctx.std;
  MATS = {
    facade: std(0xffffff, { map: t.facade, emissiveMap: t.facade, roughness: .82 }),
    gate: std(0xffffff, { map: t.gate, emissiveMap: t.gate, alphaTest: .5, side: THREE.DoubleSide, roughness: .8 }),
    tier: std(0xffffff, { map: t.tier, emissiveMap: t.tier, roughness: .8 }),
    portico: std(0xffffff, { map: t.portico, emissiveMap: t.portico, roughness: .8 }),
    roof: std(0xffffff, { map: repeatClone(t.paving, .2, .2), roughness: .9, side: THREE.DoubleSide }),
    mataf: std(0xffffff, { map: repeatClone(t.paving, .45, .45), roughness: .3 }),
    plaza: std(0xffffff, { map: repeatClone(t.paving, 140, 140), roughness: .7 }),
    white: std(0xf3f1ec, { roughness: .7 }), dark: std(0x24262a, { roughness: .6 }), gold: std(0xd2ab55, { roughness: .3, metalness: .85 }),
    bronze: std(0x8b5a2b, { roughness: .35, metalness: .7 }), lampHead: std(0xfff3d6, { emissive: 0x000000 }),
    carpet: std(0xffffff, { map: repeatClone(t.carpet, 1 / 4.8, 1 / 4.8), roughness: .95, side: THREE.DoubleSide }),
    ceiling: std(0xffffff, { map: repeatClone(t.ceiling, 1 / 5.5, 1 / 5.5), roughness: .8, side: THREE.DoubleSide }),
    brass: std(0xb8964e, { roughness: .35, metalness: .8 })
  };
  MATS.lit = [[MATS.facade, 0x7a756b], [MATS.gate, 0x7a756b], [MATS.tier, 0x8a857b], [MATS.portico, 0x6e695f], [MATS.roof, 0x3a3833], [MATS.mataf, 0x8c8a84], [MATS.white, 0x6e6b64], [MATS.lampHead, 0xffe2a8], [MATS.bronze, 0x3a2410], [MATS.carpet, 0x3a1214], [MATS.ceiling, 0x6a6458]];
  return MATS;
}

// กล่องผนังที่ยืดลายตามความยาวจริง (ลายซุ้มโค้งไม่ถูกยืด)
export function facadeBox(parent, ax, az, bx, bz, thick, h, y0, mat, topMat, bay) {
  const dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz);
  const g = new THREE.BoxGeometry(L, h, thick), uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) { const f = Math.floor(i / 4); if (f >= 4) uv.setX(i, uv.getX(i) * L / bay); else if (f <= 1) uv.setX(i, uv.getX(i) * thick / bay); }
  const mats = [mat, mat, topMat, topMat, mat, mat];
  if (BATCH) {
    const o = new THREE.Object3D(); o.position.set((ax + bx) / 2, y0 + h / 2, (az + bz) / 2); o.rotation.y = Math.atan2(-dz, dx); o.updateMatrix();
    if (parent.userData.batchMatrix) o.matrix.premultiply(parent.userData.batchMatrix);
    g.applyMatrix4(o.matrix);
    for (const [mi, subs] of splitGroups(g)) for (const s of subs) batchAdd(mats[mi], s);
    return null;
  }
  const m = new THREE.Mesh(g, mats);
  m.position.set((ax + bx) / 2, y0 + h / 2, (az + bz) / 2); m.rotation.y = Math.atan2(-dz, dx);
  m.castShadow = m.receiveShadow = true; parent.add(m); return m;
}
function flatShape(parent, outer, holes, y, mat) {
  const s = new THREE.Shape(outer.map(([x, z]) => new THREE.Vector2(x, z)));
  for (const h of holes) s.holes.push(new THREE.Path(h.map(([x, z]) => new THREE.Vector2(x, z)).reverse()));
  const m = new THREE.Mesh(new THREE.ShapeGeometry(s).rotateX(Math.PI / 2), mat); m.position.y = y; m.receiveShadow = true; parent.add(m); return m;
}
function polyEdges(poly) { return poly.map((a, i) => [a, poly[(i + 1) % poly.length]]); }

/* ---------------- minaret: ขาว คาดระเบียงสีเข้ม ยอดทอง ---------------- */
export function minaret(ctx, parent, x, z, H, layer) {
  // ถ้ากำลังรวมเมช (BATCH) ชิ้นส่วนจะถูกเก็บไว้ แล้วอบตำแหน่งลงเรขาคณิตตอนท้าย
  const M = haramMats(ctx), g = new THREE.Group(); g.position.set(x, 0, z); g.updateMatrix();
  const batched = !!BATCH, pend = [];
  if (batched) g.userData.batchMatrix = g.matrix; else parent.add(g);
  const add = (geo, mat, y) => {
    const m = new THREE.Mesh(geo, mat); m.position.set(batched ? x : 0, y, batched ? z : 0); m.castShadow = true;
    if (batched) pend.push(m); else g.add(m);
    return m;
  };
  facadeBox(g, -4.5, 0, 4.5, 0, 9, H * .3, 0, M.facade, M.white, 7);
  const segs = [[.3, .55, 3.5, 4.7], [.55, .75, 3.1, 4.3], [.75, .85, 2.6, 3.8]];
  for (const [a, b, r, br] of segs) {
    add(new THREE.CylinderGeometry(br, br * .92, 1.7, 16), M.dark, H * a + .85);
    add(new THREE.CylinderGeometry(br + .15, br + .15, .35, 16), M.white, H * a + 1.85);
    add(new THREE.CylinderGeometry(r * .94, r, H * (b - a) - 1.7, 8), M.white, H * a + 1.7 + (H * (b - a) - 1.7) / 2);
  }
  add(new THREE.CylinderGeometry(3.1, 2.7, 1.5, 16), M.dark, H * .85 + .75);
  const dome = add(new THREE.SphereGeometry(2.6, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), M.white, H * .85 + 1.5); dome.scale.y = 1.7;
  add(new THREE.CylinderGeometry(.18, .5, H * .07, 8), M.gold, H * .85 + 5.5 + H * .035);
  const cr = add(new THREE.TorusGeometry(1.2, .25, 8, 20, Math.PI * 1.4), M.gold, H * .92 + 6); cr.rotation.z = -Math.PI * .2;
  for (const m of pend) { m.updateMatrix(); m.geometry.applyMatrix4(m.matrix); batchAdd(m.material, m.geometry); }
  ctx.addRing(x, z, 5.8, 8, layer);
}

/* ---------------- Masjid al-Haram ---------------- */
export function buildHaram(ctx) {
  batchStart();
  const M = haramMats(ctx), fb = ctx.fb, o = new THREE.Object3D();
  // พื้น
  const floor = flatShape(fb, POLY, [C0], .1, M.carpet);
  flatShape(fb, C0, [], .1, ctx.MAT.floor);
  flatShape(fb, C0, [], .2, M.mataf);
  // เพดานชั้นล่าง (ลายช่องสี่เหลี่ยมสีทอง) / ระเบียงลดหลั่น / ดาดฟ้า
  flatShape(fb, POLY, [C0], HALL_H, M.ceiling);
  flatShape(fb, C1, [C0], HALL_H + .03, M.roof);
  flatShape(fb, C2, [C1], 19.03, M.roof);
  flatShape(fb, POLY, [C2], ROOF_H, M.roof);
  // ระเบียงซุ้มโค้งรอบลาน (ชั้นล่าง) มีช่องเดินเข้าลานด้านละ 2 ช่อง
  for (const [a, b] of polyEdges(C0)) {
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]), u = [(b[0] - a[0]) / L, (b[1] - a[1]) / L], P = s => [a[0] + u[0] * s, a[1] + u[1] * s];
    const cuts = [[0, .25 * L - 3.5], [.25 * L + 3.5, .75 * L - 3.5], [.75 * L + 3.5, L]];
    for (const [s0, s1] of cuts) { const p = P(s0), q = P(s1); facadeBox(fb, p[0], p[1], q[0], q[1], 2, HALL_H, 0, M.portico, M.roof, 5); ctx.addWall(p[0], p[1], q[0], q[1], 1); }
    for (const s of [.25 * L, .75 * L]) { const p = P(s - 3.5), q = P(s + 3.5); facadeBox(fb, p[0], p[1], q[0], q[1], 2, HALL_H - 7.5, 7.5, M.portico, M.roof, 5); }
  }
  for (const [a, b] of polyEdges(C1)) facadeBox(fb, a[0], a[1], b[0], b[1], 1.5, 8, HALL_H, M.tier, M.roof, 5);
  for (const [a, b] of polyEdges(C2)) facadeBox(fb, a[0], a[1], b[0], b[1], 1.5, 8, 19, M.tier, M.roof, 5);
  // โดมเล็กแบบออตโตมันบนระเบียงชั้นแรก
  const domePts = [], ring = octagon(66.5);
  for (const [a, b] of polyEdges(ring)) { const L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.floor(L / 6.5); for (let k = 0; k < n; k++) domePts.push([a[0] + (b[0] - a[0]) * (k + .5) / n, a[1] + (b[1] - a[1]) * (k + .5) / n]); }
  const dm = new THREE.InstancedMesh(new THREE.SphereGeometry(2.3, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), M.white, domePts.length); dm.castShadow = true;
  domePts.forEach(([x, z], k) => { o.position.set(x, HALL_H, z); o.updateMatrix(); dm.setMatrixAt(k, o.matrix); }); fb.add(dm);
  // เสาในโถงละหมาด
  const colPts = [], cIn = octagon(66);
  for (let x = -244; x < 100; x += 11) for (let z = -324; z < 196; z += 11) if (ctx.inPoly(x, z) && !ctx.inPoly(x, z, cIn) && ctx.distToPolyEdge(x, z) > 5) colPts.push([x, z]);
  const cg = new THREE.CylinderGeometry(.75, .75, HALL_H, 12); cg.translate(0, HALL_H / 2, 0);
  const cm = new THREE.InstancedMesh(cg, ctx.MAT.marble, colPts.length); cm.castShadow = true;
  colPts.forEach(([x, z], k) => { o.position.set(x, 0, z); o.updateMatrix(); cm.setMatrixAt(k, o.matrix); }); fb.add(cm);
  // ซุ้มโค้งระหว่างเสา และโคมไฟระย้าแขวนกลางช่อง
  const has = new Set(colPts.map(([x, z]) => x + ',' + z)), arches = [], lamps = [];
  for (const [x, z] of colPts) {
    if (has.has((x + 11) + ',' + z)) arches.push([x + 5.5, z, 0]);
    if (has.has(x + ',' + (z + 11))) arches.push([x, z + 5.5, Math.PI / 2]);
    if (has.has((x + 11) + ',' + z) && has.has(x + ',' + (z + 11)) && ((x + z) / 11) % 2 === 0) lamps.push([x + 5.5, z + 5.5]);
  }
  const ap = (() => { const s = new THREE.Shape(), a = 5.5, c = .75, sp = HALL_H - 4.4, top = HALL_H - .05; s.moveTo(-a, top); s.lineTo(a, top); s.lineTo(a, sp); s.lineTo(a - c, sp); s.quadraticCurveTo(a - c, sp + 3.3, 0, top - .35); s.quadraticCurveTo(-a + c, sp + 3.3, -a + c, sp); s.lineTo(-a, sp); s.closePath(); const g = new THREE.ExtrudeGeometry(s, { depth: .7, bevelEnabled: false, curveSegments: 4 }); g.translate(0, 0, -.35); return g; })();
  const am = new THREE.InstancedMesh(ap, M.white, arches.length);
  arches.forEach(([x, z, r], k) => { o.position.set(x, 0, z); o.rotation.set(0, r, 0); o.updateMatrix(); am.setMatrixAt(k, o.matrix); }); fb.add(am);
  const lg = [new THREE.CylinderGeometry(.03, .03, 1.8, 4).translate(0, HALL_H - .9, 0), new THREE.CylinderGeometry(1.1, .5, .4, 12).translate(0, HALL_H - 2.1, 0)], lh = new THREE.IcosahedronGeometry(.6, 0).translate(0, HALL_H - 2.5, 0);
  for (const [g, mat] of [[lg[0], M.brass], [lg[1], M.brass], [lh, M.lampHead]]) { const im = new THREE.InstancedMesh(g, mat, lamps.length); lamps.forEach(([x, z], k) => { o.position.set(x, 0, z); o.rotation.set(0, 0, 0); o.updateMatrix(); im.setMatrixAt(k, o.matrix); }); fb.add(im); }
  o.rotation.set(0, 0, 0);
  // ผนังด้านนอก + ประตู
  const GATES = [[0, .706, 34, 'major'], [0, .3, 18], [1, .5, 16], [3, .5, 26, 'major'], [4, .45, 26, 'major'], [5, .507, 34, 'major'], [5, .2, 16], [5, .8, 16]];
  for (let k = 0; k < 8; k++) GATES.push([2, .08 + k * .12, 24]);
  for (let e = 0; e < POLY.length; e++) {
    const A = POLY[e], B = POLY[(e + 1) % POLY.length], L = Math.hypot(B[0] - A[0], B[1] - A[1]), u = [(B[0] - A[0]) / L, (B[1] - A[1]) / L], n = [-u[1], u[0]];
    const P2 = s => [A[0] + u[0] * s, A[1] + u[1] * s];
    const gaps = GATES.filter(g => g[0] === e).sort((a, b) => a[1] - b[1]); let cur = 0;
    const inner = e === 2;
    const seg = (s0, s1) => { const a = P2(s0), b = P2(s1); if (inner) { ctx.wallPlain(a[0], a[1], b[0], b[1], 16); return; } facadeBox(fb, a[0], a[1], b[0], b[1], 3, ROOF_H, 0, M.facade, M.white, 7); ctx.addWall(a[0], a[1], b[0], b[1], 1.5); };
    for (const g of gaps) {
      const s0 = g[1] * L - g[2] / 2, s1 = g[1] * L + g[2] / 2;
      if (s0 > cur + .5) seg(cur, s0);
      if (!inner) {
        // ช่องประตูเล็ก: คานบนช่องประตู
        const a = P2(s0), b = P2(s1);
        facadeBox(fb, a[0], a[1], b[0], b[1], 3, ROOF_H - 9, 9, M.facade, M.white, 7);
      }
      if (g[3] === 'major') {
        const gw = g[2] + 8, c = P2(g[1] * L), off = 5;
        const fa = [c[0] - u[0] * gw / 2 + n[0] * off, c[1] - u[1] * gw / 2 + n[1] * off], fbp = [c[0] + u[0] * gw / 2 + n[0] * off, c[1] + u[1] * gw / 2 + n[1] * off];
        // แผงหน้าประตูใหญ่ (โปร่งตรงซุ้มกลาง)
        const plane = new THREE.Mesh(new THREE.PlaneGeometry(gw, 36), M.gate);
        plane.position.set(c[0] + n[0] * off, 18, c[1] + n[1] * off); plane.rotation.y = Math.atan2(-u[1], u[0]); plane.castShadow = true; fb.add(plane);
        // ผนังข้างประตู (ส่วนทึบ) และหลังคาทางเดิน
        const half = gw / 2, open = 6.6 * gw / 22;
        for (const sgn of [-1, 1]) {
          const p = [c[0] + u[0] * sgn * half, c[1] + u[1] * sgn * half], q = [c[0] + u[0] * sgn * open, c[1] + u[1] * sgn * open];
          ctx.addWall(p[0] + n[0] * off, p[1] + n[1] * off, q[0] + n[0] * off, q[1] + n[1] * off, .6);
          facadeBox(fb, p[0], p[1], p[0] + n[0] * off * 2, p[1] + n[1] * off * 2, 4, 36, 0, M.facade, M.white, 7);
          ctx.addWall(p[0], p[1], p[0] + n[0] * off * 2, p[1] + n[1] * off * 2, 2);
        }
        facadeBox(fb, c[0] - u[0] * half + n[0] * off, c[1] - u[1] * half + n[1] * off, c[0] + u[0] * half + n[0] * off, c[1] + u[1] * half + n[1] * off, off * 2, 2, 24, M.white, M.roof, 7);
        minaret(ctx, fb, c[0] - u[0] * (half + 5) + n[0] * (off + 2), c[1] - u[1] * (half + 5) + n[1] * (off + 2), 104);
        minaret(ctx, fb, c[0] + u[0] * (half + 5) + n[0] * (off + 2), c[1] + u[1] * (half + 5) + n[1] * (off + 2), 104);
        void fa; void fbp;
      }
      cur = s1;
    }
    if (cur < L - .5) seg(cur, L);
  }
  // หอคอยฝั่งศ็อฟา และโดมทองแดง 3 ลูกบนหลังคาฝั่งประตูกษัตริย์ฟะฮัด
  minaret(ctx, fb, 96, 104, 96);
  for (const z of [-60, -22, 16]) {
    mesh(fb, new THREE.CylinderGeometry(9.6, 9.6, 3, 32), M.white, -214, ROOF_H + 1.5, z);
    const d = mesh(fb, new THREE.SphereGeometry(9.2, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), M.bronze, -214, ROOF_H + 3, z); d.castShadow = true;
    mesh(fb, new THREE.ConeGeometry(.4, 3, 8), M.gold, -214, ROOF_H + 13.5, z);
  }
  batchFlush(fb);
  void floor;
}
function mesh(parent, geo, mat, x, y, z) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); parent.add(m); return m; }

/* ---------------- อาคารมัสอา (ด้านนอก) ---------------- */
export function buildMasaExterior(ctx, parent, at) {
  const M = haramMats(ctx);
  batchStart();
  const E = (t, ex) => at(t, 20, ex), total = 24;
  // ผนังด้านนอกฝั่งตะวันออก สูงเท่าตัวมัสยิด มีช่องทางออก 2 จุด
  const L = ctx.MASA_L; let cur = -12;
  for (const t of [.1, .9]) { const s0 = t * L - 8; const p = E(0, cur), q = E(0, s0); facadeBox(parent, p[0], p[1], q[0], q[1], 2, ROOF_H, 0, M.facade, M.white, 7); ctx.addWall(p[0], p[1], q[0], q[1], 1, 'masa'); const a = E(0, s0), b = E(0, s0 + 16); facadeBox(parent, a[0], a[1], b[0], b[1], 2, ROOF_H - 9, 9, M.facade, M.white, 7); cur = s0 + 16; }
  { const p = E(0, cur), q = E(0, L + 12); facadeBox(parent, p[0], p[1], q[0], q[1], 2, ROOF_H, 0, M.facade, M.white, 7); ctx.addWall(p[0], p[1], q[0], q[1], 1, 'masa'); }
  for (const [t, ex] of [[0, -12], [1, 12]]) { const p = at(t, -21, ex), q = at(t, 21, ex); facadeBox(parent, p[0], p[1], q[0], q[1], 2, ROOF_H, 0, M.facade, M.white, 7); ctx.addWall(p[0], p[1], q[0], q[1], 1, 'masa'); }
  // หลังคาดาดฟ้า และโดมเหนือเนินศ็อฟาและมัรวะฮ์
  const a = at(0, 0, -12), b = at(1, 0, 12);
  const dx = b[0] - a[0], dz = b[1] - a[1], Lr = Math.hypot(dx, dz);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(Lr, .6, 44), M.roof); roof.position.set((a[0] + b[0]) / 2, ROOF_H - .3, (a[1] + b[1]) / 2); roof.rotation.y = Math.atan2(-dz, dx); parent.add(roof);
  for (const t of [0, 1]) {
    const p = at(t, 0, t ? -2 : 2);
    mesh(parent, new THREE.CylinderGeometry(13.5, 13.5, 4, 40), M.white, p[0], ROOF_H + 2, p[1]);
    const d = mesh(parent, new THREE.SphereGeometry(13, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2), M.bronze, p[0], ROOF_H + 4, p[1]); d.castShadow = true;
    mesh(parent, new THREE.ConeGeometry(.6, 4, 8), M.gold, p[0], ROOF_H + 19, p[1]);
  }
  batchFlush(parent);
}

/* ---------------- ตึกที่มีหน้าต่างจริง (เปิดไฟตอนกลางคืน) ---------------- */
export function windowMaterial(nightU) {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .78, metalness: .04 });
  m.onBeforeCompile = sh => {
    sh.uniforms.uNight = nightU;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;\nvarying vec3 vWNorm;')
      .replace('#include <worldpos_vertex>', `#include <worldpos_vertex>
        vec4 wposW = vec4(transformed, 1.0);
        vec3 wnorW = objectNormal;
        #ifdef USE_INSTANCING
          wposW = instanceMatrix * wposW;
          wnorW = mat3(instanceMatrix) * wnorW;
        #endif
        vWPos = (modelMatrix * wposW).xyz;
        vWNorm = normalize(mat3(modelMatrix) * wnorW);`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec3 vWPos; varying vec3 vWNorm; uniform float uNight;
        float wHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        float winLit = 0.0;
        vec3 anW = abs(vWNorm);
        if (anW.y < 0.5) {
          float uW = anW.x > anW.z ? vWPos.z : vWPos.x;
          vec2 cellW = vec2(uW / 3.4, vWPos.y / 3.6);
          vec2 fW = fract(cellW);
          float win = cellW.y < 1.0
            ? step(0.06, fW.x) * step(fW.x, 0.94) * step(0.08, fW.y) * step(fW.y, 0.86)
            : step(0.17, fW.x) * step(fW.x, 0.83) * step(0.24, fW.y) * step(fW.y, 0.8);
          // ลดลายหน้าต่างเมื่ออยู่ไกล เพื่อไม่ให้ภาพกระพริบเป็นลายตาราง
          float farW = clamp(1.0 - (fwidth(cellW.x) + fwidth(cellW.y)) * 1.6, 0.0, 1.0);
          win *= farW;
          diffuseColor.rgb *= 1.0 - step(0.93, fW.y) * 0.12 * farW;
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.12, 0.16, 0.2), win * 0.88 + (1.0 - farW) * 0.28);
          winLit = win * step(0.74, wHash(floor(cellW) + floor(vWPos.xz / 40.0) * 7.0)) + (1.0 - farW) * 0.12;
        } else {
          diffuseColor.rgb *= 0.8;
        }`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        totalEmissiveRadiance += vec3(1.0, 0.82, 0.55) * winLit * uNight * 0.75;`);
  };
  m.customProgramCacheKey = () => 'umrah-windows-v2';
  return m;
}

/* ---------------- เสาไฟลานรอบมัสยิด ---------------- */
export function buildLampPosts(ctx, okAt) {
  const M = haramMats(ctx), pts = [];
  for (let x = -520; x <= 420; x += 30) for (let z = -560; z <= 520; z += 30) if (okAt(x, z)) pts.push([x, z]);
  const pole = new THREE.CylinderGeometry(.18, .26, 12, 8); pole.translate(0, 6, 0);
  const head = new THREE.SphereGeometry(.7, 12, 8); head.translate(0, 12.4, 0);
  const pm = new THREE.InstancedMesh(pole, M.dark, pts.length), hm = new THREE.InstancedMesh(head, M.lampHead, pts.length), o = new THREE.Object3D();
  pts.forEach(([x, z], k) => { o.position.set(x, 0, z); o.updateMatrix(); pm.setMatrixAt(k, o.matrix); hm.setMatrixAt(k, o.matrix); });
  pm.castShadow = true; ctx.fb.add(pm); ctx.fb.add(hm);
}
