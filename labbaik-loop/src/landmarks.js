// สถานที่สำคัญที่สร้างอย่างละเอียดตามรูปร่างจริงจากแผนที่: มัสยิดนะบะวีย์ (เดินเข้าไปข้างในได้) โดมเขียว ร่มยักษ์
// มัสยิดกุบาอ์ กิบลาตัยน์ อุฮุด อัลบะกีอ์ และบริเวณมัสยิดอัลอักศอ (โดมแห่งศิลา มัสยิดอัลกิบลีย์ ลานยกระดับ บันได ซุ้มโค้ง)
import * as THREE from 'three';
import { Batch, domeGeo, pIn, pDist, pBounds, pCentroid, pRadius, pArea, hash, segDist } from './citymap.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const toPts = f => { const o = []; for (let i = 0; i < f.length; i += 2) o.push([f[i], f[i + 1]]); return o; };
const flat = P => P.flatMap(p => p);
function noise(g, w, h, a, base = 120) { for (let i = 0; i < w * h / 16; i++) { const v = Math.random() * 40 | 0; g.fillStyle = `rgba(${base + v},${base - 5 + v},${base - 15 + v},${a})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); } }
function ctex(w, h, draw, rep) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; if (rep) t.repeat.set(rep[0], rep[1]); return t; }
function pArch(g, cx, hw, yB, ySp, yTop) { g.beginPath(); g.moveTo(cx - hw, yB); g.lineTo(cx - hw, ySp); g.quadraticCurveTo(cx - hw, ySp - (ySp - yTop) * .6, cx, yTop); g.quadraticCurveTo(cx + hw, ySp - (ySp - yTop) * .6, cx + hw, ySp); g.lineTo(cx + hw, yB); g.closePath(); }
function lattice(g, x, y, w, h, col, step = 7) { g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip(); g.strokeStyle = col; g.lineWidth = 1.2; for (let d = -h; d < w + h; d += step) { g.beginPath(); g.moveTo(x + d, y); g.lineTo(x + d + h, y + h); g.stroke(); g.beginPath(); g.moveTo(x + d, y + h); g.lineTo(x + d + h, y); g.stroke(); } g.restore(); }

/* ---------------- วัสดุ ---------------- */
let M = null;
export const LIT = []; // [วัสดุ, สีเรืองแสงกลางคืน]
export function mats(nightU) {
  if (M) return M;
  const std = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: .8, metalness: 0 }, o || {}));
  // ผนังมัสยิดนะบะวีย์: ช่องโค้งแหลม ตะแกรงทองเหลือง ชั้นบนหน้าต่างคู่ เชิงชายหยัก (ช่วงเสา 6 ม. สูง 13 ม.)
  const nabF = ctex(192, 416, (g, w, h) => {
    const m = 32, Y = y => h - y * m;
    g.fillStyle = '#e7dcc8'; g.fillRect(0, 0, w, h); noise(g, w, h, .05, 150);
    g.fillStyle = '#d9cbb2'; g.fillRect(0, 0, .55 * m, h); g.fillRect(w - .55 * m, 0, .55 * m, h);
    g.fillStyle = '#b9a07a'; g.fillRect(0, Y(.6), w, .6 * m);
    g.fillStyle = '#cdb99a'; pArch(g, w / 2, 2.35 * m, Y(.6), Y(5.4), Y(8)); g.fill();
    g.fillStyle = '#3b3326'; pArch(g, w / 2, 2.0 * m, Y(.6), Y(5.3), Y(7.6)); g.fill();
    g.save(); pArch(g, w / 2, 2.0 * m, Y(.6), Y(5.3), Y(7.6)); g.clip(); lattice(g, 0, Y(7.6), w, 7 * m, 'rgba(214,176,92,.85)', 9); g.restore();
    g.fillStyle = '#c9b48e'; g.fillRect(0, Y(8.9), w, .5 * m); g.fillStyle = '#a88f68'; for (let x = 4; x < w; x += 12) g.fillRect(x, Y(8.75), 6, 5);
    for (const s of [-1, 1]) { g.fillStyle = '#c8b391'; pArch(g, w / 2 + s * .95 * m, .62 * m, Y(9.6), Y(11.1), Y(11.9)); g.fill(); g.fillStyle = '#2d2a26'; pArch(g, w / 2 + s * .95 * m, .48 * m, Y(9.7), Y(11.05), Y(11.75)); g.fill(); }
    g.fillStyle = '#cfbd9c'; g.fillRect(0, Y(12.5), w, .5 * m);
    g.fillStyle = '#e9e0cf'; for (let x = 0; x < w; x += m) { g.beginPath(); g.moveTo(x + .15 * m, Y(12.5)); g.lineTo(x + .15 * m, Y(12.85)); g.lineTo(x + .5 * m, Y(13)); g.lineTo(x + .85 * m, Y(12.85)); g.lineTo(x + .85 * m, Y(12.5)); g.fill(); }
  });
  const ceil = ctex(256, 256, (g, w) => {
    g.fillStyle = '#efe7d6'; g.fillRect(0, 0, w, w);
    g.strokeStyle = '#c9a75c'; g.lineWidth = 6; g.strokeRect(10, 10, w - 20, w - 20); g.lineWidth = 2; g.strokeRect(30, 30, w - 60, w - 60);
    g.fillStyle = '#d8c7a2'; g.beginPath(); g.arc(w / 2, w / 2, 70, 0, 7); g.fill();
    for (let k = 0; k < 8; k++) { g.save(); g.translate(w / 2, w / 2); g.rotate(k * Math.PI / 4); g.fillStyle = '#b8954c'; g.fillRect(-6, -68, 12, 40); g.restore(); }
    g.fillStyle = '#9c7a3a'; g.beginPath(); g.arc(w / 2, w / 2, 18, 0, 7); g.fill();
  });
  const carpet = (c1, c2, c3) => ctex(256, 256, (g, w) => {
    g.fillStyle = c1; g.fillRect(0, 0, w, w);
    for (let r = 0; r < 4; r++) {
      const y = r * 64;
      g.fillStyle = c2; g.fillRect(0, y, w, 6); g.fillRect(0, y + 58, w, 3);
      for (let x = 0; x < w; x += 32) { g.fillStyle = c3; g.beginPath(); g.moveTo(x + 16, y + 14); g.quadraticCurveTo(x + 30, y + 30, x + 16, y + 52); g.quadraticCurveTo(x + 2, y + 30, x + 16, y + 14); g.fill(); g.strokeStyle = c2; g.lineWidth = 1.5; g.strokeRect(x + 3, y + 10, 26, 46); }
    }
    for (let i = 0; i < 3000; i++) { g.fillStyle = `rgba(0,0,0,${Math.random() * .08})`; g.fillRect(Math.random() * w, Math.random() * w, 1, 1); }
  });
  const marble = ctex(256, 256, (g, w) => {
    g.fillStyle = '#f3f1ec'; g.fillRect(0, 0, w, w);
    for (let i = 0; i < 12; i++) { g.strokeStyle = `rgba(150,150,155,${.04 + Math.random() * .08})`; g.lineWidth = .6 + Math.random(); g.beginPath(); let x = Math.random() * w, y = Math.random() * w; g.moveTo(x, y); for (let k = 0; k < 10; k++) { x += (Math.random() - .5) * 40; y += (Math.random() - .3) * 30; g.lineTo(x, y); } g.stroke(); }
    g.strokeStyle = 'rgba(0,0,0,.08)'; g.lineWidth = 1.5; for (let p = 0; p <= w; p += 64) { g.beginPath(); g.moveTo(p, 0); g.lineTo(p, w); g.stroke(); g.beginPath(); g.moveTo(0, p); g.lineTo(w, p); g.stroke(); }
    g.strokeStyle = 'rgba(120,90,60,.14)'; g.lineWidth = 3; g.strokeRect(0, 0, w, w);
  });
  const lime = ctex(256, 256, (g, w) => {
    g.fillStyle = '#d9cdb4'; g.fillRect(0, 0, w, w);
    for (let y = 0; y < w; y += 32) for (let x = (y / 32 % 2) * 24; x < w + 48; x += 48) { const v = Math.random() * 26 - 13; g.fillStyle = `rgb(${215 + v},${203 + v},${178 + v})`; g.fillRect(x + 1, y + 1, 46, 30); }
    noise(g, w, w, .05, 140);
  });
  const jstone = ctex(256, 256, (g, w) => {
    g.fillStyle = '#d8c9a8'; g.fillRect(0, 0, w, w);
    for (let y = 0; y < w; y += 16) for (let x = (y / 16 % 2) * 20; x < w + 40; x += 40) { const v = Math.random() * 30 - 15; g.fillStyle = `rgb(${216 + v},${200 + v},${166 + v})`; g.fillRect(x + 1, y + 1, 38, 14); }
  });
  // ผนังโดมแห่งศิลา 1 ด้าน (20.6 x 11.5 ม.): หินอ่อนล่าง กระเบื้องฟ้า หน้าต่างโค้ง 7 ช่อง แถบอักษร
  const dorSide = ctex(824, 460, (g, w, h) => {
    const m = 40, Y = y => h - y * m;
    g.fillStyle = '#e9e7e1'; g.fillRect(0, Y(5.4), w, 5.4 * m);
    for (let i = 0; i < 9; i++) { const x = (i + .5) * w / 9; g.strokeStyle = 'rgba(120,120,128,.45)'; g.lineWidth = 3; g.strokeRect(x - 34, Y(4.9), 68, 4.2 * m); g.fillStyle = 'rgba(160,160,170,.12)'; g.fillRect(x - 28, Y(4.6), 56, 3.6 * m); }
    noise(g, w, 5.4 * m, .03, 170);
    g.fillStyle = '#2a3f5f'; g.fillRect(0, Y(5.75), w, .35 * m);
    // กระเบื้องลายฟ้า-เขียว
    const ty = Y(10.15), th = (10.15 - 5.75) * m; g.fillStyle = '#1f5c8f'; g.fillRect(0, ty, w, th);
    for (let y = ty; y < ty + th; y += 20) for (let x = 0; x < w; x += 20) { g.fillStyle = ((x + y) / 20) % 2 ? '#2a77a8' : '#1b4f7d'; g.fillRect(x + 1, y + 1, 18, 18); g.fillStyle = 'rgba(240,240,230,.55)'; g.beginPath(); g.arc(x + 10, y + 10, 3.2, 0, 7); g.fill(); g.fillStyle = 'rgba(80,170,150,.6)'; g.fillRect(x + 8, y + 1, 4, 4); }
    for (let i = 0; i < 7; i++) {
      const cx = (i + .5) * w / 7, open = i > 0 && i < 6;
      g.fillStyle = '#e6d9a6'; pArch(g, cx, 1.0 * m, Y(6.4), Y(8.6), Y(9.8)); g.fill();
      g.fillStyle = open ? '#0f1c2b' : '#174a72'; pArch(g, cx, .78 * m, Y(6.55), Y(8.55), Y(9.6)); g.fill();
      if (open) { lattice(g, cx - .78 * m, Y(9.6), 1.56 * m, 3 * m, 'rgba(230,220,180,.45)', 8); }
    }
    g.fillStyle = '#152c52'; g.fillRect(0, Y(11.05), w, .9 * m);
    g.fillStyle = '#e9e2c8'; g.font = 'bold 22px serif'; for (let x = 6; x < w; x += 36) { g.fillText('ﷲ', x, Y(10.35)); }
    g.fillStyle = '#1f5c8f'; g.fillRect(0, 0, w, Y(11.05)); g.fillStyle = '#2b7db0'; for (let x = 0; x < w; x += 26) { g.beginPath(); g.arc(x + 13, Y(11.05), 12, Math.PI, 0); g.fill(); }
  });
  const drum = ctex(184, 340, (g, w, h) => {
    const m = 40, Y = y => h - y * m;
    g.fillStyle = '#1d5687'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 18) for (let x = 0; x < w; x += 18) { g.fillStyle = ((x + y) / 18) % 2 ? '#2672a5' : '#184a76'; g.fillRect(x + 1, y + 1, 16, 16); }
    g.fillStyle = '#e6d9a6'; pArch(g, w / 2, .95 * m, Y(1.4), Y(4.6), Y(5.8)); g.fill(); g.fillStyle = '#0f1c2b'; pArch(g, w / 2, .75 * m, Y(1.5), Y(4.5), Y(5.6)); g.fill();
    g.fillStyle = '#152c52'; g.fillRect(0, Y(8.5), w, 1.4 * m); g.fillStyle = '#e9e2c8'; g.fillRect(8, Y(7.8), w - 16, 3);
  });
  const umbrella = std(0xf4f1ea, { side: THREE.DoubleSide, roughness: .7, emissive: 0x57534c });
  M = {
    nabF: std(0xffffff, { map: nabF, emissiveMap: nabF }), ceil: std(0xffffff, { map: ceil, side: THREE.DoubleSide }),
    carpetR: std(0xffffff, { map: carpet('#8f1f24', '#c9a24a', '#6d1419') }), carpetG: std(0xffffff, { map: carpet('#2f6e4a', '#d5c27a', '#24573a') }),
    marble: std(0xffffff, { map: marble, roughness: .35 }), lime: std(0xffffff, { map: lime, roughness: .85 }), jstone: std(0xffffff, { map: jstone }),
    stone: std(0xe3d7bf), stoneB: std(0xe6dbc6), stoneJ: std(0xd8c7a2), white: std(0xf3f1ec, { roughness: .6 }), dark: std(0x2b2d31),
    gold: std(0xd6b24f, { roughness: .28, metalness: .9 }), green: std(0x2d8a54, { roughness: .45, metalness: .15 }), lead: std(0x8b9097, { roughness: .4, metalness: .55 }),
    silver: std(0xc3c8cd, { roughness: .32, metalness: .65 }), bronze: std(0x7c5a32, { roughness: .4, metalness: .7 }), brass: std(0xb8964e, { roughness: .35, metalness: .8 }),
    grille: std(0x2f6b50, { roughness: .5, metalness: .3 }), wood: std(0x5c3f28), rock: std(0x8f7a5e, { roughness: 1, flatShading: true }),
    dorSide: std(0xffffff, { map: dorSide, emissiveMap: dorSide, roughness: .5 }), drum: std(0xffffff, { map: drum, emissiveMap: drum, roughness: .5 }),
    umbrella, lamp: std(0xfff3d6), glass: std(0x1d2a33, { roughness: .2, metalness: .2 })
  };
  LIT.push([M.nabF, 0x6f6a60], [M.dorSide, 0x6a6a70], [M.drum, 0x50607a], [M.lamp, 0xffe2a8], [M.ceil, 0x5a5448], [M.marble, 0x55534f], [M.lime, 0x4a463e], [M.carpetR, 0x3a1a1a], [M.carpetG, 0x18301f], [M.stoneB, 0x5a554c], [M.stoneJ, 0x4c4537], [M.white, 0x5c5a55], [M.green, 0x123a22], [M.gold, 0x5a4214]);
  return M;
}

/* ---------------- ชิ้นส่วนพื้นฐาน ---------------- */
// ผนังที่ยืดลายตามความยาวจริง (u ตามช่วงเสา, v ตามความสูงเต็มของผนัง)
function wallBox(B, mat, ax, az, bx, bz, thick, y0, yA, yB, Hf, bay) {
  const dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz); if (L < .05) return;
  const h = yB - yA, g = new THREE.BoxGeometry(L, h, thick), p = g.attributes.position, uv = g.attributes.uv, n = g.attributes.normal;
  for (let i = 0; i < p.count; i++) {
    if (Math.abs(n.getZ(i)) > .5) { uv.setXY(i, (p.getX(i) + L / 2) / bay, (p.getY(i) + h / 2 + yA - y0) / Hf); }
    else uv.setXY(i, .02, .985);
  }
  const o = new THREE.Object3D(); o.position.set((ax + bx) / 2, yA + h / 2, (az + bz) / 2); o.rotation.y = Math.atan2(-dz, dx); o.updateMatrix();
  B.add(mat, g, o.matrix);
}
function shapeGeo(ring, holes, y, down) {
  const s = new THREE.Shape(ring.map(([x, z]) => new THREE.Vector2(x, z)));
  for (const h of holes || []) s.holes.push(new THREE.Path(h.map(([x, z]) => new THREE.Vector2(x, z))));
  const g = new THREE.ShapeGeometry(s); g.rotateX(down ? -Math.PI / 2 : Math.PI / 2);
  // ShapeGeometry หลังหมุนรอบ X: (x, y) -> (x, 0, y) เมื่อหมุน +90°
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const z = down ? -p.getZ(i) : p.getZ(i); p.setXYZ(i, p.getX(i), y, z); }
  // พิกัดพื้นผิวเป็นเมตร
  const uv = g.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / 4.8, p.getZ(i) / 4.8);
  g.computeVertexNormals();
  const nn = g.attributes.normal; for (let i = 0; i < nn.count; i++) nn.setXYZ(i, 0, down ? -1 : 1, 0);
  // ให้หน้าสามเหลี่ยมหันตามนอร์มอล
  const idx = g.index; if (idx) { const a = idx.array; for (let t = 0; t < a.length; t += 3) { const A = a[t], Bv = a[t + 1], Cv = a[t + 2]; const ax = p.getX(A), az = p.getZ(A), bx = p.getX(Bv), bz = p.getZ(Bv), cx = p.getX(Cv), cz = p.getZ(Cv); const cy = (bz - az) * (cx - ax) - (bx - ax) * (cz - az); if ((cy > 0) === !!down) { a[t + 1] = Cv; a[t + 2] = Bv; } } }
  return g;
}
function addShape(B, mat, ring, holes, y, down) { B.add(mat, shapeGeo(ring, holes, y, down)); }
const crescent = (B, x, y, z, s, mat) => {
  B.mesh(new THREE.CylinderGeometry(.06 * s, .1 * s, 1.6 * s, 6), mat, x, y + .8 * s, z);
  B.mesh(new THREE.IcosahedronGeometry(.22 * s, 0), mat, x, y + .5 * s, z);
  const t = new THREE.TorusGeometry(.5 * s, .09 * s, 5, 12, Math.PI * 1.35); t.rotateZ(-Math.PI * .17); B.mesh(t, mat, x, y + 2.1 * s, z);
};
export function dome(B, mat, x, y, z, r, h, pointed = .5, drumH = 0, drumMat, finial = 1, finMat) {
  const seg = r > 7 ? 28 : r > 3.5 ? 16 : 10;
  if (drumH) B.mesh(new THREE.CylinderGeometry(r * 1.02, r * 1.04, drumH, seg), drumMat || mat, x, y + drumH / 2, z);
  B.mesh(domeGeo(r, h, pointed, seg), mat, x, y + drumH, z);
  if (finial >= .5) crescent(B, x, y + drumH + h - .1, z, finial, finMat || M.gold);
}

/* ---------------- หออะซานหลายแบบ ---------------- */
export function minaret(B, style, x, z, y0, H, r) {
  const m = M;
  if (style === 'nabawi') {
    r = r || 3.4;
    B.mesh(new THREE.BoxGeometry(r * 2.1, H * .2, r * 2.1), m.stoneB, x, y0 + H * .1, z);
    for (const [dx, dz, ry] of [[0, r * 1.06, 0], [0, -r * 1.06, 0], [r * 1.06, 0, Math.PI / 2], [-r * 1.06, 0, Math.PI / 2]]) B.mesh(new THREE.BoxGeometry(r * 1.1, H * .1, .1), m.dark, x + dx, y0 + H * .11, z + dz, ry);
    const ring = (y, rr, h, mat) => B.mesh(new THREE.CylinderGeometry(rr, rr, h, 12), mat, x, y0 + y, z);
    ring(H * .205, r * 1.2, .8, m.stone);
    B.mesh(new THREE.CylinderGeometry(r * .92, r * .96, H * .28, 8), m.stoneB, x, y0 + H * .35, z);
    ring(H * .495, r * 1.32, 1.1, m.stone); ring(H * .495 + .9, r * 1.32, .5, m.dark);
    B.mesh(new THREE.CylinderGeometry(r * .78, r * .8, H * .2, 12), m.stoneB, x, y0 + H * .61, z);
    ring(H * .715, r * 1.12, 1, m.stone); ring(H * .715 + .8, r * 1.12, .45, m.dark);
    B.mesh(new THREE.CylinderGeometry(r * .62, r * .64, H * .11, 10), m.stoneB, x, y0 + H * .78, z);
    ring(H * .84, r * .95, .8, m.stone);
    B.mesh(new THREE.CylinderGeometry(r * .55, r * .58, H * .05, 12), m.dark, x, y0 + H * .87, z);
    dome(B, m.bronze, x, y0 + H * .895, z, r * .62, r * .95, .8, 0, null, r * .55, m.gold);
  } else if (style === 'mamluk') {
    const s = r ? r * 1.8 : 5.2;
    B.mesh(new THREE.BoxGeometry(s, H * .72, s), m.stoneJ, x, y0 + H * .36, z);
    for (const f of [.24, .48]) B.mesh(new THREE.BoxGeometry(s + .25, .5, s + .25), m.stone, x, y0 + H * f, z);
    B.mesh(new THREE.BoxGeometry(s + 1.6, .7, s + 1.6), m.stone, x, y0 + H * .72 + .35, z);
    B.mesh(new THREE.BoxGeometry(s + 1.6, .9, .25), m.stone, x, y0 + H * .72 + 1.1, z + (s + 1.5) / 2); B.mesh(new THREE.BoxGeometry(s + 1.6, .9, .25), m.stone, x, y0 + H * .72 + 1.1, z - (s + 1.5) / 2);
    B.mesh(new THREE.BoxGeometry(.25, .9, s + 1.6), m.stone, x + (s + 1.5) / 2, y0 + H * .72 + 1.1, z); B.mesh(new THREE.BoxGeometry(.25, .9, s + 1.6), m.stone, x - (s + 1.5) / 2, y0 + H * .72 + 1.1, z);
    B.mesh(new THREE.CylinderGeometry(s * .36, s * .38, H * .16, 8), m.stoneJ, x, y0 + H * .8 + .7, z);
    B.mesh(new THREE.CylinderGeometry(s * .4, s * .4, .5, 12), m.stone, x, y0 + H * .88 + .7, z);
    dome(B, m.lead, x, y0 + H * .885 + .9, z, s * .38, s * .42, .4, 0, null, .9, m.bronze);
  } else {
    r = r || 1.3;
    B.mesh(new THREE.CylinderGeometry(r, r * 1.08, H * .78, 12), m.white, x, y0 + H * .39, z);
    B.mesh(new THREE.CylinderGeometry(r * 1.55, r * 1.3, .9, 14), m.white, x, y0 + H * .78 + .4, z);
    B.mesh(new THREE.CylinderGeometry(r * 1.58, r * 1.58, .35, 14), m.dark, x, y0 + H * .78 + 1, z);
    B.mesh(new THREE.CylinderGeometry(r * .78, r * .82, H * .12, 12), m.white, x, y0 + H * .84 + .9, z);
    B.mesh(new THREE.ConeGeometry(r * .95, H * .08, 12), style === 'green' ? m.green : m.white, x, y0 + H * .9 + .9 + H * .04, z);
    crescent(B, x, y0 + H * .98 + .9, z, .6, m.gold);
  }
}

/* ---------------- ห้องละหมาดที่เดินเข้าไปได้ (ผนังมีช่องประตู เสา ซุ้มโค้ง พรม เพดาน หลังคา) ---------------- */
function archPanel(span, spring, top, colR) {
  const s = new THREE.Shape(), a = span / 2, c = colR;
  s.moveTo(-a, top); s.lineTo(a, top); s.lineTo(a, spring); s.lineTo(a - c, spring);
  s.quadraticCurveTo(a - c, spring + (top - spring) * .75, 0, top - .25);
  s.quadraticCurveTo(-a + c, spring + (top - spring) * .75, -a + c, spring);
  s.lineTo(-a, spring); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: .55, bevelEnabled: false, curveSegments: 3 }); g.translate(0, 0, -.275);
  return g;
}
export function prayerHall(C, B, o) {
  const m = M, ring = o.ring, H = o.H, y0 = o.y0 || 0, courts = o.courts || [], thick = o.thick || 1.8, bay = o.bay || 6;
  const rf = flat(ring), courtsF = courts.map(flat);
  const inCourt = (x, z, mg = 0) => courtsF.some(f => pIn(f, x, z) || (mg && pDist(f, x, z) < mg));
  // ผนังรอบนอก + ช่องประตู
  const n = ring.length;
  for (let i = 0; i < n; i++) {
    const a = ring[i], b = ring[(i + 1) % n], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < .3) continue;
    const ux = (b[0] - a[0]) / L, uz = (b[1] - a[1]) / L, gaps = [];
    for (const d of o.doors || []) { if (segDist(d.x, d.z, a[0], a[1], b[0], b[1]) > 3.2) continue; const s = (d.x - a[0]) * ux + (d.z - a[1]) * uz; if (s < -2 || s > L + 2) continue; gaps.push([clamp(s - d.w / 2, 0, L), clamp(s + d.w / 2, 0, L), d.h || 5.4]); }
    gaps.sort((p, q) => p[0] - q[0]);
    let cur = 0; const P = s => [a[0] + ux * s, a[1] + uz * s];
    const solid = (s0, s1) => { if (s1 - s0 < .05) return; const p = P(s0), q = P(s1); wallBox(B, o.facade, p[0], p[1], q[0], q[1], thick, y0, y0, y0 + H, H, bay); C.addWall(p[0], p[1], q[0], q[1], thick / 2, C.layer); };
    for (const [s0, s1, dh] of gaps) { if (s0 > cur) solid(cur, s0); const p = P(Math.max(s0, cur)), q = P(s1); if (s1 > cur) { wallBox(B, o.facade, p[0], p[1], q[0], q[1], thick, y0, y0 + dh, y0 + H, H, bay); B.mesh(new THREE.BoxGeometry(.25, dh, .25), m.brass, p[0], y0 + dh / 2, p[1]); B.mesh(new THREE.BoxGeometry(.25, dh, .25), m.brass, q[0], y0 + dh / 2, q[1]); } cur = Math.max(cur, s1); }
    if (cur < L) solid(cur, L);
  }
  // พรม / พื้นลานกลางแจ้ง / เพดาน / หลังคา / เชิงเทิน
  addShape(B, o.carpet || m.carpetR, ring, courts, y0 + .06);
  for (const c of courts) addShape(B, m.marble, c, [], y0 + .07);
  addShape(B, o.ceil || m.ceil, ring, courts, y0 + H - .35, true);
  addShape(B, o.roof || m.marble, ring, courts, y0 + H);
  for (let i = 0; i < n; i++) { const a = ring[i], b = ring[(i + 1) % n]; wallBox(B, o.parapet || m.stoneB, a[0], a[1], b[0], b[1], .5, y0 + H, y0 + H, y0 + H + 1.1, 1.1, 2); }
  for (const c of courts) for (let i = 0; i < c.length; i++) { const a = c[i], b = c[(i + 1) % c.length]; wallBox(B, o.facade, a[0], a[1], b[0], b[1], .8, y0, y0 + H - 3.2, y0 + H, H, bay); }
  // เสาและซุ้มโค้ง (ตารางตามแกนอาคาร)
  const ang = o.angle || 0, ca = Math.cos(ang), sa = Math.sin(ang), step = o.colStep || 7.5, cr = o.colR || .55;
  const bb = pBounds(rf), cx = (bb[0] + bb[2]) / 2, cz = (bb[1] + bb[3]) / 2, R = Math.hypot(bb[2] - bb[0], bb[3] - bb[1]) / 2 + step;
  const cols = new Map(), keyOf = (i, j) => i * 10007 + j;
  for (let i = -Math.ceil(R / step); i <= Math.ceil(R / step); i++) for (let j = -Math.ceil(R / step); j <= Math.ceil(R / step); j++) {
    const lx = i * step + (o.colOff ? o.colOff[0] : 0), lz = j * step + (o.colOff ? o.colOff[1] : 0), x = cx + lx * ca - lz * sa, z = cz + lx * sa + lz * ca;
    if (!pIn(rf, x, z) || pDist(rf, x, z) < 2.6 || inCourt(x, z, 1.6) || (o.skipCol && o.skipCol(x, z))) continue;
    cols.set(keyOf(i, j), [x, z]);
  }
  const colGeo = (() => { const parts = [new THREE.CylinderGeometry(cr, cr * 1.05, H - 4.2, 8).translate(0, (H - 4.2) / 2 + .6, 0), new THREE.BoxGeometry(cr * 2.6, .6, cr * 2.6).translate(0, .3, 0), new THREE.BoxGeometry(cr * 2.4, .5, cr * 2.4).translate(0, H - 3.45, 0)]; return parts; })();
  const pts = [...cols.values()], o3 = new THREE.Object3D();
  const mkInst = (geos, mat, list, rot) => {
    for (const g0 of geos) {
      const im = new THREE.InstancedMesh(g0, mat, list.length);
      list.forEach((q, k) => { o3.position.set(q[0], y0, q[1]); o3.rotation.set(0, q[2] ?? rot ?? 0, 0); o3.updateMatrix(); im.setMatrixAt(k, o3.matrix); });
      im.castShadow = false; im.receiveShadow = true; im.computeBoundingSphere(); C.group.add(im);
    }
  };
  mkInst(colGeo, o.colMat || m.white, pts);
  const arches = [];
  for (const [k, p] of cols) {
    const i = Math.floor(k / 10007 + .5), j = k - i * 10007;
    const e = cols.get(keyOf(i + 1, j)); if (e) arches.push([(p[0] + e[0]) / 2, (p[1] + e[1]) / 2, -ang]);
    const s = cols.get(keyOf(i, j + 1)); if (s) arches.push([(p[0] + s[0]) / 2, (p[1] + s[1]) / 2, -ang + Math.PI / 2]);
  }
  mkInst([archPanel(step, H - 6.2, H - .35, cr)], o.archMat || m.stoneB, arches);
  for (const p of pts) C.addRing(p[0], p[1], cr + .15, 6, C.layer);
  // โคมไฟระย้า
  const lamps = pts.filter((_, k) => k % 3 === 0).map(p => [p[0] + step * .5 * ca, p[1] + step * .5 * sa]).filter(p => pIn(rf, p[0], p[1]) && !inCourt(p[0], p[1]));
  const lampGeo = [new THREE.CylinderGeometry(.03, .03, 2.2, 4).translate(0, H - 1.4, 0), new THREE.IcosahedronGeometry(.55, 0).translate(0, H - 2.7, 0), new THREE.CylinderGeometry(.9, .5, .35, 8).translate(0, H - 2.35, 0)];
  mkInst([lampGeo[0], lampGeo[2]], m.brass, lamps); mkInst([lampGeo[1]], m.lamp, lamps);
  return { inside: (x, z) => pIn(rf, x, z) && !inCourt(x, z), ceil: y0 + H - .45, cols: pts };
}

/* ---------------- ร่มยักษ์ (ลานมัสยิดนะบะวีย์) ---------------- */
function umbrellaGeo(S, top) {
  const N = 10, pos = [], idx = [], hh = (u, v) => top - 3.1 * Math.max(Math.abs(u), Math.abs(v)) ** 2 + 2.2 * (Math.abs(u) * Math.abs(v)) ** 2;
  for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) { const u = i / N * 2 - 1, v = j / N * 2 - 1; pos.push(u * S / 2, hh(u, v), v * S / 2); }
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const a = j * (N + 1) + i; idx.push(a, a + N + 1, a + 1, a + 1, a + N + 1, a + N + 2); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
export function umbrellas(C, list, S = 24, top = 14.3) {
  if (!list.length) return;
  const o3 = new THREE.Object3D();
  const mk = (geo, mat, shadow, recv = true) => { const im = new THREE.InstancedMesh(geo, mat, list.length); list.forEach(([x, y, z, r], k) => { o3.position.set(x, y, z); o3.rotation.set(0, r || 0, 0); o3.updateMatrix(); im.setMatrixAt(k, o3.matrix); }); im.castShadow = shadow; im.receiveShadow = recv; im.computeBoundingSphere(); C.group.add(im); };
  mk(umbrellaGeo(S, top), M.umbrella, true, false);
  mk(new THREE.CylinderGeometry(.55, .75, top, 12).translate(0, top / 2, 0), M.stoneB, true);
  mk(new THREE.CylinderGeometry(.9, .9, .4, 12).translate(0, 3.2, 0), M.brass, false);
  mk(new THREE.IcosahedronGeometry(.38, 0).translate(0, top - .3, 0), M.lamp, false);
  for (const [x, , z] of list) C.addRing(x, z, .8, 6, C.layer);
}

/* ---------------- มัสยิดนะบะวีย์ ---------------- */
export function buildNabawi(C, D) {
  const m = M, B = new Batch(), L = D.L, ring = toPts(L.nabawi[0].p), rf = L.nabawi[0].p, H = 13;
  // ลานกลางแจ้งในตัวมัสยิด = พื้นที่ลาน (OSM) ที่อยู่ข้างในรูปร่างอาคาร
  const allIn = f => { for (let i = 0; i < f.length; i += 2) if (!pIn(rf, f[i], f[i + 1]) && pDist(rf, f[i], f[i + 1]) > 1) return false; return true; };
  const courts = D.a.filter(a => a[0] === 0 && allIn(a[1]) && Math.abs(pArea(a[1])) > 1200).map(a => toPts(a[1]));
  // ประตูจากจุดประตูจริง (จำนวนบานจากหมายเลขในชื่อ)
  const doors = D.p.filter(p => p[0] === 1 && pDist(rf, p[1], p[2]) < 6).map(p => { const nums = (p[4].match(/\d+/g) || ['1']).length; return { x: p[1], z: p[2], w: clamp(nums * 4.2, 5, 13), h: 6.2 }; });
  // แกนอาคาร = ทิศของขอบที่ยาวที่สุด
  let ang = 0, bl = 0; for (let i = 0; i < ring.length; i++) { const a = ring[i], b = ring[(i + 1) % ring.length], l = Math.hypot(b[0] - a[0], b[1] - a[1]); if (l > bl) { bl = l; ang = Math.atan2(b[1] - a[1], b[0] - a[0]); } }
  ang = ((ang % (Math.PI / 2)) + Math.PI / 2) % (Math.PI / 2); if (ang > Math.PI / 4) ang -= Math.PI / 2;
  const tomb = L.prophetTomb ? L.prophetTomb[0].p : null, tc = tomb ? pCentroid(tomb) : [0, 0];
  const hall = prayerHall(C, B, { ring, H, courts, doors, facade: m.nabF, bay: 6, angle: ang, colStep: 7.2, colR: .6, colMat: m.white, archMat: m.stoneB, carpet: m.carpetR, skipCol: (x, z) => tomb && (pIn(tomb, x, z) || pDist(tomb, x, z) < 2.5) });
  // อัรเราะฎะฮ์: พรมเขียวด้านตะวันตกของห้องท่านนบี ﷺ
  addShape(B, m.carpetG, [[tc[0] - 42, tc[1] - 13], [tc[0] - 13, tc[1] - 13], [tc[0] - 13, tc[1] + 20], [tc[0] - 42, tc[1] + 20]], [], .085);
  // ห้องท่านนบี ﷺ: รั้วโลหะสีเขียวทองเหลือง
  if (tomb) { const T = toPts(tomb); for (let i = 0; i < T.length; i++) { const a = T[i], b = T[(i + 1) % T.length]; wallBox(B, m.grille, a[0], a[1], b[0], b[1], .35, 0, 0, 6.2, 6.2, 2); B.mesh(new THREE.BoxGeometry(.3, .4, .3), m.brass, a[0], 6.3, a[1]); C.addWall(a[0], a[1], b[0], b[1], .3, C.layer); } }
  // โดมเขียว
  const gd = L.greenDome ? pCentroid(L.greenDome[0].p) : [0, 0], gr = L.greenDome ? pRadius(L.greenDome[0].p, ...gd) * .96 : 8;
  B.mesh(new THREE.CylinderGeometry(gr * 1.06, gr * 1.1, 5.2, 8), m.green, gd[0], H + 2.6, gd[1]);
  B.mesh(new THREE.CylinderGeometry(gr * 1.12, gr * 1.12, .5, 8), m.gold, gd[0], H + 5.3, gd[1]);
  dome(B, m.green, gd[0], H + 5.5, gd[1], gr, gr * 1.18, .9, 0, null, 1.35, m.gold);
  if (L.whiteDome) { const wd = pCentroid(L.whiteDome[0].p), wr = pRadius(L.whiteDome[0].p, ...wd) * .9; dome(B, m.silver, wd[0], H, wd[1], wr, wr * 1.05, .6, 2.2, m.white, .7); }
  // โดมเลื่อนได้ 27 ลูก (สี่เหลี่ยมบนหลังคา) และโดมเล็กสีตะกั่วส่วนออตโตมัน
  const sq = D.w.filter(w => { const f = w[2]; if (f.length < 8 || f.length > 12) return false; const c = pCentroid(f), r = pRadius(f, ...c); return r > 7 && r < 16 && pIn(rf, ...c); });
  for (const w of sq) { const c = pCentroid(w[2]), r = pRadius(w[2], ...c) / Math.SQRT2; B.mesh(new THREE.BoxGeometry(r * 2, 1.3, r * 2), m.stoneB, c[0], H + .65, c[1], -ang); dome(B, m.lead, c[0], H + 1.3, c[1], r * .86, r * .62, .3, 0, null, .5, m.brass); }
  for (let x = tc[0] - 88; x <= tc[0] + 14; x += 9) for (let z = tc[1] - 52; z <= tc[1] + 18; z += 9) {
    if (Math.hypot(x - gd[0], z - gd[1]) < gr + 6 || !pIn(rf, x, z) || pDist(rf, x, z) < 4 || courts.some(c => pIn(flat(c), x, z))) continue;
    if (L.whiteDome && Math.hypot(x - pCentroid(L.whiteDome[0].p)[0], z - pCentroid(L.whiteDome[0].p)[1]) < 9) continue;
    B.mesh(new THREE.BoxGeometry(5.6, .8, 5.6), m.stoneB, x, H + .4, z); dome(B, m.lead, x, H + .8, z, 2.6, 2.2, .4, 0, null, .35, m.brass);
  }
  // ร่มในลานกลางแจ้ง
  const ums = [];
  for (const c of courts) { const f = flat(c), b = pBounds(f); for (let x = b[0] + 9; x < b[2] - 4; x += 18) for (let z = b[1] + 9; z < b[3] - 4; z += 18) if (pIn(f, x, z) && pDist(f, x, z) > 6) ums.push([x, 0, z, -ang]); }
  umbrellas(C, ums, 17.5, 12.2);
  B.flush(C.group);
  return { hall, ang, inside: (x, z) => hall.inside(x, z), ceil: hall.ceil, rf };
}
// ร่มบนลานรอบมัสยิด (ตามตาราง แนวเดียวกับตัวอาคาร)
export function plazaUmbrellas(C, D, rf, ang, blocked) {
  const inside = f => { for (let i = 0; i < f.length; i += 2) if (!pIn(rf, f[i], f[i + 1]) && pDist(rf, f[i], f[i + 1]) > 1) return false; return true; };
  const plazas = D.a.filter(a => a[0] === 0 && !inside(a[1])).map(a => ({ f: a[1], b: pBounds(a[1]) }));
  const list = [], ca = Math.cos(ang), sa = Math.sin(ang), b0 = pBounds(rf), cx = (b0[0] + b0[2]) / 2, cz = (b0[1] + b0[3]) / 2;
  for (let i = -16; i <= 16; i++) for (let j = -16; j <= 16; j++) {
    const lx = i * 25 + 12.5, lz = j * 25 + 12.5, x = cx + lx * ca - lz * sa, z = cz + lx * sa + lz * ca;
    if (pIn(rf, x, z)) continue; const d = pDist(rf, x, z); if (d < 9 || d > 150) continue;
    if (d > 70 && !plazas.some(p => x > p.b[0] && x < p.b[2] && z > p.b[1] && z < p.b[3] && pIn(p.f, x, z) && pDist(p.f, x, z) > 6)) continue;
    if (blocked(x, z, 9)) continue;
    list.push([x, 0, z, ang]);
  }
  umbrellas(C, list);
  return list;
}

/* ---------------- อัลบะกีอ์: กำแพงล้อม + หลุมศพหินเรียบง่ายเป็นแถว ---------------- */
export function buildBaqi(C, D, ground) {
  if (!D.L.baqi) return;
  const B = new Batch(), f = D.L.baqi[0].p, P = toPts(f), b = pBounds(f);
  for (let i = 0; i < P.length; i++) { const a = P[i], c = P[(i + 1) % P.length], gate = i === 0; wallBox(B, M.stoneB, a[0], a[1], c[0], c[1], .7, 0, 0, 2.8, 2.8, 2); if (!gate) C.addWall(a[0], a[1], c[0], c[1], .4, C.layer); }
  const g = new THREE.BoxGeometry(.32, .38, .9), o3 = new THREE.Object3D(), pts = [];
  for (let x = b[0] + 4; x < b[2]; x += 3.6) for (let z = b[1] + 4; z < b[3]; z += 3.1) { const jx = x + (hash(x * 1.3 + z) - .5) * .9, jz = z + (hash(z * 2.1 - x) - .5) * .7; if (pIn(f, jx, jz) && pDist(f, jx, jz) > 3 && hash(jx * 7 + jz) > .3 && pts.length < 5000) pts.push([jx, jz]); }
  const im = new THREE.InstancedMesh(g, M.stone, pts.length);
  pts.forEach(([x, z], k) => { o3.position.set(x, ground(x, z) + .19, z); o3.rotation.set(0, .05 * (hash(x) - .5), 0); o3.updateMatrix(); im.setMatrixAt(k, o3.matrix); });
  im.receiveShadow = true; im.computeBoundingSphere(); C.group.add(im);
  B.flush(C.group);
}

/* ---------------- มัสยิดเล็ก/กลาง (กุบาอ์ กิบลาตัยน์ ซัยยิดุชชุฮะดาอ์) ---------------- */
export function simpleMosque(C, B, ring, o) {
  const f = flat(ring), c = pCentroid(f), H = o.H || 12, y0 = o.y0 || 0;
  const bay = 4;
  for (let i = 0; i < ring.length; i++) { const a = ring[i], b = ring[(i + 1) % ring.length]; wallBox(B, o.facade || M.nabF, a[0], a[1], b[0], b[1], 1.2, y0, y0, y0 + H, 13, bay * 1.5); C.addWall(a[0], a[1], b[0], b[1], .6, C.layer); }
  addShape(B, M.marble, ring, [], y0 + H);
  for (let i = 0; i < ring.length; i++) { const a = ring[i], b = ring[(i + 1) % ring.length]; wallBox(B, M.white, a[0], a[1], b[0], b[1], .4, y0 + H, y0 + H, y0 + H + 1, 1, 2); }
  for (const d of o.domes || []) dome(B, M.white, d[0], y0 + H, d[1], d[2], d[2] * .95, .7, d[3] || 2, M.white, .7);
  for (const p of o.minarets || []) minaret(B, o.minStyle || 'nabawi', p[0], p[1], y0, o.minH || 40, o.minR || 2.4);
}

/* ---------------- บริเวณมัสยิดอัลอักศอ ---------------- */
export const AQSA = { up: 4.2 };
export function aqsaFlats(D) {
  const L = D.L, comp = L.compound[0].p, up = L.compoundPlaza ? L.compoundPlaza[0].p : null;
  // บันไดขึ้นลานโดมแห่งศิลา: เส้นทางขั้นบันได (OSM) ที่ตัดขอบลานยกระดับ
  const stairs = [];
  if (up) for (const r of D.r) {
    if (r[0] !== 9) continue; const f = r[4]; let inA = null, outA = null;
    for (let i = 0; i < f.length; i += 2) { const x = f[i], z = f[i + 1], d = pDist(up, x, z); if (d > 25) continue; if (pIn(up, x, z)) inA = [x, z]; else outA = [x, z]; }
    if (!inA) {
      // บันไดที่อยู่นอกลานทั้งเส้น (ปลายบนชิดขอบลาน): หาปลายที่ใกล้ขอบที่สุด แล้ววางบันไดจากขอบลงไป
      let T = null, Bt = null, td = 1e9, bd = -1;
      for (let i = 0; i < f.length; i += 2) { const dd = pDist(up, f[i], f[i + 1]); if (dd < td) { td = dd; T = [f[i], f[i + 1]]; } if (dd > bd) { bd = dd; Bt = [f[i], f[i + 1]]; } }
      if (!T || td > 4.5 || Math.hypot(T[0] - Bt[0], T[1] - Bt[1]) < 1.5) continue;
      let ex = T[0], ez = T[1], best = 1e9;
      for (let i = 0; i < up.length; i += 2) { const j = (i + 2) % up.length, ax = up[i], az = up[i + 1], bx = up[j], bz = up[j + 1], L2 = (bx - ax) ** 2 + (bz - az) ** 2, t = L2 ? clamp(((T[0] - ax) * (bx - ax) + (T[1] - az) * (bz - az)) / L2, 0, 1) : 0, px = ax + (bx - ax) * t, pz = az + (bz - az) * t, dd = Math.hypot(px - T[0], pz - T[1]); if (dd < best) { best = dd; ex = px; ez = pz; } }
      let dx = T[0] - Bt[0], dz = T[1] - Bt[1]; const l = Math.hypot(dx, dz); dx /= l; dz /= l;
      if (stairs.some(s => Math.hypot(s.ex - ex, s.ez - ez) < 14)) continue;
      stairs.push({ ex, ez, dx, dz, w: 8, run: clamp(l + best + 1, 9, 14) });
      continue;
    }
    if (!outA) continue;
    let dx = inA[0] - outA[0], dz = inA[1] - outA[1]; const l = Math.hypot(dx, dz); if (l < 1) continue; dx /= l; dz /= l;
    // จุดตัดขอบ
    let lo = 0, hi = 1, ex = 0, ez = 0; for (let k = 0; k < 20; k++) { const t = (lo + hi) / 2; ex = outA[0] + (inA[0] - outA[0]) * t; ez = outA[1] + (inA[1] - outA[1]) * t; if (pIn(up, ex, ez)) hi = t; else lo = t; }
    if (stairs.some(s => Math.hypot(s.ex - ex, s.ez - ez) < 14)) continue;
    stairs.push({ ex, ez, dx, dz, w: 9, run: 9 });
  }
  const height = (x, z) => {
    for (const s of stairs) { const rx = x - s.ex, rz = z - s.ez, t = rx * s.dx + rz * s.dz, lat = Math.abs(-rx * s.dz + rz * s.dx); if (lat < s.w / 2 && t > -s.run && t < 1.2) return AQSA.up * clamp((t + s.run) / s.run, 0, 1); }
    return null;
  };
  return { comp, up, stairs, height };
}
export function buildAqsa(C, D, T) {
  const m = M, B = new Batch(), L = D.L, F = T.aqsa, up = F.up, U = AQSA.up;
  // พื้นลานหินปูนทั้งบริเวณ (เว้นสวน) และลานหินอ่อนยกระดับ
  const gardens = D.a.filter(a => (a[0] === 1 || a[0] === 4) && pIn(F.comp, ...pCentroid(a[1]))).map(a => toPts(a[1]));
  addShape(B, m.lime, toPts(F.comp), gardens, .04);
  if (up) {
    addShape(B, m.marble, toPts(up), [], U + .03);
    // กำแพงกันดินรอบลานยกระดับ (เว้นช่องบันได)
    const P = toPts(up);
    for (let i = 0; i < P.length; i++) {
      const a = P[i], b = P[(i + 1) % P.length], Ls = Math.hypot(b[0] - a[0], b[1] - a[1]); if (Ls < .2) continue;
      const ux = (b[0] - a[0]) / Ls, uz = (b[1] - a[1]) / Ls; let cur = 0; const cuts = [];
      for (const s of F.stairs) { if (segDist(s.ex, s.ez, a[0], a[1], b[0], b[1]) > 1.5) continue; const t = (s.ex - a[0]) * ux + (s.ez - a[1]) * uz; cuts.push([t - s.w / 2, t + s.w / 2]); }
      cuts.sort((p, q) => p[0] - q[0]);
      const seg = (s0, s1) => { if (s1 - s0 < .1) return; const p = [a[0] + ux * s0, a[1] + uz * s0], q = [a[0] + ux * s1, a[1] + uz * s1]; wallBox(B, m.jstone, p[0], p[1], q[0], q[1], .8, 0, 0, U + .9, U + .9, 4); C.addWall(p[0], p[1], q[0], q[1], .5, C.layer); };
      for (const [s0, s1] of cuts) { seg(cur, clamp(s0, 0, Ls)); cur = Math.max(cur, clamp(s1, 0, Ls)); }
      seg(cur, Ls);
    }
    // บันไดหินและซุ้มโค้ง (อัลกอนาฏิร) ที่หัวบันได
    for (const s of F.stairs) {
      const ry = Math.atan2(-s.dz, s.dx), nx = -s.dz, nz = s.dx;
      for (let k = 0; k < 14; k++) { const t = -s.run + (k + .5) * s.run / 14, h = U * (k + 1) / 14; B.mesh(new THREE.BoxGeometry(s.run / 14 + .02, h, s.w), m.jstone, s.ex + s.dx * t, h / 2, s.ez + s.dz * t, ry); }
      const ax = s.ex + s.dx * 1.4, az = s.ez + s.dz * 1.4;
      for (const k of [-1.5, -.5, .5, 1.5]) { const px = ax + nx * k * 3, pz = az + nz * k * 3; B.mesh(new THREE.CylinderGeometry(.32, .36, 5.2, 10), m.white, px, U + 2.6, pz); C.addRing(px, pz, .45, 6, C.layer); }
      B.mesh(new THREE.BoxGeometry(1.1, 1.4, 10.2), m.stoneJ, ax, U + 6.4, az, ry);
      for (const k of [-1, 0, 1]) { const g = archPanel(3, U + 3.8, U + 5.7, .32); g.rotateY(Math.PI / 2); const o3 = new THREE.Object3D(); o3.position.set(ax + nx * k * 3, 0, az + nz * k * 3); o3.rotation.y = ry; o3.updateMatrix(); B.add(m.stoneJ, g, o3.matrix); }
    }
  }
  // โดมแห่งศิลา
  const oct = toPts(L.domeRock[0].p), oc = pCentroid(L.domeRock[0].p), y0 = U;
  const sides = [];
  for (let i = 0; i < oct.length; i++) {
    const a = oct[i], b = oct[(i + 1) % oct.length], Ls = Math.hypot(b[0] - a[0], b[1] - a[1]), mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2;
    const nx = (mx - oc[0]) / Math.hypot(mx - oc[0], mz - oc[1]), nz = (mz - oc[1]) / Math.hypot(mx - oc[0], mz - oc[1]);
    const door = Math.abs(nx) > .92 || Math.abs(nz) > .92;
    sides.push({ a, b, Ls, mx, mz, nx, nz, door });
    if (door) {
      const ux = (b[0] - a[0]) / Ls, uz = (b[1] - a[1]) / Ls, dw = 2.6;
      const p1 = [mx - ux * dw, mz - uz * dw], p2 = [mx + ux * dw, mz + uz * dw];
      wallBox(B, m.dorSide, a[0], a[1], p1[0], p1[1], 1.4, y0, y0, y0 + 11.5, 11.5, Ls); C.addWall(a[0], a[1], p1[0], p1[1], .7, C.layer);
      wallBox(B, m.dorSide, p2[0], p2[1], b[0], b[1], 1.4, y0, y0, y0 + 11.5, 11.5, Ls); C.addWall(p2[0], p2[1], b[0], b[1], .7, C.layer);
      wallBox(B, m.dorSide, p1[0], p1[1], p2[0], p2[1], 1.4, y0, y0 + 4.6, y0 + 11.5, 11.5, Ls);
      // ซุ้มประตูหน้า (มุข)
      const px = mx + nx * 3.2, pz = mz + nz * 3.2;
      B.mesh(new THREE.BoxGeometry(7.2, .7, 5.6), m.lead, px, y0 + 6.2, pz, Math.atan2(-uz, ux));
      for (const k of [-1, 1]) for (const f of [1.2, 5.6]) B.mesh(new THREE.CylinderGeometry(.28, .3, 5.8, 10), m.white, mx + ux * k * 3 + nx * f, y0 + 2.9, mz + uz * k * 3 + nz * f);
      B.mesh(new THREE.BoxGeometry(3.6, 4.4, .2), m.wood, mx - nx * .2, y0 + 2.2, mz - nz * .2, Math.atan2(-uz, ux)); // บานประตู (เปิดไว้ครึ่งหนึ่ง)
    } else { wallBox(B, m.dorSide, a[0], a[1], b[0], b[1], 1.4, y0, y0, y0 + 11.5, 11.5, Ls); C.addWall(a[0], a[1], b[0], b[1], .7, C.layer); }
  }
  const apo = Math.hypot(sides[0].mx - oc[0], sides[0].mz - oc[1]), dc = L.domeRockDome ? pCentroid(L.domeRockDome[0].p) : oc, dr = L.domeRockDome ? pRadius(L.domeRockDome[0].p, ...dc) * .98 : 11;
  // หลังคาลาดตะกั่วรอบกลอง
  { const g = new THREE.CylinderGeometry(dr * 1.05, apo / Math.cos(Math.PI / 8) * 1.0, 2.6, 8, 1, true); g.rotateY(Math.PI / 8 + Math.atan2(sides[0].a[1] - oc[1], sides[0].a[0] - oc[0]) * 0); B.mesh(g, m.lead, oc[0], y0 + 12.8, oc[1], -Math.atan2(sides[0].a[1] - oc[1], sides[0].a[0] - oc[0]) + Math.PI / 8 * 0); }
  addShape(B, m.lead, oct, [], y0 + 11.55);
  // กลอง + โดมทอง
  { const g = new THREE.CylinderGeometry(dr, dr, 9.5, 32, 1, true); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * 16); B.mesh(g, m.drum, dc[0], y0 + 11.5 + 4.75, dc[1]); }
  B.mesh(new THREE.CylinderGeometry(dr * 1.04, dr * 1.04, .6, 32), m.gold, dc[0], y0 + 21.3, dc[1]);
  dome(B, m.gold, dc[0], y0 + 21.5, dc[1], dr * 1.02, dr * 1.12, .7, 0, null, 1.4, m.gold);
  // ภายใน: ศิลา (อัศศ็อขเราะฮ์) ราวไม้ ซุ้มเสาวงใน พรม เพดาน
  addShape(B, m.carpetR, oct, [], y0 + .06);
  { const g = new THREE.DodecahedronGeometry(1, 2), p = g.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), n = 1 + .18 * Math.sin(x * 5 + z * 3) + .12 * Math.cos(z * 7); p.setXYZ(i, x * 7.5 * n, Math.max(-.2, y) * 1.6 * n, z * 6.2 * n); } g.computeVertexNormals(); B.mesh(g, m.rock, dc[0], y0 + .1, dc[1]); }
  { const g = new THREE.TorusGeometry(9.2, .08, 6, 48); g.rotateX(Math.PI / 2); B.mesh(g, m.wood, dc[0], y0 + 1.3, dc[1]); for (let k = 0; k < 24; k++) { const a = k / 24 * Math.PI * 2; B.mesh(new THREE.BoxGeometry(.12, 1.3, .12), m.wood, dc[0] + Math.cos(a) * 9.2, y0 + .65, dc[1] + Math.sin(a) * 9.2); } C.addRing(dc[0], dc[1], 9.4, 16, C.layer); }
  for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2, x = dc[0] + Math.cos(a) * dr * .98, z = dc[1] + Math.sin(a) * dr * .98, pier = k % 4 === 0; B.mesh(pier ? new THREE.BoxGeometry(1.6, 11, 1.6) : new THREE.CylinderGeometry(.4, .45, 11, 10), pier ? m.stone : m.white, x, y0 + 5.5, z, -a); C.addRing(x, z, pier ? 1.1 : .5, 6, C.layer); }
  for (let k = 0; k < 24; k++) { const a = (k + .5) / 24 * Math.PI * 2, r = apo * .64, x = oc[0] + Math.cos(a) * r, z = oc[1] + Math.sin(a) * r, pier = k % 3 === 1; B.mesh(pier ? new THREE.BoxGeometry(1.5, 9.5, 1.5) : new THREE.CylinderGeometry(.38, .42, 9.5, 10), pier ? m.stone : m.white, x, y0 + 4.75, z, -a); C.addRing(x, z, pier ? 1 : .5, 6, C.layer); }
  addShape(B, m.ceil, oct, [], y0 + 11.2, true);
  const domeIn = new THREE.Mesh(domeGeo(dr * .98, dr * 1.08, .7, 32), new THREE.MeshStandardMaterial({ color: 0xc9a24a, side: THREE.BackSide, roughness: .4, metalness: .6 })); domeIn.position.set(dc[0], y0 + 21.4, dc[1]); C.group.add(domeIn);
  // โดมโซ่ (กุบบะตุสสิลสิละฮ์): เสารอบนอก 11 ต้น หลังคาลาด โดมเล็ก
  if (L.domeChain) {
    const f = L.domeChain[0].p, c = pCentroid(f), r = pRadius(f, ...c) * .92;
    for (let k = 0; k < 11; k++) { const a = k / 11 * Math.PI * 2; B.mesh(new THREE.CylinderGeometry(.26, .28, 4.2, 10), m.white, c[0] + Math.cos(a) * r, U + 2.1, c[1] + Math.sin(a) * r); }
    for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; B.mesh(new THREE.CylinderGeometry(.26, .28, 5.6, 10), m.white, c[0] + Math.cos(a) * r * .45, U + 2.8, c[1] + Math.sin(a) * r * .45); }
    B.mesh(new THREE.CylinderGeometry(r * .55, r * 1.08, 1.2, 11), m.lead, c[0], U + 4.8, c[1]);
    dome(B, m.lead, c[0], U + 5.4, c[1], r * .5, r * .5, .5, 2.4, m.drum, .7);
    C.addRing(c[0], c[1], r + .3, 11, C.layer);
  }
  // มัสยิดอัลกิบลีย์ (เดินเข้าได้): ผนังหิน มุขซุ้มโค้ง 7 ช่องด้านเหนือ หลังคาจั่วตะกั่ว โดมสีเงิน
  if (L.qibli) {
    const ring = toPts(L.qibli[0].p), qf = L.qibli[0].p;
    let north = null, nb = -1e9; for (let i = 0; i < ring.length; i++) { const a = ring[i], b = ring[(i + 1) % ring.length], l = Math.hypot(b[0] - a[0], b[1] - a[1]); if (l < 25) continue; const mz = -(a[1] + b[1]) / 2; if (mz > nb) { nb = mz; north = [a, b]; } }
    const doors = [];
    if (north) { const [a, b] = north; for (let k = 0; k < 7; k++) { const t = (k + .5) / 7; doors.push({ x: a[0] + (b[0] - a[0]) * t, z: a[1] + (b[1] - a[1]) * t, w: 3.4, h: 6 }); } }
    const ang = north ? Math.atan2(north[1][1] - north[0][1], north[1][0] - north[0][0]) : 0;
    const qtex = M.nabF;
    const hall = prayerHall(C, B, { ring, H: 14, doors, facade: qtex, bay: 6, angle: ang, colStep: 8, colR: .55, carpet: m.carpetR, colMat: m.white, archMat: m.stoneJ, parapet: m.stoneJ });
    T.aqsaHalls.push(hall);
    if (north) { const [a, b] = north, l = Math.hypot(b[0] - a[0], b[1] - a[1]), ux = (b[0] - a[0]) / l, uz = (b[1] - a[1]) / l, nx = uz, nz = -ux, sgn = pIn(qf, (a[0] + b[0]) / 2 + nx * 2, (a[1] + b[1]) / 2 + nz * 2) ? -1 : 1;
      for (let k = 0; k <= 7; k++) { const t = k / 7, x = a[0] + (b[0] - a[0]) * t + nx * sgn * 6, z = a[1] + (b[1] - a[1]) * t + nz * sgn * 6; B.mesh(new THREE.BoxGeometry(1.3, 9, 1.3), m.stoneJ, x, 4.5, z); C.addRing(x, z, .9, 6, C.layer); }
      const cx = (a[0] + b[0]) / 2 + nx * sgn * 3.2, cz = (a[1] + b[1]) / 2 + nz * sgn * 3.2;
      B.mesh(new THREE.BoxGeometry(l, 1.6, 7), m.stoneJ, cx, 9.8, cz, Math.atan2(-uz, ux));
      for (let k = 0; k < 7; k++) { const t = (k + .5) / 7, g = archPanel(l / 7, 5.2, 9, .65); const o3 = new THREE.Object3D(); o3.position.set(a[0] + (b[0] - a[0]) * t + nx * sgn * 6, 0, a[1] + (b[1] - a[1]) * t + nz * sgn * 6); o3.rotation.y = Math.atan2(-uz, ux); o3.updateMatrix(); B.add(m.stoneJ, g, o3.matrix); }
    }
    // หลังคาจั่ว
    { const c = pCentroid(qf), r = pRadius(qf, ...c); const g = new THREE.CylinderGeometry(.01, 9, 5, 4, 1); g.rotateY(Math.PI / 4); g.scale(1, 1, r * .1); B.mesh(g, m.lead, c[0], 14 + 2.5, c[1], -ang + Math.PI / 2); }
    if (L.qibliDome) { const c = pCentroid(L.qibliDome[0].p), r = pRadius(L.qibliDome[0].p, ...c) * .9; dome(B, m.silver, c[0], 14, c[1], r, r * .95, .6, 4.5, m.stoneJ, 1); }
  }
  // อัลกาส: อ่างน้ำพุวงกลมพร้อมก๊อกและที่นั่ง
  if (L.alKas) {
    const c = pCentroid(L.alKas[0].p), r = pRadius(L.alKas[0].p, ...c);
    B.mesh(new THREE.CylinderGeometry(r, r, .55, 32), m.marble, c[0], .3, c[1]);
    B.mesh(new THREE.CylinderGeometry(r * .82, r * .82, .1, 32), new THREE.MeshStandardMaterial({ color: 0x4f8fa8, roughness: .1, metalness: .2 }), c[0], .6, c[1]);
    B.mesh(new THREE.CylinderGeometry(.35, .5, 1.6, 12), m.white, c[0], 1, c[1]);
    for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2; B.mesh(new THREE.CylinderGeometry(.22, .22, .45, 10), m.stone, c[0] + Math.cos(a) * (r + .9), .22, c[1] + Math.sin(a) * (r + .9)); }
    C.addRing(c[0], c[1], r + .2, 12, C.layer);
  }
  B.flush(C.group);
}
