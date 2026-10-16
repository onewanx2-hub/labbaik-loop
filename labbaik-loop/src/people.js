// ตัวละครคนแบบภาพการ์ตูน (ผ้าอิห์รอมขาว หัวกลมโต แรเงาแบบการ์ตูน)
// ใช้ร่วมกันทั้งตัวผู้เล่น (แยกชิ้นเพื่อทำท่าทาง) และฝูงชน (รวมเป็นเมชเดียวต่อแบบ + แอนิเมชันในเชดเดอร์)
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// ชิ้นส่วน: 0 ลำตัวล่าง, 1 ลำตัวบน+ศีรษะ, 2 แขนขวา, 3 แขนซ้าย, 4 ขาขวา, 5 ขาซ้าย
export const PART = { LOWER: 0, UPPER: 1, ARM_R: 2, ARM_L: 3, LEG_R: 4, LEG_L: 5 };
export const SHOULDER_Y = 1.42, KNEE_Y = .5, WAIST_Y = 1.0;
const HEAD_C = new THREE.Vector3(0, 1.7, 0);

let gradient = null;
export function toonGradient() {
  if (gradient) return gradient;
  gradient = new THREE.DataTexture(new Uint8Array([90, 175, 255]), 3, 1, THREE.RedFormat);
  gradient.minFilter = gradient.magFilter = THREE.NearestFilter; gradient.needsUpdate = true;
  return gradient;
}

const V = (x, y, z) => new THREE.Vector3(x, y, z);
function place(g, pos, scl, rot) {
  const m = new THREE.Matrix4().compose(pos || V(0, 0, 0), new THREE.Quaternion().setFromEuler(new THREE.Euler(...(rot || [0, 0, 0]))), scl || V(1, 1, 1));
  return g.applyMatrix4(m);
}
const lathe = (pts, seg, ts = 0, tl = Math.PI * 2) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg, ts, tl);
// เก็บเฉพาะสามเหลี่ยมที่ผ่านเงื่อนไข (ใช้ตัดผ้าพาดเฉียง)
function keepTris(g, fn) {
  const p = g.attributes.position, idx = g.index.array, out = [];
  for (let i = 0; i < idx.length; i += 3) {
    const a = idx[i], b = idx[i + 1], c = idx[i + 2];
    const x = (p.getX(a) + p.getX(b) + p.getX(c)) / 3, y = (p.getY(a) + p.getY(b) + p.getY(c)) / 3, z = (p.getZ(a) + p.getZ(b) + p.getZ(c)) / 3;
    if (fn(x, y, z)) out.push(a, b, c);
  }
  g.setIndex(out); return g;
}

/**
 * สร้างรายการชิ้นส่วนของตัวละคร
 * o: { g:'m'|'f', kid, ihram, idtiba, skin, hair, hairStyle:'short'|'curly'|'bald'|'none', beard:'none'|'short'|'full', beardColor,
 *      cloth (ชุดเดินทาง), dress, khimar, cap }
 * detail: 'hi' (ผู้เล่น) | 'lo' (ฝูงชน)
 */
export function figureParts(o, detail = 'hi') {
  // 'xlo' = รายละเอียดต่ำสุดสำหรับคนเดินในเมืองจำนวนมาก
  const hi = detail === 'hi', S = hi ? 1 : detail === 'xlo' ? .17 : .3;
  const seg = n => Math.max(hi ? 6 : detail === 'xlo' ? 4 : 5, Math.round(n * S)), cap = hi ? 4 : 1;
  const parts = [];
  // fine = รายละเอียดเล็ก (หู คิ้ว จมูก ชายผ้า) ใส่เฉพาะตัวผู้เล่น ฝูงชนตัดทิ้งเพื่อความลื่น
  const add = (geo, color, part, head, fine, pv) => { if (fine && !hi) { geo.dispose(); return geo; } parts.push({ geo, color, part, head: !!head, pv }); return geo; };
  const WHITE = '#F6F5F0', SHOE = '#2a2a2e', EYE = '#1c1814', MOUTH = '#8c3f31';
  const skin = o.skin, skinD = '#' + new THREE.Color(skin).multiplyScalar(.86).getHexString();
  const male = o.g === 'm';

  // ศีรษะ
  add(place(new THREE.SphereGeometry(.15, seg(32), seg(24)), HEAD_C, V(.96, 1.05, .97)), skin, PART.UPPER, true);
  for (const s of [-1, 1]) {
    add(place(new THREE.SphereGeometry(.03, seg(12), seg(8)), V(.143 * s, 1.69, -.005), V(.5, 1, .8)), skin, PART.UPPER, true, true);
    add(place(new THREE.SphereGeometry(.018, seg(12), seg(8)), V(.052 * s, 1.715, .134)), EYE, PART.UPPER, true);
    if (hi) add(place(new THREE.SphereGeometry(.006, 8, 6), V(.047 * s, 1.722, .15)), '#ffffff', PART.UPPER, true);
    add(place(new THREE.CapsuleGeometry(.008, .034, cap, seg(8)), V(.052 * s, 1.757, .132), null, [0, 0, Math.PI / 2 + .12 * s]), o.g === 'f' ? '#3a2a22' : (o.hair || '#1d1814'), PART.UPPER, true, true);
  }
  add(place(new THREE.SphereGeometry(.024, seg(12), seg(8)), V(0, 1.678, .148), V(1, .9, 1.15)), skinD, PART.UPPER, true, true);
  add(place(new THREE.TorusGeometry(.032, .0075, seg(6), seg(14), Math.PI), V(0, 1.648, .138), null, [0, 0, Math.PI]), MOUTH, PART.UPPER, true);
  add(place(new THREE.CylinderGeometry(.06, .068, .12, seg(16)), V(0, 1.53, 0)), skin, PART.UPPER);

  if (male) {
    // ผม/หมวก/เครา
    const hs = o.hairStyle || 'short';
    if (o.ghutra) {
      // ผ้าโพกศีรษะแบบอาหรับ (ฆุตเราะฮ์/ชิมาฆ) + อะกัลสีดำ
      add(place(new THREE.SphereGeometry(.172, seg(28), seg(12), 0, Math.PI * 2, 0, Math.PI * .5), HEAD_C, V(1, 1.1, 1.04), [-.18, 0, 0]), o.ghutra, PART.UPPER, true);
      add(place(lathe([[.17, 1.74], [.2, 1.6], [.24, 1.44], [.27, 1.36]], seg(28), Math.PI * .28, Math.PI * 1.44), V(0, 0, -.01), V(1, 1, .92)), o.ghutra, PART.UPPER, true);
      add(place(new THREE.TorusGeometry(.13, .018, seg(6), seg(20)), V(0, 1.83, -.02), V(1, 1, 1.05), [Math.PI / 2 + .25, 0, 0]), '#151515', PART.UPPER, true);
    }
    else if (o.cap) add(place(new THREE.SphereGeometry(.158, seg(28), seg(10), 0, Math.PI * 2, 0, Math.PI * .37), HEAD_C, V(.97, 1.04, 1), [-.12, 0, 0]), o.capColor || '#F3F2EC', PART.UPPER, true);
    else if (hs === 'short' || hs === 'curly') {
      add(place(new THREE.SphereGeometry(.157, seg(28), seg(12), 0, Math.PI * 2, 0, Math.PI * .44), HEAD_C, V(.97, 1.06, 1.01), [-.28, 0, 0]), o.hair, PART.UPPER, true);
      if (hs === 'curly') for (let k = 0; k < (hi ? 9 : 5); k++) { const a = k / (hi ? 9 : 5) * Math.PI * 2; add(place(new THREE.SphereGeometry(.045, seg(10), seg(8)), V(Math.cos(a) * .09, 1.83, Math.sin(a) * .08 - .02)), o.hair, PART.UPPER, true); }
    } else if (hs === 'bald') {
      add(place(new THREE.TorusGeometry(.14, .025, seg(6), seg(20), Math.PI * 1.2), V(0, 1.69, -.01), V(1, 1, .9), [Math.PI / 2, 0, -Math.PI * .1]), o.beardColor || '#c9c5bd', PART.UPPER, true);
    }
    if (o.beard && o.beard !== 'none') {
      const full = o.beard === 'full';
      add(place(new THREE.SphereGeometry(.153, seg(28), seg(14), Math.PI * .1, Math.PI * .8, Math.PI * (full ? .58 : .66), Math.PI * (full ? .34 : .24)), HEAD_C, V(.97, 1.07, 1.01)), o.beardColor || o.hair, PART.UPPER, true);
      add(place(new THREE.CapsuleGeometry(.009, .05, cap, seg(8)), V(0, 1.662, .147), null, [0, 0, Math.PI / 2]), o.beardColor || o.hair, PART.UPPER, true, true);
    }
    // แขน
    for (const s of [-1, 1]) {
      const pr = s < 0 ? PART.ARM_R : PART.ARM_L;
      add(place(new THREE.CapsuleGeometry(.056, .2, cap, seg(12)), V(.27 * s, 1.27, 0), null, [0, 0, .07 * s]), skin, pr);
      add(place(new THREE.CapsuleGeometry(.049, .18, cap, seg(12)), V(.29 * s, 1.03, .01)), skin, pr);
      add(place(new THREE.SphereGeometry(.052, seg(14), seg(10)), V(.295 * s, .87, .02), V(.8, 1.15, .72)), skin, pr);
    }
    if (o.ihram) {
      // ขาและเท้าเปล่า
      for (const s of [-1, 1]) {
        const pl = s < 0 ? PART.LEG_R : PART.LEG_L;
        add(place(new THREE.CapsuleGeometry(.053, .36, cap, seg(12)), V(.09 * s, .27, 0)), skin, pl);
        add(place(new THREE.SphereGeometry(.06, seg(12), seg(8)), V(.09 * s, .035, .045), V(1, .5, 1.9)), skin, pl);
      }
      // ผ้านุ่ง (อิซาร)
      add(place(lathe([[0, .4], [.258, .4], [.252, .55], [.238, .75], [.226, .95], [.222, 1.03], [0, 1.03]], seg(40)), null, V(1, 1, .78)), WHITE, PART.LOWER);
      add(place(lathe([[.226, .97], [.232, .985], [.232, 1.02], [.226, 1.035]], seg(40)), null, V(1, 1, .79)), '#E4E2DA', PART.LOWER, false, true);
      // ลำตัว
      add(place(lathe([[0, .98], [.2, .98], [.215, 1.12], [.232, 1.28], [.225, 1.38], [.17, 1.46], [.08, 1.5], [0, 1.5]], seg(36)), null, V(1, 1, .7)), skin, PART.UPPER);
      // ผ้าคลุม (ริดาอ์): เปิดไหล่ขวาเมื่ออิฎฏิบาอ์
      const rida = place(new THREE.CylinderGeometry(.245, .252, .6, seg(48), hi ? 22 : 6, true), V(0, 1.22, 0), V(1, 1, .74));
      if (o.idtiba) {
        keepTris(rida, (x, y) => y < 1.33 + .62 * x);
        // ชายผ้าม้วนตามแนวเฉียง ปิดขอบที่ตัด
        const pts = []; for (let k = 0; k <= 48; k++) { const a = k / 48 * Math.PI * 2, x = Math.cos(a) * .25, z = Math.sin(a) * .25 * .74; pts.push(V(x, 1.33 + .62 * x - .012, z)); }
        add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), seg(64), .016, seg(6), true), '#E9E7E0', PART.UPPER, false, true);
      }
      else keepTris(rida, (x, y, z) => !(y > 1.43 && Math.abs(x) < .1 && z > 0));
      add(rida, WHITE, PART.UPPER);
      for (const s of (o.idtiba ? [1] : [-1, 1])) {
        add(place(new THREE.SphereGeometry(.125, seg(18), seg(10), 0, Math.PI * 2, 0, Math.PI / 2), V(.17 * s, 1.43, 0), V(1.05, .78, 1.08)), WHITE, PART.UPPER);
        add(place(new THREE.CapsuleGeometry(.072, .16, cap, seg(12)), V(.272 * s, 1.3, 0), null, [0, 0, .07 * s]), WHITE, s < 0 ? PART.ARM_R : PART.ARM_L);
      }
      // ชายผ้าที่ห้อยลงด้านหน้าไหล่ซ้าย
      add(place(new THREE.BoxGeometry(.13, .42, .02), V(.12, 1.17, .175), null, [0, 0, -.35]), '#EFEDE6', PART.UPPER, false, true);
    } else if (o.style === 'shirt') {
      // เสื้อเชิ้ต + กางเกงขายาว (ขาแกว่งจากสะโพก)
      add(place(lathe([[0, .92], [.21, .92], [.226, 1.1], [.234, 1.28], [.226, 1.38], [.17, 1.47], [.08, 1.52], [0, 1.52]], seg(36)), null, V(1, 1, .72)), o.shirt, PART.UPPER);
      add(place(lathe([[0, .86], [.2, .86], [.205, .98], [0, .98]], seg(28)), null, V(1, 1, .74)), o.pants, PART.LOWER);
      for (const s of [-1, 1]) {
        const pr = s < 0 ? PART.ARM_R : PART.ARM_L, pl = s < 0 ? PART.LEG_R : PART.LEG_L;
        add(place(new THREE.CapsuleGeometry(.068, .2, cap, seg(12)), V(.27 * s, 1.27, 0), null, [0, 0, .07 * s]), o.shirt, pr);
        add(place(new THREE.CapsuleGeometry(.075, .74, cap, seg(12)), V(.095 * s, .5, 0)), o.pants, pl, false, false, .95);
        add(place(new THREE.SphereGeometry(.062, seg(12), seg(8)), V(.095 * s, .04, .05), V(1, .55, 1.9)), '#2b2522', pl, false, false, .95);
      }
    } else {
      // โต๊ปชุดเดินทาง
      add(place(lathe([[0, .03], [.27, .03], [.262, .3], [.245, .6], [.228, .9], [.235, 1.2], [.226, 1.38], [.17, 1.47], [.08, 1.52], [0, 1.52]], seg(40)), null, V(1, 1, .74)), o.cloth, PART.LOWER);
      for (const s of [-1, 1]) {
        const pr = s < 0 ? PART.ARM_R : PART.ARM_L;
        add(place(new THREE.CapsuleGeometry(.068, .2, cap, seg(12)), V(.27 * s, 1.27, 0), null, [0, 0, .07 * s]), o.cloth, pr);
        add(place(new THREE.CapsuleGeometry(.06, .15, cap, seg(12)), V(.29 * s, 1.05, .01)), o.cloth, pr);
        add(place(new THREE.SphereGeometry(.06, seg(12), seg(8)), V(.09 * s, .04, .05), V(1, .55, 1.9)), '#5a4532', s < 0 ? PART.LEG_R : PART.LEG_L);
      }
    }
  } else {
    // ผู้หญิง: ชุดยาว + ผ้าคลุมศีรษะ
    const dress = o.dress || WHITE, kh = o.khimar || WHITE;
    add(place(lathe([[0, .05], [.3, .05], [.282, .3], [.254, .6], [.232, .9], [.222, 1.08], [0, 1.08]], seg(40)), null, V(1, 1, .78)), dress, PART.LOWER);
    add(place(lathe([[0, 1.0], [.215, 1.0], [.228, 1.2], [.22, 1.38], [.16, 1.48], [0, 1.5]], seg(32)), null, V(1, 1, .72)), dress, PART.UPPER);
    add(place(new THREE.SphereGeometry(.176, seg(30), seg(20), Math.PI / 2 + .62, Math.PI * 2 - 1.24, 0, Math.PI * .8), HEAD_C.clone().add(V(0, .01, -.005)), V(1, 1.07, 1.02)), kh, PART.UPPER, true);
    add(lathe([[.16, 1.6], [.22, 1.5], [.3, 1.34], [.345, 1.16], [.355, 1.0]], seg(40)), kh, PART.UPPER);
    add(place(new THREE.CircleGeometry(.1, seg(16)), V(0, 1.6, -.17), V(1.4, 1.2, 1), [Math.PI, 0, 0]), kh, PART.UPPER);
    for (const s of [-1, 1]) {
      const pr = s < 0 ? PART.ARM_R : PART.ARM_L;
      add(place(new THREE.CapsuleGeometry(.066, .17, cap, seg(12)), V(.28 * s, 1.08, .01), null, [0, 0, .05 * s]), dress, pr);
      add(place(new THREE.SphereGeometry(.05, seg(14), seg(10)), V(.295 * s, .9, .03), V(.8, 1.15, .72)), skin, pr);
      add(place(new THREE.SphereGeometry(.058, seg(12), seg(8)), V(.085 * s, .04, .07), V(1, .55, 1.8)), SHOE, s < 0 ? PART.LEG_R : PART.LEG_L);
    }
  }
  // หัวโตแบบการ์ตูน (เด็กโตกว่าผู้ใหญ่) แล้วย่อทั้งตัวสำหรับเด็ก
  const hk = o.kid ? 1.22 : 1.08;
  const hs = new THREE.Matrix4().makeTranslation(HEAD_C.x, HEAD_C.y, HEAD_C.z).multiply(new THREE.Matrix4().makeScale(hk, hk, hk)).multiply(new THREE.Matrix4().makeTranslation(-HEAD_C.x, -HEAD_C.y + .012, -HEAD_C.z));
  const ks = new THREE.Matrix4().makeScale(.62, .62, .62);
  for (const p of parts) { if (p.head) p.geo.applyMatrix4(hs); if (o.kid) p.geo.applyMatrix4(ks); }
  for (const p of parts) for (const k of Object.keys(p.geo.attributes)) if (!['position', 'normal', 'uv'].includes(k)) p.geo.deleteAttribute(k);
  return { parts, scale: o.kid ? .62 : 1 };
}

/* ---------------- ฝูงชน: รวมเป็นเมชเดียวต่อแบบ พร้อมแกว่งแขนขาในเชดเดอร์ ---------------- */
export function mergedFigure(o, detail = 'lo') {
  const { parts, scale } = figureParts(o, detail);
  const geos = parts.map(p => {
    const g = p.geo.index ? p.geo : p.geo; const n = g.attributes.position.count;
    const c = new THREE.Color(p.color), col = new Float32Array(n * 3), part = new Float32Array(n), piv = new Float32Array(n);
    const py = (p.pv ?? (p.part === PART.ARM_R || p.part === PART.ARM_L ? SHOULDER_Y : p.part >= PART.LEG_R ? KNEE_Y : 0)) * scale;
    for (let i = 0; i < n; i++) { col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; part[i] = p.part; piv[i] = py; }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setAttribute('aPart', new THREE.BufferAttribute(part, 1)); g.setAttribute('aPivot', new THREE.BufferAttribute(piv, 1));
    return g.index ? g : g;
  });
  return mergeGeometries(geos.map(g => g.index ? g : g), false);
}
export const crowdTime = { value: 0 };
const STILL = { value: 0 };
// still = คนที่ยืนอยู่กับที่ (ไม่แกว่งแขนขา)
export function crowdMaterial(still) {
  const m = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: toonGradient(), side: THREE.DoubleSide });
  m.onBeforeCompile = sh => {
    sh.uniforms.uTime = still ? STILL : crowdTime;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
        attribute float aPart; attribute float aPivot; attribute float aPhase; uniform float uTime;
        mat3 limbRot(float a) { float c = cos(a), s = sin(a); return mat3(1.0, 0.0, 0.0, 0.0, c, s, 0.0, -s, c); }`)
      .replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>
        float swing = ${still ? '0.0' : 'sin(uTime * 5.2 + aPhase)'};
        float limbA = 0.0;
        if (aPart > 1.5 && aPart < 2.5) limbA = -swing * 0.45;
        else if (aPart > 2.5 && aPart < 3.5) limbA = swing * 0.45;
        else if (aPart > 3.5 && aPart < 4.5) limbA = swing * 0.4;
        else if (aPart > 4.5) limbA = -swing * 0.4;
        objectNormal = limbRot(limbA) * objectNormal;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        transformed.y -= aPivot; transformed = limbRot(limbA) * transformed; transformed.y += aPivot;`);
  };
  m.customProgramCacheKey = () => 'umrah-crowd-v1' + (still ? '-still' : '');
  return m;
}
// ชุดของคนในเมืองแต่ละแห่ง (นอกพิธี)
export function cityLooks(site) {
  const sk = SK, W = '#F4F3EE';
  const men = [
    { skin: sk[1], hair: '#2b1d14', beard: 'short', cloth: W, ghutra: '#f4f2ec' },
    { skin: sk[2], hair: '#1a1410', beard: 'full', cloth: W, ghutra: '#b8434a' },
    { skin: sk[3], hair: '#1a1410', beard: 'short', cloth: '#e9e4d6', cap: true },
    { skin: sk[0], hair: '#3a2416', beard: 'none', cloth: '#d9d2c3', cap: true, capColor: '#ffffff' },
    { skin: sk[4], hair: '#151210', beard: 'full', beardColor: '#d8d4cc', cloth: W, cap: true }
  ];
  const women = [{ dress: '#17171b', khimar: '#17171b' }, { dress: '#1d1d22', khimar: '#1d1d22' }, { dress: '#f1efe9', khimar: '#f1efe9' }, { dress: '#3d4a5e', khimar: '#e8e2d6' }];
  if (site === 'aqsa') {
    men.splice(3, 2, { skin: sk[1], hair: '#2b1d14', beard: 'short', style: 'shirt', shirt: '#e8e6e0', pants: '#2f3440' }, { skin: sk[2], hair: '#1d1612', beard: 'none', style: 'shirt', shirt: '#5c6f86', pants: '#3a3632' }, { skin: sk[1], hair: '#1d1612', beard: 'full', style: 'shirt', shirt: '#2c3e2f', pants: '#24262b' });
    women.splice(2, 2, { dress: '#4a3b5c', khimar: '#e9d8c2' }, { dress: '#2c4a3f', khimar: '#f0eadf' }, { dress: '#6b2f35', khimar: '#1f1f24' });
  }
  if (site === 'makkah') men.push({ skin: sk[2], hair: '#2b1d14', beard: 'full', ihram: true }, { skin: sk[3], hair: '#1a1410', beard: 'short', ihram: true }, { skin: sk[1], hair: '#2b1d14', beard: 'none', ihram: true });
  return [
    ...men.map(x => ({ ...x, g: 'm', hairStyle: 'short' })),
    ...women.map((x, i) => ({ ...x, g: 'f', skin: sk[i % 5] })),
    { g: 'm', kid: true, skin: sk[2], hair: '#2b1d14', hairStyle: 'short', beard: 'none', cloth: W, cap: true }
  ];
}

// แบบตัวละครของฝูงชน (สีผิว ทรงผม เครา หลากหลายแบบภาพตัวอย่าง)
const SK = ['#F1C9A5', '#E0AC82', '#C68B5E', '#9A6440', '#6B4429'];
export function crowdLooks(idtiba) {
  const men = [
    { skin: SK[1], hair: '#2b1d14', hairStyle: 'short', beard: 'short' },
    { skin: SK[3], hair: '#1a1410', hairStyle: 'curly', beard: 'none' },
    { skin: SK[0], hair: '#e2b24a', hairStyle: 'short', beard: 'full', beardColor: '#d9a43c' },
    { skin: SK[4], hair: '#cfcac2', hairStyle: 'bald', beard: 'full', beardColor: '#e8e6e0' },
    { skin: SK[2], hair: '#4a2d1c', hairStyle: 'short', beard: 'full' },
    { skin: SK[0], hair: '#c9844a', hairStyle: 'bald', beard: 'short', beardColor: '#c9844a' }
  ].map(x => ({ ...x, g: 'm', ihram: true, idtiba }));
  const women = [
    { skin: SK[1] }, { skin: SK[3] }, { skin: SK[0] }, { skin: SK[2], dress: '#1d1d22', khimar: '#1d1d22' }, { skin: SK[4], dress: '#d9cdb8', khimar: '#efe9de' }
  ].map(x => ({ ...x, g: 'f' }));
  const kids = [{ g: 'm', kid: true, ihram: true, idtiba, skin: SK[2], hair: '#2b1d14', hairStyle: 'short', beard: 'none' }, { g: 'f', kid: true, skin: SK[0] }];
  return { men, women, kids };
}
