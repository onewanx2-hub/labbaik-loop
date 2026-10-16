// ส่วนควบคุมหน้าจอ: แถบ 9 ขั้นตอน แผงซ้าย/ขวา และ HUD ตอนเดินในโลก 3 มิติ
import { CONFIG } from '../config.js';
import { STEPS, DUA, PREP, MIQAT_STEPS, QUIZ, SITES, SKINS, CLOTH, CLOTH_NAMES, POLY, ROADS, SAFA, MASA } from './data.js';
import { loadManifest, hasModels } from './character.js';
import * as W from './world.js';
import { icon, STEP_ICONS, LOGO, LOGO_OLIVE, PLACE_ART } from './icons.js';

const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const STORE = 'umrah-path-v1';

/* ================= state ================= */
const fresh = () => ({
  step: 0, profile: { name: 'อับดุลลอฮ์', gender: 'm', trip: 'umrah', outfit: 'auto', group: 'solo', beard: true, cloth: 0, skin: 1 },
  prep: {}, route: 'jed', landed: false, miqat: { steps: {}, talbiyah: 0, quiz: {} },
  tawaf: { started: false, acc: 0, rounds: 0, bad: false, istLap: -1, last: null }, salah: { prayed: false, sips: 0 },
  sai: { started: false, laps: 0, heading: 1 }, tahallul: { done: false, method: '' }, istilam: 0, walked: 0, done: {}
});
function load() {
  const d = fresh();
  try { const raw = JSON.parse(localStorage.getItem(STORE) || 'null'); if (raw) for (const k of Object.keys(d)) if (raw[k] !== undefined) d[k] = (d[k] && typeof d[k] === 'object' && !Array.isArray(d[k])) ? Object.assign(d[k], raw[k]) : raw[k]; } catch (e) { }
  d.tawaf.last = null; return d;
}
const S = load();
if (/[?&]debug/.test(location.search)) window.__S = S;
let saveT = 0;
function save() { clearTimeout(saveT); saveT = setTimeout(() => { try { localStorage.setItem(STORE, JSON.stringify(S)); } catch (e) { } }, 300); }
const male = () => S.profile.gender === 'm';
const stepId = (i = S.step) => STEPS[i].id;
function isDone(i) {
  switch (STEPS[i].id) {
    case 'create': return !!S.done.create;
    case 'prep': return PREP(S.profile.gender).every(g => g.items.every(([id]) => S.prep[id]));
    case 'depart': return S.landed;
    case 'miqat': return MIQAT_STEPS('m').every((_, k) => S.miqat.steps[k]) && S.miqat.talbiyah > 0;
    case 'tawaf': return S.tawaf.rounds >= 7;
    case 'salah': return S.salah.prayed && S.salah.sips >= 3;
    case 'sai': return S.sai.laps >= 7;
    case 'tahallul': return S.tahallul.done;
    case 'return': return !!S.done.return;
  }
}
function inIhram(i = S.step) {
  const o = S.profile.outfit, id = STEPS[i].id;
  if (o === 'ihram') return true; if (o === 'travel') return false;
  if (id === 'miqat') return !!S.miqat.steps[3];
  if (['tawaf', 'salah', 'sai'].includes(id)) return true;
  if (id === 'tahallul') return !S.tahallul.done;
  return false;
}
function look() {
  const p = S.profile, ih = inIhram();
  return { gender: p.gender, skin: SKINS[p.skin], cloth: CLOTH[p.cloth], clothIndex: p.cloth, ihram: ih, idtiba: male() && ih && stepId() === 'tawaf' && S.tawaf.rounds < 7, beard: male() && p.beard, hair: S.tahallul.done && S.tahallul.method === 'halq' ? 'halq' : '', cap: undefined };
}
const applyLook = () => W.setLook(look(), S.profile.group);

/* ================= แถบไอคอนขั้นตอน ================= */
function renderStepper() {
  const el = $('#stepper');
  el.innerHTML = STEPS.map((s, i) => {
    const cur = i === S.step && !explore, done = isDone(i);
    return `<button class="railbtn ${cur ? 'is-cur' : ''} ${done ? 'is-done' : ''}" data-act="go" data-i="${i}" data-tip="${i + 1} · ${s.th}" aria-label="ขั้นที่ ${i + 1} ${s.th}${done ? ' (เสร็จแล้ว)' : ''}" ${cur ? 'aria-current="step"' : ''}>${icon(STEP_ICONS[i])}</button>`;
  }).join('');
  const c = el.querySelector('.is-cur'); if (c && el.parentElement.scrollWidth > el.parentElement.clientWidth) el.parentElement.scrollLeft = c.offsetLeft - 40;
  updatePresence();
}
function initialOf(name) { const n = (name || 'ผ').replace(/^[เแโใไ\s]+/, ''); return n.charAt(0) || 'ผ'; }
let presenceExtra = '';
function updatePresence() {
  const st = STEPS[S.step], world = explore || st.view === 'world';
  $('#pres-title').innerHTML = explore ? `${SITES[explore.site].th} <i>•</i> โหมดสำรวจ` : world ? `มักกะฮ์ <i>•</i> ${st.th}` : `สตูดิโอ <i>•</i> ${st.th}`;
  $('#pres-sub').textContent = presenceExtra || `ขั้นที่ ${S.step + 1} จาก ${STEPS.length} · เสร็จแล้ว ${STEPS.filter((_, i) => isDone(i)).length} ขั้น`;
  $('#avatar-initial').textContent = initialOf(S.profile.name);
}

/* ================= views ================= */
let explore = null; // {site}
function go(i) {
  explore = null;
  S.step = Math.max(0, Math.min(STEPS.length - 1, i));
  if (stepId() === 'return') S.done.return = true;
  save(); render();
}
function render() {
  const st = STEPS[S.step], view = explore ? 'world' : st.view;
  $('#app').dataset.view = view;
  presenceExtra = '';
  renderStepper();
  applyLook();
  $('#studio-ui').hidden = view === 'world';
  $('#hud').hidden = view !== 'world';
  // ปุ่มนำทางอัตโนมัติใช้ได้เฉพาะขั้นตอนพิธีในมักกะฮ์ (โหมดสำรวจยังไม่รองรับ)
  document.querySelectorAll('[data-act="auto"]').forEach(b => { b.hidden = !!explore; });
  if (view === 'world') {
    if (explore) W.enterWorld('explore', { site: explore.site, place: explore.place });
    else W.enterWorld(st.id);
    renderQuest();
  } else { W.setView('studio'); W.studioSet({ anim: 'idle' }); }
  renderLeft(); renderRight(); renderCards();
  if (view === 'route') renderRoute();
  requestAnimationFrame(layoutStudio);
}
// วางตัวละครให้อยู่กลางพื้นที่ว่างระหว่างหัวข้อใหญ่กับแผงด้านขวา
function layoutStudio() {
  const stage = $('#center').getBoundingClientRect(), hero = $('#left').getBoundingClientRect(), panel = $('#right').getBoundingClientRect();
  if ($('#app').classList.contains('ui-hidden')) { W.setStudioFocus(.5, .5); return; }
  if ((window.innerWidth <= 860 && window.innerHeight > window.innerWidth) || !hero.width) { W.setStudioFocus(.5, .6); return; }
  const left = Math.min(hero.right, hero.left + 470), right = panel.width ? panel.left : stage.right;
  W.setStudioFocus(clampN(((left + right) / 2 - stage.left) / stage.width, .35, .75));
}
const clampN = (v, a, b) => Math.max(a, Math.min(b, v));
window.addEventListener('resize', () => requestAnimationFrame(layoutStudio));

/* ================= หัวข้อใหญ่ ================= */
const duaHTML = k => { const d = DUA[k]; return `<div class="dua"><p class="dua-cap">${d.cap}</p><p class="ar" lang="ar">${d.ar}</p><p class="dua-tr">${d.tr}</p><p class="dua-mean">${d.mean}</p></div>`; };
const NOTE = `<p class="note">${icon('info')}<span>เว็บนี้เป็นการจำลองเพื่อการเรียนรู้ รายละเอียดทางศาสนบัญญัติอาจต่างกันตามมัซฮับ โปรดศึกษาเพิ่มเติมกับผู้รู้ · <span lang="ar">هذه المحاكاة لأغراض تعليمية فقط</span></span></p>`;
function renderLeft() {
  const st = STEPS[S.step], el = $('#left');
  if (st.view === 'world' || explore) { el.innerHTML = ''; return; }
  const next = STEPS[S.step + 1];
  let title = st.th, eyebrow = `ขั้นที่ ${S.step + 1} จาก ${STEPS.length}`, intro = st.intro || '', cta = '';
  if (st.id === 'create') {
    eyebrow = 'จำลองการทำอุมเราะห์แบบโต้ตอบ';
    title = `เส้นทาง<span class="of">สู่</span><br>อุมเราะห์`;
    intro = 'เรียนรู้พิธีอุมเราะห์ทีละขั้น ตั้งแต่เตรียมตัวที่บ้านจนถึงตะฮัลลุล แล้วเดินจริงในนครมักกะฮ์ 3 มิติ';
    cta = `<button class="pill-cta" data-act="start"><span class="pc-ic">${icon('play')}</span>เริ่มการเดินทาง</button>`;
  } else if (st.id === 'return') {
    cta = `<button class="pill-cta" data-act="explore" data-site="makkah"><span class="pc-ic">${icon('globe')}</span>สำรวจมักกะฮ์</button>`;
  } else if (next) {
    cta = `<button class="pill-cta" data-act="next"><span class="pc-ic">${icon('play')}</span>ไปขั้นต่อไป · ${next.th}</button>`;
  }
  const done = isDone(S.step) && st.id !== 'create' ? `<span class="pill on">${icon('check')} ขั้นนี้เสร็จแล้ว</span>` : '';
  el.innerHTML = `<p class="eyebrow">${eyebrow}</p>
    <h1>${title}</h1>
    <p class="ar" lang="ar">${st.id === 'create' ? 'ابدأ رحلتك المباركة' : st.ar}</p>
    ${intro ? `<p class="intro">${intro}</p>` : ''}
    <div class="row">${cta}${done}</div>
    ${NOTE}`;
}

/* ================= การ์ดแถวล่าง ================= */
function cardBox(label, inner, btn) { return `<div class="cardx"><p class="cardx-label">${label}</p><div class="cardx-box"><div class="cardx-main">${inner}</div>${btn || ''}</div></div>`; }
function progressCard() {
  const doneN = STEPS.filter((_, i) => isDone(i)).length, pct = Math.round(doneN / STEPS.length * 100);
  const bars = STEPS.map((s, i) => { const h = isDone(i) ? 100 : i === S.step ? 55 : 12; return `<span class="${i === S.step ? 'cur' : ''}" title="${s.th}"><i style="--h:${h}%"></i>${i + 1}</span>`; }).join('');
  const firstOpen = STEPS.findIndex((_, i) => !isDone(i));
  return cardBox('ความคืบหน้า', `<div class="prog"><div class="prog-av" style="--p:${pct}%"><span>${pct}%</span></div><div class="bars">${bars}</div></div>`,
    `<button class="cardx-btn" data-act="go" data-i="${firstOpen < 0 ? STEPS.length - 1 : firstOpen}">${icon('arrowR')} ไปขั้นที่ยังไม่เสร็จ</button>`);
}
function statsCard() {
  return cardBox('สถิติของคุณ', `<div class="tiles">
      <div class="tile"><b>${S.tawaf.rounds}/7 ${icon('tawaf')}</b><small>รอบฏอวาฟ</small></div>
      <div class="tile"><b>${S.sai.laps}/7 ${icon('sai')}</b><small>เที่ยวสะแอ</small></div>
      <div class="tile"><b>${(S.walked / 1000).toFixed(2)} ${icon('walk')}</b><small>กม. ที่เดิน</small></div>
      <div class="tile"><b>${S.miqat.talbiyah} ${icon('star')}</b><small>ตัลบียะฮ์</small></div></div>`,
    `<button class="cardx-btn" data-act="go" data-i="${STEPS.length - 1}">${icon('book')} ดูใบบันทึก</button>`);
}
function exploreCard() {
  const site = (id, t) => `<button data-act="explore" data-site="${id}" aria-label="สำรวจ${t}">${PLACE_ART[id]}<small>${t}</small></button>`;
  return cardBox('สำรวจเมือง', `<div class="places">${site('makkah', 'มักกะฮ์')}${site('madinah', 'มะดีนะฮ์')}${site('aqsa', 'อัลอักศอ')}</div>`,
    `<button class="cardx-btn" data-act="explore" data-site="makkah">${icon('globe')} เดินเที่ยวมักกะฮ์</button>`);
}
function renderCards() {
  const st = STEPS[S.step], el = $('#cards');
  if (st.view === 'world' || explore) { el.innerHTML = ''; return; }
  const how = st.how ? cardBox('ทำอย่างไร', `<ol class="how">${st.how.map(x => `<li><span>${x}</span></li>`).join('')}</ol>`) : '';
  const duas = (st.duas || []).map(k => cardBox('ดุอาอ์', duaHTML(k)));
  let cards;
  if (st.id === 'create') cards = [progressCard(), statsCard(), exploreCard()];
  else if (st.id === 'depart') cards = [`<div class="cardx wide"><p class="cardx-label">เส้นทางบิน · ${S.route === 'jed' ? 'กรุงเทพฯ → เจดดะฮ์' : 'กรุงเทพฯ → มะดีนะฮ์'}</p><div class="cardx-box route" id="route"></div></div>`];
  else if (st.id === 'return') cards = [how, duas[0] || statsCard(), exploreCard()];
  else cards = [how, duas[0] || progressCard(), duas[1] || progressCard()];
  el.innerHTML = cards.filter(Boolean).join('');
}
/* ================= right panel ================= */
const seg = (k, v, cur, label, sub = '', ar = '', dis = false) => `<button class="opt" data-act="set" data-k="${k}" data-v="${v}" aria-pressed="${String(cur) === String(v)}" ${dis ? 'disabled' : ''}>${ar ? `<i lang="ar">${ar}</i>` : ''}<span>${label}</span>${sub ? `<small>${sub}</small>` : ''}</button>`;
const field = (label, ar, inner) => `<div class="field"><div class="lbl"><span>${label}</span>${ar ? `<i lang="ar">${ar}</i>` : ''}</div>${inner}</div>`;
function foot(i = S.step) {
  if (i >= STEPS.length - 1) return '';
  return `<div class="foot">${isDone(i) ? '<p class="ok">✓ ขั้นนี้เสร็จแล้ว</p>' : ''}<button class="cta" data-act="next"><i lang="ar">التالي</i><span>ไปขั้นต่อไป · ${STEPS[i + 1].th} →</span></button></div>`;
}
function renderRight() {
  const p = S.profile, id = stepId(), el = $('#right');
  let h = '';
  if (id === 'create') {
    h = `<div class="card creator">
      <div class="cr-head"><div><p class="kufi xs" lang="ar">أنشئ حاجك</p><h2>สร้างตัวละครผู้แสวงบุญ</h2></div><span class="cr-badge" aria-hidden="true">${LOGO_OLIVE}</span></div>
      ${field('ชื่อผู้แสวงบุญ', 'الاسم', `<input class="input" id="f-name" maxlength="30" value="${esc(p.name)}" autocomplete="off">`)}
      ${field('เพศ', 'الجنس', `<div class="seg">${seg('gender', 'm', p.gender, 'ชาย', '', 'ذكر')}${seg('gender', 'f', p.gender, 'หญิง', '', 'أنثى')}</div>`)}
      ${field('การแต่งกาย', 'الزي', `<div class="seg c3">${seg('outfit', 'travel', p.outfit, 'ชุดเดินทาง', '', 'سفر')}${seg('outfit', 'ihram', p.outfit, 'ผ้าอิห์รอม 2 ผืน', '', 'إحرام')}${seg('outfit', 'auto', p.outfit, 'อัตโนมัติตามขั้น', '', 'تلقائي')}</div>`)}
      ${field('คณะเดินทาง', 'العائلة', `<div class="seg c3">${seg('group', 'solo', p.group, 'คนเดียว')}${seg('group', 'pair', p.group, 'กับคู่สมรส')}${seg('group', 'family', p.group, 'ครอบครัว')}</div>`)}
      ${male() ? field('เครา', 'اللحية', `<div class="seg">${seg('beard', 'true', p.beard, 'ไว้เคราสั้น', '', 'لحية قصيرة')}${seg('beard', 'false', p.beard, 'โกนเกลี้ยง', '', 'حليق')}</div>`) : ''}
      ${field(`สีชุด · ${CLOTH_NAMES[p.cloth]}`, 'الملابس', `<div class="sws">${CLOTH.map((c, k) => `<button class="sw" style="--c:${c}" data-act="set" data-k="cloth" data-v="${k}" aria-pressed="${p.cloth === k}" aria-label="สีชุด${CLOTH_NAMES[k]}"></button>`).join('')}</div>`)}
      ${field('สีผิว', 'لون البشرة', `<div class="sws">${SKINS.map((c, k) => `<button class="sw" style="--c:${c}" data-act="set" data-k="skin" data-v="${k}" aria-pressed="${p.skin === k}" aria-label="สีผิวระดับ ${k + 1}"></button>`).join('')}</div>`)}
      <div class="foot sticky"><button class="cta" data-act="start"><i lang="ar">ابدأ الرحلة</i><span>เริ่มการเดินทาง →</span></button></div>
    </div>`;
  } else if (id === 'prep') {
    const gs = PREP(p.gender), tot = gs.reduce((a, g) => a + g.items.length, 0), got = gs.reduce((a, g) => a + g.items.filter(([k]) => S.prep[k]).length, 0);
    h = `<div class="card"><p class="eyebrow">รายการเตรียมตัว</p><h2>จัดกระเป๋าและหัวใจ</h2>
      <div class="bar"><i style="width:${got / tot * 100}%"></i></div><p class="muted" id="prep-n">${got} / ${tot} รายการ</p>
      <div class="checks">${gs.map(g => `<h4>${g.h}</h4>` + g.items.map(([k, t]) => `<label class="check"><input type="checkbox" data-prep="${k}" ${S.prep[k] ? 'checked' : ''}><span>${t}</span></label>`).join('')).join('')}</div>${foot()}</div>`;
  } else if (id === 'depart') {
    const info = S.route === 'jed'
      ? [['เวลาบิน', 'บินตรงราว 9 ชั่วโมง'], ['ครองอิห์รอม', 'บนเครื่อง ก่อนผ่านเขตมีกอต ลูกเรือหรือหัวหน้าคณะจะแจ้งล่วงหน้า'], ['จากสนามบิน', 'เดินทางต่อไปมักกะฮ์ราว 80 กม.']]
      : [['เวลาบิน', 'ส่วนใหญ่ต่อเครื่อง 1 จุด'], ['ครองอิห์รอม', 'ที่มีกอตซุลฮุลัยฟะฮ์ (บิอ์รอาลี) ตอนออกจากมะดีนะฮ์'], ['ระยะทาง', 'มะดีนะฮ์ไปมักกะฮ์ราว 450 กม.']];
    h = `<div class="card"><p class="eyebrow">เลือกเส้นทาง</p><h2>บินจากกรุงเทพฯ</h2>
      <div class="seg c1">${seg('route', 'jed', S.route, 'กรุงเทพฯ → เจดดะฮ์', 'ไปมักกะฮ์ก่อน ทำอุมเราะห์ทันที')}${seg('route', 'med', S.route, 'กรุงเทพฯ → มะดีนะฮ์', 'เยือนมะดีนะฮ์ก่อน แล้วไปมักกะฮ์')}</div>
      <dl class="kv">${info.map(([a, b]) => `<dt>${a}</dt><dd>${b}</dd>`).join('')}</dl>
      <button class="cta alt" data-act="fly">${icon('plane')}<span>${S.landed ? 'บินอีกครั้ง' : 'ขึ้นเครื่อง'}</span></button>
      ${S.landed ? '<p class="ok">✓ ถึงที่หมายแล้ว อัลฮัมดุลิลลาฮ์</p>' : ''}${foot()}</div>`;
  } else if (id === 'miqat') {
    const ms = MIQAT_STEPS(p.gender), ans = Object.keys(S.miqat.quiz).length, right = QUIZ.filter((q, k) => S.miqat.quiz[k] === q.a).length;
    h = `<div class="card"><p class="eyebrow">${S.route === 'jed' ? 'บนเครื่องบิน ก่อนถึงเขตมีกอต' : 'มีกอตซุลฮุลัยฟะฮ์ (บิอ์รอาลี)'}</p><h2>ครองอิห์รอมตามลำดับ</h2>
      <div class="checks">${ms.map((t, k) => `<label class="check"><input type="checkbox" data-mq="${k}" ${S.miqat.steps[k] ? 'checked' : ''}><span class="num">${k + 1}</span><span>${t}</span></label>`).join('')}</div>
      <button class="cta alt" data-act="talbiyah"><i lang="ar">لبيك اللهم لبيك</i><span>กล่าวตัลบียะฮ์ · <b id="tal-n">${S.miqat.talbiyah}</b> ครั้ง</span></button>
      <h4 class="qh">ทดสอบ: ทำได้หรือห้ามระหว่างอิห์รอม? <span class="muted">${right}/${ans} ถูก</span></h4>
      <div class="quiz">${QUIZ.map((q, k) => { const a = S.miqat.quiz[k], st = a === undefined ? '' : a === q.a ? 'right' : 'wrong';
        return `<div class="q ${st}"><span>${q.t}</span><span class="ab"><button class="${a === true ? 'pick' : ''}" data-act="quiz" data-q="${k}" data-a="1">ทำได้</button><button class="${a === false ? 'pick' : ''}" data-act="quiz" data-q="${k}" data-a="0">ห้าม</button></span>${a !== undefined ? `<span class="why">${a === q.a ? 'ถูกต้อง · ' : 'ยังไม่ถูก · '}${q.why}</span>` : ''}</div>`; }).join('')}</div>${foot()}</div>`;
  } else if (id === 'return') {
    h = `<div class="card">${certHTML()}<div class="row"><button class="cta alt" data-act="copy">${icon('copy')}<span>คัดลอกข้อความสรุป</span></button><button class="btn" data-act="restart" id="restart">เริ่มใหม่ทั้งหมด</button></div></div>`;
  } else h = '';
  el.innerHTML = h;
}

/* ================= route (depart) ================= */
const ROUTES = { jed: 'M520 236 Q330 70 128 252', med: 'M520 236 Q340 40 150 132' };
function renderRoute() {
  const r = ROUTES[S.route];
  const miqat = S.route === 'jed'
    ? `<circle cx="168" cy="262" r="70" class="r-miqat"/><text x="168" y="180" text-anchor="middle" class="r-g">เขตมีกอต</text><text x="168" y="196" text-anchor="middle" class="r-m">ครองอิห์รอมบนเครื่องก่อนเข้าเขตนี้</text>`
    : `<path d="M150 132 Q190 200 168 262" class="r-road"/><path d="M152 150 l7 7 -7 7 -7 -7z" class="r-gf"/><text x="104" y="176" text-anchor="end" class="r-g">มีกอตซุลฮุลัยฟะฮ์</text><text x="104" y="192" text-anchor="end" class="r-m">(บิอ์รอาลี)</text>`;
  $('#route').innerHTML = `<svg viewBox="0 0 600 380" preserveAspectRatio="xMidYMid meet" role="img" aria-label="เส้นทางบิน">
    <defs><pattern id="dotp" width="14" height="14" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.1" class="r-dot"/></pattern></defs>
    <rect width="600" height="380" fill="url(#dotp)"/>
    <path d="M30 40 Q70 120 96 230 Q110 300 150 380 L112 380 Q80 300 70 240 Q50 140 0 60 L0 40Z" class="r-sea"/>
    <text x="54" y="330" class="r-m" transform="rotate(62 54 330)">ทะเลแดง</text>
    <text x="330" y="330" text-anchor="middle" class="r-m">มหาสมุทรอินเดีย</text>
    ${miqat}
    <path d="${r}" class="r-path"/><path id="route-path" d="${r}" class="r-done"/>
    <circle cx="520" cy="236" r="7" class="r-city"/><text x="520" y="266" text-anchor="middle" class="r-t">กรุงเทพฯ</text>
    <circle cx="128" cy="252" r="5" class="r-city"/><text x="122" y="276" text-anchor="end" class="r-t">เจดดะฮ์</text>
    <circle cx="168" cy="262" r="7" class="r-kaaba"/><text x="182" y="290" class="r-t">มักกะฮ์</text>
    <circle cx="150" cy="132" r="5" class="r-city"/><text x="162" y="120" class="r-t">มะดีนะฮ์</text>
    <g id="plane"><path d="M14 0 Q14 -2.6 8 -2.6 L-12 -2.2 L-14 0 L-12 2.2 L8 2.6 Q14 2.6 14 0Z M3 -2 L-5 -14 L-9 -14 L-4 -2Z M3 2 L-5 14 L-9 14 L-4 2Z M-9 -2 L-13 -7 L-15 -7 L-13 0 L-15 7 L-13 7 L-9 2Z" class="r-plane"/></g>
  </svg>
  <div class="clocks"><div><small>กรุงเทพฯ (UTC+7)</small><b id="clk-bkk">--:--</b></div><div><small>มักกะฮ์ (UTC+3)</small><b id="clk-mkk">--:--</b></div></div>`;
  updateClocks(); placePlane(S.landed ? 1 : 0);
}
function placePlane(t) {
  const path = $('#route-path'), plane = $('#plane'); if (!path || !plane) return;
  const L = path.getTotalLength(); path.style.strokeDasharray = L; path.style.strokeDashoffset = L * (1 - t);
  const a = path.getPointAtLength(Math.max(0, Math.min(L - 1, L * t - .5))), b = path.getPointAtLength(Math.min(L, Math.max(1, L * t + .5))), p = path.getPointAtLength(L * t);
  plane.setAttribute('transform', `translate(${p.x} ${p.y}) rotate(${Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI})`);
}
let flying = 0;
function fly() {
  if (flying) return; S.landed = false;
  const t0 = performance.now();
  const tick = now => { const t = Math.min(1, (now - t0) / 4200), e = t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; placePlane(e); if (t < 1) flying = requestAnimationFrame(tick); else { flying = 0; S.landed = true; save(); renderStepper(); renderRight(); renderLeft(); } };
  flying = requestAnimationFrame(tick);
}
function updateClocks() {
  const f = tz => new Intl.DateTimeFormat('th-TH', { hour: '2-digit', minute: '2-digit', timeZone: tz, hour12: false }).format(new Date());
  const a = $('#clk-bkk'), b = $('#clk-mkk'); if (a) a.textContent = f('Asia/Bangkok'); if (b) b.textContent = f('Asia/Riyadh');
}
setInterval(updateClocks, 20000);

/* ================= world HUD ================= */
const QUEST = {
  tawaf: { th: 'ฏอวาฟ 7 รอบ', d: () => 'เดินทวนเข็มนาฬิกา ให้กะอ์บะฮ์อยู่ซ้ายมือ เริ่มนับเมื่อผ่านแนวไฟเขียวที่ตรงกับฮะญัรุลอัสวัด (มุมทิศตะวันออก) ห้ามเดินผ่านในฮิจร์อิสมาอีล' + (male() ? ' ชายเปิดไหล่ขวา และวิ่งเหยาะ (Shift) ใน 3 รอบแรก' : ''), dua: ['istilam', 'rabbana'] },
  salah: { th: 'ละหมาด 2 ร็อกอะฮ์ และดื่มซัมซัม', d: () => S.salah.prayed ? 'เดินไปที่ถังน้ำซัมซัมสีเงินรอบขอบลาน หันไปทางกิบลัต กล่าวบิสมิลลาฮ์ แล้วกด E ดื่ม 3 อึก' : 'ไปด้านหลังมะกอมอิบรอฮีม (ตามลำแสง) แล้วกด E ละหมาดสุนัต 2 ร็อกอะฮ์' + (male() ? ' ไหล่ขวาของคุณถูกปิดกลับตามเดิมแล้ว' : ''), dua: ['maqam', 'zamzam'] },
  sai: { th: 'สะแอ 7 เที่ยว', d: () => 'เดินจากศ็อฟาไปมัรวะฮ์นับ 1 เที่ยว กลับมาศ็อฟานับ 2 จนครบ 7 แล้วจบที่มัรวะฮ์' + (male() ? ' ชายวิ่งเหยาะในช่วงไฟเขียว' : ''), dua: ['safa', 'tahlil'] },
  tahallul: { th: 'ตะฮัลลุล', d: () => male() ? 'ออกจากมัสยิดไปย่านร้านตัดผม แล้วกด E โกนศีรษะ หรือ R ตัดให้สั้น' : 'อยู่นอกตัวมัสยิด แล้วกด E รวบปลายผมและตัดประมาณหนึ่งข้อนิ้ว', dua: ['taqabbal'] }
};
let qMin = window.innerWidth < 700 || window.innerHeight < 560;
function renderQuest() {
  const el = $('#qcard');
  if (explore) {
    const site = SITES[explore.site];
    el.innerHTML = `<div class="q-top"><p class="eyebrow">โหมดสำรวจ</p><button class="mini" data-act="qmin">${qMin ? 'ขยาย' : 'ย่อ'}</button></div>
      <h2>สำรวจ${site.th}</h2><div class="q-body"><p>เดินได้อิสระ หรือกด M เปิดแผนที่เพื่อไปยังสถานที่สำคัญ</p>
      <div class="plist sm">${site.places.map(p => `<button data-act="travel" data-id="${p.id}"><b>${p.th}</b></button>`).join('')}</div>
      <button class="cta alt" data-act="leave-explore"><span>กลับสู่ขั้นตอนอุมเราะห์</span></button></div>`;
  } else {
    const id = stepId(), q = QUEST[id], done = isDone(S.step);
    let prog = '';
    if (id === 'tawaf') prog = dots(S.tawaf.rounds, S.tawaf.started, 'รอบ');
    if (id === 'sai') prog = dots(S.sai.laps, S.sai.started, 'เที่ยว');
    if (id === 'salah') prog = `<div class="q-meta"><span class="chip ${S.salah.prayed ? 'on' : ''}">${S.salah.prayed ? '✓ ' : ''}ละหมาด 2 ร็อกอะฮ์</span><span class="chip ${S.salah.sips >= 3 ? 'on' : ''}">ซัมซัม ${S.salah.sips}/3</span></div>`;
    el.innerHTML = `<div class="q-top"><p class="eyebrow">ขั้นที่ ${S.step + 1} · ${STEPS[S.step].th}</p><button class="mini" data-act="qmin">${qMin ? 'ขยาย' : 'ย่อ'}</button></div>
      <h2>${q.th}</h2><div class="q-body"><p>${q.d()}</p>${prog}<div class="q-meta" id="q-target"></div>
      <div class="q-meta"><span class="chip ${inIhram() ? 'on' : ''}">${inIhram() ? 'อยู่ในอิห์รอม' : 'ชุดปกติ'}</span></div>
      ${done ? `<button class="cta" data-act="next"><span>ไปขั้นต่อไป · ${STEPS[S.step + 1].th} →</span></button>` : ''}
      <details ${id === 'tawaf' || id === 'sai' ? 'open' : ''}><summary>ดุอาอ์ในขั้นนี้</summary>${q.dua.map(duaHTML).join('')}</details></div>`;
  }
  el.classList.toggle('is-min', qMin);
}
const dots = (n, started, unit) => `<div class="q-meta"><span>${unit} <b>${n}</b>/7</span><span class="dots">${[...Array(7)].map((_, k) => `<i class="${k < n ? 'done' : k === n && started ? 'cur' : ''}"></i>`).join('')}</span></div>`;
const toastEl = () => $('#toast');
function toast(t, ar, d, ms) { const el = toastEl(); el.innerHTML = `<b>${t}</b>${ar ? `<p class="ar" lang="ar">${ar}</p>` : ''}${d ? `<p>${d}</p>` : ''}`; el.hidden = false; clearTimeout(toast.tm); toast.tm = setTimeout(() => { el.hidden = true; }, ms || 4200); }
let statusTxt = '', duaKey = '', promptKey = '';
const hooks = {
  toast, refresh: () => { if (!$('#hud').hidden) renderQuest(); renderStepper(); applyLookSoft(); save(); },
  status: t => { if (t === statusTxt) return; statusTxt = t; const el = $('#status'); el.hidden = !t; el.textContent = t; },
  duabar: k => { if (k === duaKey) return; duaKey = k; const el = $('#duabar'); if (!k) { el.hidden = true; return; } el.innerHTML = `<p class="ar" lang="ar">${DUA[k].ar}</p><p>${DUA[k].tr}</p>`; el.hidden = false; },
  prompt: a => {
    const key = a ? a.label + (a.alt ? a.alt.label : '') : ''; if (key === promptKey) return; promptKey = key;
    const el = $('#prompt'); if (!a) { el.hidden = true; el.innerHTML = ''; return; }
    el.innerHTML = `<button class="pbtn" data-act="do"><kbd>E</kbd>${a.label}</button>` + (a.alt ? `<button class="pbtn alt" data-act="do-alt"><kbd>R</kbd>${a.alt.label}</button>` : ''); el.hidden = false;
  },
  stageDone: id => {
    applyLook(); renderStepper(); renderQuest(); save();
    const next = STEPS[S.step + 1];
    const msg = { tawaf: ['ฏอวาฟครบ 7 รอบ', 'الْحَمْدُ لِلّٰهِ'], salah: ['ละหมาดและดื่มซัมซัมเรียบร้อย', DUA.zamzam.ar], sai: ['สะแอครบ 7 เที่ยว', 'الْحَمْدُ لِلّٰهِ'], tahallul: ['พ้นจากอิห์รอมแล้ว', DUA.taqabbal.ar] }[id];
    toast(msg[0], msg[1], next ? `ขั้นต่อไป: ${next.th} · กดปุ่มในการ์ดภารกิจได้เลย` : '', 7000);
  },
  talbiyah, openMap: () => openMap(),
  modalOpen: () => !$('#mapm').hidden || !$('#certm').hidden,
  autoChanged: v => document.querySelectorAll('[data-act="auto"]').forEach(b => b.setAttribute('aria-pressed', v)),
  fpChanged: v => document.querySelectorAll('[data-act="fp"]').forEach(b => b.setAttribute('aria-pressed', v)),
  tick, attribution: a => { const el = $('#attrib'); el.textContent = a ? (W.engine.mode === 'tiles' && CONFIG.mapProvider === 'google' ? 'Google · ' : '') + a : ''; el.hidden = !a; },
  mapProblem: msg => { console.warn('map problem:', msg); toast('โหลดแผนที่ 3 มิติจริงไม่สำเร็จ', '', 'คีย์ใน config.js อาจไม่ถูกต้อง หรือยังไม่ได้เปิดใช้ Map Tiles API ตอนนี้ใช้ฉากจำลองแทน (ดูวิธีแก้ใน README.md)', 10000); }
};
let lookKey = '';
function applyLookSoft() { const k = JSON.stringify(look()); if (k !== lookKey) { lookKey = k; applyLook(); } }
function talbiyah() {
  if (!inIhram()) { toast('ยังไม่ได้ครองอิห์รอม', '', 'ตัลบียะฮ์เริ่มกล่าวหลังเหนียตที่มีกอต'); return; }
  if (S.step > STEPS.findIndex(s => s.id === 'tawaf') || (stepId() === 'tawaf' && S.tawaf.started)) { toast('หยุดกล่าวตัลบียะฮ์แล้ว', '', 'ตัลบียะฮ์ของอุมเราะห์สิ้นสุดเมื่อเริ่มฏอวาฟ'); return; }
  S.miqat.talbiyah++; const n = $('#tal-n'); if (n) n.textContent = S.miqat.talbiyah;
  const w = document.createElement('span'); w.className = 'float-word'; w.lang = 'ar'; w.textContent = 'لَبَّيْكَ اللّٰهُمَّ لَبَّيْكَ'; $('#center').appendChild(w); setTimeout(() => w.remove(), 2600);
  if (S.miqat.talbiyah === 1) { renderStepper(); if (stepId() === 'miqat') renderRight(); }
  save();
}

/* minimap + approach cards */
const mini = $('#mini'), mg = mini.getContext('2d');
let lastTick = null, nearPlace = null, placeAt = 0;
function tick(t) {
  lastTick = t;
  { const id = explore ? '' : stepId(); const extra = id === 'tawaf' ? `รอบ ${S.tawaf.rounds}/7 · ${S.tawaf.started ? 'กำลังฏอวาฟ' : 'เดินไปแนวเริ่ม'}` : id === 'sai' ? `เที่ยว ${S.sai.laps}/7` : id === 'salah' ? `ละหมาด ${S.salah.prayed ? '✓' : '–'} · ซัมซัม ${S.salah.sips}/3` : explore ? 'เดินได้อิสระ · กด M เปิดแผนที่' : ''; if (extra !== presenceExtra) { presenceExtra = extra; updatePresence(); } }
  $('#loading').hidden = t.ready;
  drawMini(t);
  const el = $('#q-target');
  if (el) {
    if (!t.target) el.innerHTML = '';
    else { const dx = t.target[0] - t.x, dz = t.target[1] - t.z, d = Math.hypot(dx, dz), c = Math.cos(t.yaw), s = Math.sin(t.yaw), sx = dx * c - dz * s, sy = dx * s + dz * c;
      el.innerHTML = `<span class="arrow" style="transform:rotate(${Math.atan2(sx, -sy)}rad)" aria-hidden="true">↑</span><span>เป้าหมาย <b>${d < 1000 ? Math.round(d) + ' ม.' : (d / 1000).toFixed(1) + ' กม.'}</b></span>`; }
  }
  const site = SITES[W.engine.site]; let found = null;
  for (const p of site.places) if (Math.hypot(t.x - p.x, t.z - p.z) < p.r && (!found || p.r < found.r)) found = p;
  const now = performance.now();
  if (found && found !== nearPlace) { nearPlace = found; placeAt = now; const pc = $('#place'); pc.innerHTML = `<h3>${found.th} <i lang="ar">${found.ar}</i></h3><p>${found.d}</p>`; pc.hidden = false; }
  if (!found) nearPlace = null;
  if (now - placeAt > 7000) $('#place').hidden = true;
}
// วาดภาพแผนที่เมือง (ตึกและถนนจริง) ลงแผนที่ย่อ/แผนที่ใหญ่ ด้วยการแปลงพิกัดแบบเดียวกับ tf
function drawCity(g, tf, wide) {
  const cm = W.cityMap(W.engine.site, wide); if (!cm) return;
  const [x0, z0, x1, z1] = cm.bbox, s = cm.canvas.width, kx = (x1 - x0) / s, kz = (z1 - z0) / s;
  const P0 = tf(x0, z0), Px = tf(x0 + 1, z0), Pz = tf(x0, z0 + 1);
  g.save(); g.setTransform((Px[0] - P0[0]) * kx, (Px[1] - P0[1]) * kx, (Pz[0] - P0[0]) * kz, (Pz[1] - P0[1]) * kz, P0[0], P0[1]); g.drawImage(cm.canvas, 0, 0); g.restore();
}
function drawWorld(g, tf, sc, rot, wide) {
  g.fillStyle = '#1b2a2f'; g.fillRect(-5000, -5000, 10000, 10000);
  if (W.engine.site !== 'makkah') { drawCity(g, tf, wide); return; }
  g.strokeStyle = '#3a4a50'; g.lineCap = 'round'; g.lineWidth = Math.max(1.5, 24 * sc);
  for (const r of ROADS) { g.beginPath(); r.forEach(([x, z], k) => { const [a, b] = tf(x, z); k ? g.lineTo(a, b) : g.moveTo(a, b); }); g.stroke(); }
  drawCity(g, tf);
  g.fillStyle = '#c9d3cf'; g.strokeStyle = '#3DD39A'; g.lineWidth = 1; g.beginPath(); POLY.forEach(([x, z], k) => { const [a, b] = tf(x, z); k ? g.lineTo(a, b) : g.moveTo(a, b); }); g.closePath(); g.fill(); g.stroke();
  const mq = [[0, -20, -12], [0, 20, -12], [1, 20, 12], [1, -20, 12]].map(([t, lat, ex]) => tf(SAFA[0] + MASA.d[0] * (t * MASA.L + ex) + MASA.e[0] * lat, SAFA[1] + MASA.d[1] * (t * MASA.L + ex) + MASA.e[1] * lat));
  g.fillStyle = '#e6ece9'; g.beginPath(); mq.forEach(([a, b], k) => k ? g.lineTo(a, b) : g.moveTo(a, b)); g.closePath(); g.fill();
  const [kx, ky] = tf(0, 0); g.fillStyle = '#ffffff'; g.beginPath(); g.arc(kx, ky, Math.max(2, 70 * sc), 0, Math.PI * 2); g.fill();
  const ks = Math.max(2.5, 9 * sc); g.save(); g.translate(kx, ky); if (rot) g.rotate(rot); g.rotate(Math.PI / 4); g.fillStyle = '#0b0b0d'; g.fillRect(-ks / 1.41, -ks / 1.41, ks * 1.41, ks * 1.41); g.restore();
}
function drawMini(t) {
  const Wd = mini.width, Hd = mini.height, sc = .55 * (Wd / 296), c = Math.cos(t.yaw), s = Math.sin(t.yaw);
  const tf = (x, z) => { const dx = x - t.x, dz = z - t.z; return [Wd / 2 + (dx * c - dz * s) * sc, Hd / 2 + (dx * s + dz * c) * sc]; };
  mg.save(); mg.clearRect(0, 0, Wd, Hd); mg.beginPath(); mg.arc(Wd / 2, Hd / 2, Wd / 2, 0, Math.PI * 2); mg.clip();
  drawWorld(mg, tf, sc, t.yaw);
  for (const p of SITES[W.engine.site].places) { const [x, y] = tf(p.x, p.z); if (Math.hypot(x - Wd / 2, y - Hd / 2) > Wd / 2) continue; mg.fillStyle = '#E3B866'; mg.beginPath(); mg.arc(x, y, 5, 0, Math.PI * 2); mg.fill(); }
  if (t.target) { let [x, y] = tf(t.target[0], t.target[1]); const dx = x - Wd / 2, dy = y - Hd / 2, d = Math.hypot(dx, dy), lim = Wd / 2 - 12; if (d > lim) { x = Wd / 2 + dx / d * lim; y = Hd / 2 + dy / d * lim; } mg.fillStyle = '#3DD39A'; mg.strokeStyle = '#04140d'; mg.lineWidth = 3; mg.beginPath(); mg.arc(x, y, 8, 0, Math.PI * 2); mg.fill(); mg.stroke(); }
  const hx = Math.sin(t.heading) * c - Math.cos(t.heading) * s, hy = Math.sin(t.heading) * s + Math.cos(t.heading) * c;
  mg.translate(Wd / 2, Hd / 2); mg.rotate(Math.atan2(hx, -hy)); mg.fillStyle = '#3DD39A'; mg.strokeStyle = '#ffffff'; mg.lineWidth = 2.5;
  mg.beginPath(); mg.moveTo(0, -14); mg.lineTo(10, 11); mg.lineTo(0, 5); mg.lineTo(-10, 11); mg.closePath(); mg.fill(); mg.stroke();
  mg.restore();
  const nx = Math.sin(t.yaw), ny = -Math.cos(t.yaw);
  mg.fillStyle = 'rgba(8,14,20,.85)'; mg.beginPath(); mg.arc(Wd / 2 + nx * (Wd / 2 - 18), Hd / 2 + ny * (Hd / 2 - 18), 14, 0, Math.PI * 2); mg.fill();
  mg.fillStyle = '#ECF3F0'; mg.font = '700 20px Anuphan, sans-serif'; mg.textAlign = 'center'; mg.textBaseline = 'middle'; mg.fillText('N', Wd / 2 + nx * (Wd / 2 - 18), Hd / 2 + ny * (Hd / 2 - 18) + 1);
}

/* big map */
let mapZoom = 'haram', mapTF = null;
function openMap() { $('#mapm').hidden = false; renderPlaceList(); requestAnimationFrame(drawBig); }
function drawBig() {
  const big = $('#bigmap'), bg = big.getContext('2d'), r = big.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
  big.width = Math.max(10, r.width * dpr); big.height = Math.max(10, r.height * dpr);
  const Wd = big.width, Hd = big.height, site = SITES[W.engine.site];
  let B;
  if (site.zoom) B = site.zoom[mapZoom] || site.zoom.haram;
  else { const xs = site.places.map(p => p.x), zs = site.places.map(p => p.z); B = [Math.min(...xs) - 400, Math.min(...zs) - 400, Math.max(...xs) + 400, Math.max(...zs) + 400]; }
  const sc = Math.min(Wd / (B[2] - B[0]), Hd / (B[3] - B[1])), ox = (Wd - (B[2] - B[0]) * sc) / 2 - B[0] * sc, oy = (Hd - (B[3] - B[1]) * sc) / 2 - B[1] * sc;
  const tf = (x, z) => [ox + x * sc, oy + z * sc]; mapTF = { tf, dpr };
  bg.save(); bg.beginPath(); bg.rect(0, 0, Wd, Hd); bg.clip(); drawWorld(bg, tf, sc, 0, mapZoom === 'city');
  const fs = 13 * dpr;
  for (const p of site.places) {
    if (mapZoom === 'haram' && (p.x < B[0] || p.x > B[2] || p.z < B[1] || p.z > B[3])) continue;
    if (W.engine.site === 'makkah' && mapZoom === 'city' && p.r < 100 && p.id !== 'kaaba') continue;
    if (W.engine.site !== 'makkah' && mapZoom === 'city' && p.r < 40) continue;
    const [x, y] = tf(p.x, p.z);
    bg.fillStyle = '#E3B866'; bg.strokeStyle = '#0b1116'; bg.lineWidth = 2 * dpr; bg.beginPath(); bg.arc(x, y, 6 * dpr, 0, Math.PI * 2); bg.fill(); bg.stroke();
    bg.font = `600 ${fs}px Anuphan, sans-serif`; bg.textAlign = 'left'; bg.textBaseline = 'middle';
    const tw = bg.measureText(p.th).width; bg.fillStyle = 'rgba(8,14,20,.85)'; bg.fillRect(x + 9 * dpr, y - fs * .8, tw + 12 * dpr, fs * 1.6);
    bg.fillStyle = '#ECF3F0'; bg.fillText(p.th, x + 15 * dpr, y + 1);
  }
  if (lastTick) { const [px, py] = tf(lastTick.x, lastTick.z); bg.save(); bg.translate(px, py); bg.rotate(Math.atan2(Math.sin(lastTick.heading), -Math.cos(lastTick.heading))); bg.fillStyle = '#3DD39A'; bg.strokeStyle = '#fff'; bg.lineWidth = 2 * dpr; bg.beginPath(); bg.moveTo(0, -12 * dpr); bg.lineTo(8 * dpr, 9 * dpr); bg.lineTo(0, 4 * dpr); bg.lineTo(-8 * dpr, 9 * dpr); bg.closePath(); bg.fill(); bg.stroke(); bg.restore(); }
  bg.fillStyle = '#ECF3F0'; bg.font = `700 ${fs}px Anuphan, sans-serif`; bg.fillText('N ↑', 12 * dpr, 18 * dpr);
  bg.restore();
  document.querySelectorAll('[data-act="mapzoom"]').forEach(b => { b.setAttribute('aria-pressed', b.dataset.z === mapZoom); b.hidden = false; });
}
function renderPlaceList() {
  const site = SITES[W.engine.site];
  $('#plist').innerHTML = site.places.map(p => { const d = lastTick ? Math.hypot(p.x - lastTick.x, p.z - lastTick.z) : 0; return `<button data-act="travel" data-id="${p.id}"><b>${p.th}</b><small>${d < 1000 ? Math.round(d) + ' ม.' : (d / 1000).toFixed(1) + ' กม.'} · ${p.d.slice(0, 50)}${p.d.length > 50 ? '…' : ''}</small></button>`; }).join('')
    + (site.soon || []).map(p => `<button class="soon" disabled aria-disabled="true"><b>${p.th}</b><small>${icon('clock')} เปิดให้บริการเร็ว ๆ นี้</small></button>`).join('');
}
function travel(id) {
  const p = SITES[W.engine.site].places.find(q => q.id === id); if (!p) return;
  $('#mapm').hidden = true;
  const f = $('#fade'); f.classList.add('on');
  setTimeout(() => { W.teleport(p.go[0], p.go[1], p.yaw ?? Math.atan2(-(p.x - p.go[0]), -(p.z - p.go[1]))); f.classList.remove('on'); toast('มาถึง' + p.th, p.ar, p.d, 5000); }, 380);
}

/* ================= certificate ================= */
function certHTML() {
  const now = new Date(); let be = '', hj = '';
  try { be = new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'long', year: 'numeric' }).format(now); } catch (e) { }
  try { hj = new Intl.DateTimeFormat('th-TH-u-ca-islamic-umalqura', { day: 'numeric', month: 'long', year: 'numeric' }).format(now); } catch (e) { }
  const r = [['อิห์รอม', isDone(3)], ['ฏอวาฟ', isDone(4)], ['สะแอ', isDone(6)], ['ตะฮัลลุล', isDone(7)]], all = r.every(x => x[1]);
  return `<div class="cert"><p class="ar big" lang="ar">تَقَبَّلَ اللّٰهُ مِنَّا وَمِنْكُمْ</p>
    <p class="muted">${all ? 'ขอแสดงความยินดีกับ' : 'บันทึกการเดินทางของ'}</p><h2>${esc(S.profile.name || 'ผู้แสวงบุญ')}</h2>
    <p class="muted">${all ? 'ผู้ได้ฝึกพิธีอุมเราะห์ในบทจำลองครบทุกรุก่น' : 'ยังมีรุก่นที่ยังไม่ได้ฝึก กดที่ขั้นตอนด้านบนเพื่อกลับไปทำต่อ'}</p>
    <div class="rukun">${r.map(([t, ok]) => `<span class="${ok ? 'on' : ''}">${ok ? '✓ ' : ''}${t}</span>`).join('')}</div>
    <div class="stats"><div><b>${S.tawaf.rounds}</b><small>รอบฏอวาฟ</small></div><div><b>${S.sai.laps}</b><small>เที่ยวสะแอ</small></div><div><b>${(S.walked / 1000).toFixed(2)}</b><small>กม. ที่เดิน</small></div>
    <div><b>${S.miqat.talbiyah}</b><small>ตัลบียะฮ์</small></div><div><b>${S.istilam}</b><small>อิสติลาม</small></div><div><b>${Math.round(S.walked / .72).toLocaleString('th-TH')}</b><small>ก้าวโดยประมาณ</small></div></div>
    <p class="muted sm">${be}${hj ? ' · ' + hj : ''}</p></div>`;
}

// ซ่อน/แสดงเมนูทั้งหมด (ปุ่มบนแถบบน หรือกด H)
let uiHidden = false; try { uiHidden = localStorage.getItem('umrah-ui-hidden') === '1'; } catch (e) { }
function applyUI() {
  $('#app').classList.toggle('ui-hidden', uiHidden);
  const b = $('#uibtn'); b.innerHTML = icon(uiHidden ? 'eye' : 'eyeOff'); b.setAttribute('aria-pressed', uiHidden);
  try { localStorage.setItem('umrah-ui-hidden', uiHidden ? '1' : '0'); } catch (e) { }
  requestAnimationFrame(layoutStudio);
}
function toggleUI() { uiHidden = !uiHidden; applyUI(); }
document.addEventListener('keydown', e => { if (e.code === 'KeyH' && !(e.target.matches && e.target.matches('input,textarea'))) toggleUI(); });
function applyTheme() {
  const light = document.documentElement.dataset.theme === 'light';
  W.setStudioTheme(light);
  const b = document.querySelector('.railbtn.solo'); if (b) b.innerHTML = icon(light ? 'moon' : 'sun');
}

/* ================= events ================= */
const ACT = {
  go: b => go(+b.dataset.i), next: () => go(S.step + 1),
  start: () => { S.profile.name = ($('#f-name')?.value || '').trim() || 'ผู้แสวงบุญ'; S.done.create = true; go(1); },
  set: b => {
    const k = b.dataset.k; let v = b.dataset.v;
    if (k === 'route') { S.route = v; S.landed = false; save(); renderRoute(); renderRight(); return; }
    if (k === 'cloth' || k === 'skin') v = +v; if (k === 'beard') v = v === 'true';
    S.profile[k] = v; save(); renderRight(); applyLook(); updatePresence();
  },
  fly: () => fly(),
  talbiyah: () => talbiyah(),
  quiz: b => { S.miqat.quiz[b.dataset.q] = b.dataset.a === '1'; save(); renderRight(); },
  cam: b => { W.studioSet({ preset: b.dataset.v }); setPressed('cam', b.dataset.v); },
  focus: b => { W.studioSet({ focus: b.dataset.v }); setPressed('focus', b.dataset.v); },
  anim: b => { W.studioSet({ anim: b.dataset.v }); setPressed('anim', b.dataset.v); },
  'zoom-in': () => W.zoomBy(1 / 1.2), 'zoom-out': () => W.zoomBy(1.2),
  explore: b => {
    const site = SITES[b.dataset.site];
    S.profile.name = ($('#f-name')?.value || S.profile.name).trim() || S.profile.name;
    explore = { site: site.id }; render();
  },
  'leave-explore': () => { explore = null; render(); },
  travel: b => travel(b.dataset.id),
  map: () => openMap(), close: () => { $('#mapm').hidden = true; $('#certm').hidden = true; },
  mapzoom: b => { mapZoom = b.dataset.z; drawBig(); },
  auto: () => W.toggleAuto(), night: b => { W.setNight(!W.engine.night); b.setAttribute('aria-pressed', W.engine.night); },
  run: b => { const v = b.getAttribute('aria-pressed') !== 'true'; b.setAttribute('aria-pressed', v); W.setRun(v); },
  qmin: () => { qMin = !qMin; renderQuest(); },
  do: () => W.doAction(false), 'do-alt': () => W.doAction(true),
  copy: () => {
    const txt = `labbaik-loop · เส้นทางอุมเราะห์ของ ${S.profile.name}\nฏอวาฟ ${S.tawaf.rounds}/7 รอบ · สะแอ ${S.sai.laps}/7 เที่ยว · เดิน ${(S.walked / 1000).toFixed(2)} กม.\nتَقَبَّلَ اللّٰهُ مِنَّا وَمِنْكُمْ`;
    navigator.clipboard?.writeText(txt).then(() => toast('คัดลอกแล้ว', '', ''), () => toast('คัดลอกไม่สำเร็จ', '', txt, 8000));
  },
  restart: b => {
    if (b.dataset.confirm) { localStorage.removeItem(STORE); location.reload(); return; }
    b.dataset.confirm = '1'; b.textContent = 'กดอีกครั้งเพื่อล้างความคืบหน้า';
    setTimeout(() => { if (b.isConnected) { delete b.dataset.confirm; b.textContent = 'เริ่มใหม่ทั้งหมด'; } }, 4000);
  },
  ui: () => toggleUI(),
  fp: () => W.toggleFP(),
  fullscreen: async () => {
    try {
      if (!document.fullscreenElement) { await document.documentElement.requestFullscreen(); try { await screen.orientation.lock('landscape'); } catch (e) { } }
      else await document.exitFullscreen();
    } catch (e) { toast('เปิดเต็มจอไม่ได้', '', 'เบราว์เซอร์นี้ไม่รองรับ (เช่น Safari บน iPhone) ลองหมุนจอเป็นแนวนอน หรือกด แชร์ → เพิ่มไปยังหน้าจอโฮม', 6000); }
  },
  theme: () => { const r = document.documentElement; r.dataset.theme = r.dataset.theme === 'light' ? 'dark' : 'light'; try { localStorage.setItem('umrah-theme', r.dataset.theme); } catch (e) { } applyTheme(); }
};
function setPressed(act, v) { document.querySelectorAll(`[data-act="${act}"]`).forEach(b => b.setAttribute('aria-pressed', b.dataset.v === v)); }
document.addEventListener('click', e => { const b = e.target.closest('[data-act]'); if (!b || b.disabled) return; const f = ACT[b.dataset.act]; if (f) f(b, e); });
document.addEventListener('input', e => { if (e.target.id === 'f-name') { S.profile.name = e.target.value; save(); updatePresence(); } });
document.addEventListener('change', e => {
  const t = e.target;
  if (t.dataset.prep) { S.prep[t.dataset.prep] = t.checked; save(); renderRight(); renderStepper(); }
  else if (t.dataset.mq !== undefined) { S.miqat.steps[t.dataset.mq] = t.checked; save(); applyLook(); renderRight(); renderStepper(); }
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') { $('#mapm').hidden = true; $('#certm').hidden = true; } });
$('#mapm').addEventListener('click', e => { if (e.target.id === 'mapm') $('#mapm').hidden = true; });
$('#bigmap').addEventListener('click', e => {
  if (!mapTF) return; const r = e.currentTarget.getBoundingClientRect(), x = (e.clientX - r.left) * mapTF.dpr, y = (e.clientY - r.top) * mapTF.dpr;
  let best = null, bd = 24 * mapTF.dpr;
  for (const p of SITES[W.engine.site].places) { const [a, b] = mapTF.tf(p.x, p.z), d = Math.hypot(a - x, b - y); if (d < bd) { bd = d; best = p; } }
  if (best) travel(best.id);
});
window.addEventListener('resize', () => { if (!$('#mapm').hidden) drawBig(); });

/* ================= boot ================= */
try { const th = localStorage.getItem('umrah-theme'); if (th) document.documentElement.dataset.theme = th; } catch (e) { }
{ const h = location.hash.slice(1), i = STEPS.findIndex(s => s.id === h); if (i >= 0) S.step = i; const m = h.match(/^explore-(\w+)/); if (m && SITES[m[1]]) explore = { site: m[1] }; }
// ใส่ไอคอนและโลโก้ให้ปุ่มที่ประกาศ data-icon ไว้ใน HTML
document.querySelectorAll('[data-icon]').forEach(b => b.insertAdjacentHTML('afterbegin', icon(b.dataset.icon)));
$('#logo').innerHTML = LOGO;
W.initEngine($('#gl'), S, hooks, CONFIG);
applyTheme();
applyUI();
document.addEventListener('fullscreenchange', () => { $('#fsbtn').innerHTML = icon(document.fullscreenElement ? 'shrink' : 'expand'); setTimeout(layoutStudio, 200); });
window.addEventListener('orientationchange', () => setTimeout(layoutStudio, 300));
W.bindJoystick($('#joy'));
render();
loadManifest(CONFIG.characterManifest || './assets/characters/manifest.json').then(() => { applyLook(); if (stepId() === 'create') renderRight(); });
const fontsReady = document.fonts?.ready ? Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 1500))]) : Promise.resolve();
fontsReady.then(() => W.buildLabels());
W.initMap().then(() => { if (stepId() === 'create') renderRight(); if (!$('#hud').hidden) render(); });
