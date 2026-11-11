// A 키트 예제 4 — 화면 틀: 재생 막대 · 장 단추 · 안내 상자 · 이름표 · 아래 칸 네 개.
// 원본(../../app.js)에서 멀티미터 칸(표시창·다이얼·연결 그림)을 빼고, 아래 칸은 lesson.js의 bays(s)가 정한 글을 그대로 담는다.
// 쓰는 법: startLab(lesson) — lesson = { CH, DUR, TL, stateAt, buildItems, labelsFor, bays, INFO }
import '@fontsource/ibm-plex-sans-kr/400.css';
import '@fontsource/ibm-plex-sans-kr/600.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/700.css';
import { INK, initStage, renderScene, project, P3, rotOnly, A, anchorNames, anchorInfo, PARTS } from '../../engine.js';

const $ = (id) => document.getElementById(id);
const Q = new URLSearchParams(location.search);
export function startLab({ CH, DUR, TL, stateAt, buildItems, labelsFor, bays, INFO = {} }) {
if (INFO.kit) $('kit').textContent = INFO.kit; else $('kit').hidden = true;
if (INFO.lab) $('labtag').textContent = INFO.lab; else $('labtag').hidden = true;
if (INFO.intro) { $('intro').querySelector('i').textContent = INFO.lab ? `${INFO.lab} · 시작` : '시작'; $('intro').querySelector('b').textContent = INFO.intro[0]; $('intro').querySelector('span').textContent = INFO.intro[1] || ''; }
initStage($('stage'), () => ({ top: 30, bottom: $('bays').offsetHeight + 34 }));

// 점검 확대: ?t=8&focus=tower.edge&zoom=90
const FOCUS = Q.get('focus');
const focusCam = () => { const p = /^[-\d.]+,[-\d.]+,[-\d.]+$/.test(FOCUS) ? FOCUS.split(',').map(Number) : A(FOCUS); const q = rotOnly(P3(p)); return { cx: q.x, cy: q.y, zoom: +(Q.get('zoom') || 70) }; };

function render(t) {
  const s = stateAt(t);
  renderScene({ cam: FOCUS ? focusCam() : s.cam, buildItems: () => buildItems(s) });
  overlay(s);
}

// ───────── 화면 위 글자 ─────────
const labelsEl = $('labels');
function overlay(s) {
  const c = s.c;
  $('chip').textContent = c ? `● ${s.ch + 1}/${CH.length} · ${c.chip}` : '● 조립 중';
  const note = $('note');
  if (s.note) { note.classList.add('on'); note.querySelector('b').textContent = s.note[0]; note.querySelector('span').textContent = s.note[1]; } else note.classList.remove('on');
  // 이름표 + 지시선 (조립하는 동안은 INFO.names 로 내려앉은 부품마다)
  const list = labelsFor(s).slice();
  if (!c && INFO.names) for (const [id, v] of Object.entries(INFO.names)) { const [name, off = [-34, -30]] = Array.isArray(v) ? v : [v]; const p = PARTS[id]; if (p?.on && p.lift < 0.3) list.push([name, [p.at[0], p.at[1], p.h + 0.4], off]); }
  labelsEl.innerHTML = '<svg></svg>'; const svg = labelsEl.firstChild;
  for (const [text, p, off] of list) {
    const P = project(P3(p)), L = { x: P.x + off[0], y: P.y + off[1] };
    const el = document.createElement('div'); el.className = 'lbl'; el.textContent = text; el.style.left = `${L.x}px`; el.style.top = `${L.y}px`; labelsEl.appendChild(el);
    svg.insertAdjacentHTML('beforeend', `<line x1="${P.x}" y1="${P.y}" x2="${L.x}" y2="${L.y}" stroke="${INK}" stroke-width="1.1"/><circle cx="${P.x}" cy="${P.y}" r="2.2" fill="${INK}"/>`);
  }
  // 아래 칸 네 개: 글은 lesson.js가 정한다
  bays(s).forEach((b, i) => {
    $(`b${i + 1}tag`).textContent = b.tag;
    const el = $(`b${i + 1}`); if (el._html !== b.html) { el._html = b.html; el.innerHTML = b.html; }
  });
  $('intro').classList.toggle('on', !!INFO.intro && !c && s.t > 0.3);
}

// ───────── 재생 ─────────
let tNow = Q.has('t') ? +Q.get('t') : 0, playing = !Q.has('t'), speed = 1, last = null;
if (Q.has('t')) document.documentElement.classList.add('still');
const steps = [{ label: '0 · 조립', t: 0 }, ...CH.map((c, i) => ({ label: `${i + 1} · ${c.chip}`, t: c.t0 }))];
steps.forEach((st) => { const b = document.createElement('button'); b.textContent = st.label; b.onclick = () => { tNow = st.t; playing = true; }; $('steps').appendChild(b); });
$('play').onclick = () => { playing = !playing; };
$('restart').onclick = () => { tNow = 0; playing = true; };
$('scrub').oninput = (e) => { tNow = (e.target.value / 1000) * DUR; playing = false; };
$('spd').onclick = () => { speed = speed === 1 ? 2 : speed === 2 ? 0.5 : 1; $('spd').textContent = `×${speed}`; };
addEventListener('keydown', (e) => {
  if (e.code === 'Space') { playing = !playing; e.preventDefault(); }
  if (e.key === 'ArrowRight') tNow = Math.min(DUR, tNow + 1);
  if (e.key === 'ArrowLeft') tNow = Math.max(0, tNow - 1);
});
function loop(ts) {
  if (last == null) last = ts;
  const dt = Math.min(0.05, (ts - last) / 1000); last = ts;
  if (playing && !document.hidden) { tNow += dt * speed; if (tNow > DUR + 1.2) tNow = 0; }
  render(Math.min(tNow, DUR));
  $('play').textContent = playing ? '❚❚' : '▶'; $('clock').textContent = `${tNow.toFixed(1)} s`;
  if (document.activeElement !== $('scrub')) $('scrub').value = Math.round((tNow / DUR) * 1000);
  const ci = TL.chapterAt(tNow) + 1; [...$('steps').children].forEach((b, i) => b.classList.toggle('on', i === ci));
  requestAnimationFrame(loop);
}
// 콘솔 점검 도구
window.seek = (t) => { tNow = t; playing = false; render(t); };
window.__state = (t) => { const s = stateAt(t); return { ch: s.c?.id, u: +s.u.toFixed(2), tau: +s.tau.toFixed(3), ball: s.ball.p.map((v) => +v.toFixed(2)) }; };
window.__anchors = (prefix = '') => anchorNames().filter((n) => n.startsWith(prefix)).map((n) => [n, A(n).map((v) => +v.toFixed(3)), anchorInfo(n).kind || '']);
window.__parts = PARTS;
document.fonts.ready.then(() => requestAnimationFrame(loop));
}
