// ไอคอนเส้นแบบโมเดิร์น (24x24, ใช้สีจาก currentColor)
const P = {
  user: '<circle cx="12" cy="8" r="3.6"/><path d="M4.5 20c.9-3.8 4-5.8 7.5-5.8s6.6 2 7.5 5.8"/>',
  userPlus: '<circle cx="10" cy="8" r="3.6"/><path d="M3 20c.9-3.8 3.8-5.8 7-5.8 1.5 0 2.9.4 4 1.2"/><path d="M18 14v6M15 17h6"/>',
  checklist: '<rect x="5" y="4" width="14" height="17" rx="3"/><path d="M9 4.5V3h6v1.5"/><path d="m8.5 10.5 1.5 1.5 3-3M8.5 16.5l1.5 1.5 3-3M15.5 11h.01M15.5 17h.01"/>',
  plane: '<path d="M10.5 13.5 3 11l1.5-1.5 7.5 1L16.5 6a2 2 0 0 1 3 3L15 13.5l1 7.5-1.5 1.5-2.5-7.5"/><path d="m7 16-2.5 2.5M8 17l-1 3"/>',
  pin: '<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0C18.5 15.4 12 21 12 21Z"/><circle cx="12" cy="10" r="2.4"/>',
  tawaf: '<rect x="9" y="9" width="6" height="6" rx="1"/><path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3"/><path d="M17.5 3.5v3.4h-3.4"/>',
  drop: '<path d="M12 3.5s6 6.4 6 10.6a6 6 0 0 1-12 0C6 9.9 12 3.5 12 3.5Z"/><path d="M9.5 14.5a2.6 2.6 0 0 0 2.5 2.5"/>',
  sai: '<circle cx="5" cy="12" r="2"/><circle cx="19" cy="12" r="2"/><path d="M8.5 9.5h7l-2-2M15.5 14.5h-7l2 2"/>',
  scissors: '<circle cx="6.5" cy="7" r="2.5"/><circle cx="6.5" cy="17" r="2.5"/><path d="M8.6 8.4 20 17M8.6 15.6 20 7"/>',
  home: '<path d="M4 11.5 12 5l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5h-3.5v-5h-6v5H5.5A1.5 1.5 0 0 1 4 19Z"/>',
  sun: '<circle cx="12" cy="12" r="3.8"/><path d="M12 3v1.8M12 19.2V21M3 12h1.8M19.2 12H21M5.6 5.6l1.3 1.3M17.1 17.1l1.3 1.3M5.6 18.4l1.3-1.3M17.1 6.9l1.3-1.3"/>',
  moon: '<path d="M19.5 14.5A7.5 7.5 0 0 1 9.5 4.5a7.5 7.5 0 1 0 10 10Z"/>',
  map: '<path d="m9 5-5 2v13l5-2 6 2 5-2V5l-5 2-6-2Z"/><path d="M9 5v13M15 7v13"/>',
  nav: '<path d="m12 3 7 17-7-4-7 4 7-17Z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  play: '<path d="M8 5.5v13l10.5-6.5L8 5.5Z" fill="currentColor"/>',
  arrowR: '<path d="M5 12h13M13 6l6 6-6 6"/>',
  globe: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.5 2.6 3.6 5.4 3.6 8.5s-1.1 5.9-3.6 8.5c-2.5-2.6-3.6-5.4-3.6-8.5S9.5 6.1 12 3.5Z"/>',
  mosque: '<path d="M6 20v-6.5a6 6 0 0 1 12 0V20M3.5 20h17M12 4v3.5M10.8 4.6a1.6 1.6 0 1 0 2.4-1.4"/><path d="M10 20v-3a2 2 0 0 1 4 0v3"/>',
  dome: '<path d="M4 20h16M6 20v-5h12v5M7 15a5 5 0 0 1 10 0M12 7V4.5"/><circle cx="12" cy="4" r=".6"/>',
  book: '<path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5Z"/><path d="M5 19.5A1.5 1.5 0 0 0 6.5 21H19v-3"/><path d="M9 7.5h6M9 11h4"/>',
  chart: '<path d="M5 20V10M10 20V5M15 20v-8M20 20v-5"/>',
  stats: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3.5 2"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2.5"/><path d="M16 8V5.5A1.5 1.5 0 0 0 14.5 4h-9A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8"/>',
  refresh: '<path d="M19.5 12A7.5 7.5 0 1 1 17.3 6.7"/><path d="M19.5 4v4h-4"/>',
  face: '<circle cx="12" cy="12" r="8.5"/><path d="M9 10h.01M15 10h.01M8.8 14.5a4 4 0 0 0 6.4 0"/>',
  walk: '<circle cx="13" cy="4.5" r="1.8"/><path d="m9 21 3-6.5 2.5 2V21M7.5 12.5 10 8.5l4 1 2.5 3M12 14.5l-1-4"/>',
  run: '<circle cx="15" cy="4.5" r="1.8"/><path d="m5 20 4-1.5 2-3.5 3 2.5V21M7 11l3-3.5 4.5.5 2 3.5 3 1M11 15l2.5-5"/>',
  stand: '<circle cx="12" cy="4.5" r="1.8"/><path d="M12 8v7M8 11.5h8M10 21l2-6 2 6"/>',
  rotate: '<path d="M4.5 12a7.5 7.5 0 0 1 13-5.1M19.5 12a7.5 7.5 0 0 1-13 5.1"/><path d="M17.5 3.5v3.4h-3.4M6.5 20.5v-3.4h3.4"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 8h.01"/>',
  star: '<path d="m12 4 2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 16.4l-4.8 2.5.9-5.4-3.9-3.8 5.4-.8Z"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff: '<path d="M4 4l16 16M9.9 5.8A9.6 9.6 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-2.9 3.7M6.2 7.4C3.9 9.2 2.5 12 2.5 12s3.5 6.5 9.5 6.5c1.5 0 2.9-.4 4.1-1"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
  expand: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
  shrink: '<path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/>',
  grid: '<rect x="4" y="4" width="7" height="7" rx="2"/><rect x="13" y="4" width="7" height="7" rx="2"/><rect x="4" y="13" width="7" height="7" rx="2"/><rect x="13" y="13" width="7" height="7" rx="2"/>'
};
export function icon(name, cls = '') {
  return `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || ''}</svg>`;
}
export const STEP_ICONS = ['userPlus', 'checklist', 'plane', 'pin', 'tawaf', 'drop', 'sai', 'scissors', 'home'];

// โลโก้ labbaik-loop: กะอ์บะฮ์ทรงลูกบาศก์ + แถบผ้าคลุม 2 เส้น + ประตูรูปตัว T (ตรงกับ assets/brand/symbol.svg)
const MARK = (ink, cut) => `<path d="M50 4 90 24v52L50 96 10 76V24Z" fill="${ink}"/>
  <path d="M10 33 50 53 90 33v7L50 60 10 40ZM10 45 50 65 90 45v3.5L50 68.5 10 48.5ZM71 58 79 54v22.5L71 80.5Z" fill="${cut}"/>`;
// ไอคอนแอป: สัญลักษณ์สีดำบนพื้นครีม
export const LOGO = `<svg viewBox="0 0 100 100" aria-hidden="true"><rect width="100" height="100" rx="23" fill="#F8F6EF"/><g transform="translate(18 18) scale(.64)">${MARK('#111111', '#F8F6EF')}</g></svg>`;
// อวาตาร์โซเชียล: สัญลักษณ์เส้นสีครีมบนพื้นเขียวมะกอก
export const LOGO_OLIVE = `<svg viewBox="0 0 100 100" aria-hidden="true"><rect width="100" height="100" rx="23" fill="#3F5D46"/><g transform="translate(18 18) scale(.64)"><path d="M50 7 87 25.5v49L50 93 13 74.5v-49Z" fill="none" stroke="#F8F6EF" stroke-width="5" stroke-linejoin="round"/>
  <path d="M10 33 50 53 90 33v7L50 60 10 40ZM10 45 50 65 90 45v3.5L50 68.5 10 48.5ZM71 58 79 54v22.5L71 80.5Z" fill="#F8F6EF"/></g></svg>`;
// ภาพย่อสถานที่ (ใช้ในการ์ดสำรวจ)
export const PLACE_ART = {
  makkah: `<svg viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="32" fill="#1b2a26"/><path d="M8 46h48" stroke="#5FE0B0" stroke-width="1.5" opacity=".5"/><path d="M26 30 32 27l6 3v11l-6 3-6-3Z" fill="#0b0b0d" stroke="#F0C66E" stroke-width="1"/><path d="M26 33l6 3 6-3" stroke="#F0C66E" stroke-width="1.6" fill="none"/><path d="M14 46V24M50 46V24" stroke="#e8ece9" stroke-width="2.2" stroke-linecap="round"/><circle cx="14" cy="22" r="1.4" fill="#F0C66E"/><circle cx="50" cy="22" r="1.4" fill="#F0C66E"/></svg>`,
  madinah: `<svg viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="32" fill="#16261f"/><path d="M8 46h48" stroke="#5FE0B0" stroke-width="1.5" opacity=".5"/><path d="M20 46V36h24v10" fill="#e8ece9"/><path d="M22 36a10 10 0 0 1 20 0Z" fill="#2fa36b"/><path d="M32 26v-4" stroke="#F0C66E" stroke-width="1.6" stroke-linecap="round"/><path d="M13 46V22M51 46V22" stroke="#e8ece9" stroke-width="2.2" stroke-linecap="round"/></svg>`,
  aqsa: `<svg viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="32" fill="#1d2433"/><path d="M8 46h48" stroke="#5FE0B0" stroke-width="1.5" opacity=".5"/><path d="M18 46V36l4-3h20l4 3v10Z" fill="#5b8ad6"/><path d="M22 33a10 10 0 0 1 20 0Z" fill="#F0C66E"/><path d="M32 23v-3" stroke="#F0C66E" stroke-width="1.6" stroke-linecap="round"/></svg>`
};
