// ===== ตั้งค่าโปรเจกต์ (แก้เฉพาะไฟล์นี้) =====
export const CONFIG = {
  // แหล่งแผนที่ 3 มิติจริงของเมือง:
  //   'google' = Google Photorealistic 3D Tiles (ต้องมี Map Tiles API key)
  //   'cesium' = ผ่าน Cesium ion (ต้องมี access token, asset 2275207 คือชุดข้อมูลเดียวกันของ Google)
  //   'none'   = ใช้ฉากจำลองที่สร้างจากโค้ด
  mapProvider: 'google',

  // วางคีย์ตรงนี้ (อย่าแชร์ไฟล์นี้ต่อสาธารณะ และควรจำกัดคีย์ให้ใช้ได้เฉพาะโดเมนของคุณ)
  googleApiKey: '',
  cesiumIonToken: '',
  cesiumAssetId: '2275207',

  // ระดับรายละเอียดของแผนที่: ตัวเลขยิ่งน้อยยิ่งคมชัด แต่โหลดข้อมูลมากขึ้นและเสียค่าใช้จ่ายมากขึ้น (แนะนำ 8–20)
  tileDetail: 12,

  // ถ้าแผนที่หมุนไม่ตรงกับทิศ (เช่น กะอ์บะฮ์ไม่อยู่กลางลาน) ปรับมุมตรงนี้ เป็นองศา
  mapRotationDeg: 0,

  // ไฟล์รายการโมเดลตัวละคร ดูวิธีใช้ใน assets/characters/README.md
  characterManifest: './assets/characters/manifest.json'
};
