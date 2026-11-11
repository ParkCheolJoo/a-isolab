// A 키트 — 화면 틀: 재생 막대 · 장 단추 · 안내 상자 · 이름표 · 표시창 칸. (고치지 않음)
// 쓰는 법: startLab(lesson) — lesson = { CH, DUR, TL, stateAt, buildItems, labelsFor }
import '@fontsource/ibm-plex-sans-kr/400.css';
import '@fontsource/ibm-plex-sans-kr/600.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/700.css';
import { INK, initStage, renderScene, project, P3, rotOnly, A, anchorNames, anchorInfo, PARTS } from './engine.js';
import { checkBoard, netlist, solve } from './board.js';

const $ = (id) => document.getElementById(id);
const Q = new URLSearchParams(location.search);
export function startLab({ CH, DUR, TL, stateAt, buildItems, labelsFor, INFO = {} }) {
// 아래 띠(부품 목록 · LAB 번호)와 처음 말풍선: lesson.js의 INFO에서
if (INFO.kit) $('kit').textContent = INFO.kit; else $('kit').hidden = true;
if (INFO.lab) $('labtag').textContent = INFO.lab; else $('labtag').hidden = true;
if (INFO.intro) { $('intro').querySelector('i').textContent = INFO.lab ? `${INFO.lab} · 시작` : '시작'; $('intro').querySelector('b').textContent = INFO.intro[0]; $('intro').querySelector('span').textContent = INFO.intro[1] || ''; }
initStage($('stage'), () => ({ top: 30, bottom: $('bays').offsetHeight + 34 }));

// 점검 확대: ?t=8&focus=pila.%2B&zoom=90
const FOCUS = Q.get('focus');
const focusCam = () => { const p = /^[-\d.]+,[-\d.]+,[-\d.]+$/.test(FOCUS) ? FOCUS.split(',').map(Number) : A(FOCUS); const q = rotOnly(P3(p)); return { cx: q.x, cy: q.y, zoom: +(Q.get('zoom') || 70) }; };

function render(t) {
  const s = stateAt(t);
  renderScene({ cam: FOCUS ? focusCam() : s.cam, buildItems: () => buildItems(s) });
  overlay(s);
}

// ───────── 화면 위 글자 ─────────
const labelsEl = $('labels');
const FN = { OFF: '꺼짐', VDC: 'V⎓', VAC: 'V~', OHM: 'Ω', CAP: '⊣⊢', HZ: 'Hz', TEMP: '°C', mA: 'mA' };
const FNAME = { OFF: ['꺼짐', '다이얼을 OFF에'], VDC: ['DC 전압', '다이얼을 V⎓에'], VAC: ['AC 전압', '다이얼을 V~에'], OHM: ['저항', '다이얼을 Ω에'], CAP: ['정전용량', '다이얼을 ⊣⊢에'], HZ: ['주파수', '다이얼을 Hz에'], TEMP: ['온도', '다이얼을 °C에'], mA: ['전류', '빨강을 mA 단자로'] };
// BAY 03 연결 그림: 장의 conn(없으면 다이얼로 정함) → 작은 회로도
const CONN = { VDC: '병렬', VAC: '병렬', OHM: '전원 끄기', mA: '직렬', CAP: '방전 후' };
function connSVG(how, label = '') {
  const t = (x, y, s, size = 9) => `<text x="${x}" y="${y}" text-anchor="middle" font-size="${size}" font-family="JetBrains Mono, monospace" fill="${INK}">${s}</text>`;
  const meter = (x, y, ch, fill = '#c9e46a') => `<circle cx="${x}" cy="${y}" r="11" fill="${fill}" stroke="${INK}" stroke-width="1.5"/>${t(x, y + 4, ch, 10)}`;
  const loop = `<rect x="18" y="12" width="124" height="46" rx="4" fill="none" stroke="${INK}" stroke-width="1.5"/>`;
  const box = (fill = '#fffdf8') => `<rect x="44" y="5" width="72" height="15" rx="2" fill="${fill}" stroke="${INK}" stroke-width="1.2"/>${t(80, 16, label.slice(0, 10), 9)}`;
  const x = (cx, cy) => `<path d="M${cx - 6} ${cy - 6} l12 12 M${cx + 6} ${cy - 6} l-12 12" stroke="#c8382c" stroke-width="2.2"/>`;
  return `<svg viewBox="0 0 160 70" aria-hidden="true">${{
    병렬: `${loop}${box()}<line x1="80" y1="19" x2="80" y2="47" stroke="${INK}" stroke-dasharray="2 2"/>${meter(80, 58, 'V')}`,
    '전원 끄기': `${loop}${box('#efe9dc')}${meter(80, 58, 'Ω')}${x(146, 12)}`,
    직렬: `<path d="M18 58 V12 H142 V58 H95 M65 58 H18" fill="none" stroke="${INK}" stroke-width="1.5"/>${box()}${meter(80, 58, 'A')}`,
    '방전 후': `<line x1="18" y1="35" x2="72" y2="35" stroke="${INK}" stroke-width="1.5"/><line x1="72" y1="20" x2="72" y2="50" stroke="${INK}" stroke-width="2"/><line x1="82" y1="20" x2="82" y2="50" stroke="${INK}" stroke-width="2"/><line x1="82" y1="35" x2="126" y2="35" stroke="${INK}" stroke-width="1.5"/>${meter(138, 35, 'F')}`,
    '잘못 연결': `${loop}${t(80, 9, '전원에 바로', 9)}${meter(80, 58, 'A', '#f4b4ad')}${x(80, 35)}`,
  }[how] || ''}</svg>`;
}
function overlay(s) {
  const c = s.c;
  $('chip').textContent = c ? `● ${s.ch + 1}/${CH.length} · ${c.chip}` : '● 조립 중';
  const note = $('note');
  if (s.note) { note.classList.add('on'); note.querySelector('b').textContent = s.note[0]; note.querySelector('span').textContent = s.note[1]; } else note.classList.remove('on');
  // 이름표 + 지시선
  const list = labelsFor(s).slice();
  // 조립하는 동안: 내려앉은 부품마다 이름표 (INFO.names = { 부품 id: '이름' 또는 ['이름', [화면 밀림 x, y]] })
  if (!c && INFO.names) for (const [id, v] of Object.entries(INFO.names)) { const [name, off = [-34, -30]] = Array.isArray(v) ? v : [v]; const p = PARTS[id]; if (p?.on && p.lift < 0.3) list.push([name, [p.at[0], p.at[1], p.h + 0.4], off]); }
  labelsEl.innerHTML = '<svg></svg>'; const svg = labelsEl.firstChild;
  for (const [text, p, off] of list) {
    const P = project(P3(p)), L = { x: P.x + off[0], y: P.y + off[1] };
    const el = document.createElement('div'); el.className = 'lbl'; el.textContent = text; el.style.left = `${L.x}px`; el.style.top = `${L.y}px`; labelsEl.appendChild(el);
    svg.insertAdjacentHTML('beforeend', `<line x1="${P.x}" y1="${P.y}" x2="${L.x}" y2="${L.y}" stroke="${INK}" stroke-width="1.1"/><circle cx="${P.x}" cy="${P.y}" r="2.2" fill="${INK}"/>`);
  }
  // 표시창 칸
  const L = s.lcd;
  $('b1tag').textContent = !c || c.dial === 'OFF' ? '꺼짐' : s.touch ? '측정 중' : '대기';
  $('b1mode').innerHTML = L.v ? ['자동', 'DC', 'AC', 'HOLD', 'REL'].map((w) => `<i class="${(w === '자동' && L.auto) || w === L.mode ? 'lit' : ''}">${w}</i>`).join(' ') : '';   // 꺼진 표시도 흐리게 보임
  $('b1val').textContent = L.v ? (L.neg ? '-' : '') + L.v : '';
  $('b1unit').textContent = L.unit || '';
  $('b1val').dataset.ghost = L.v ? (L.neg ? '-' : '') + String(L.v).replace(/[0-9]/g, '8') : '';   // 꺼진 칸(88.88)이 흐리게 비침
  // BAY 02 다이얼과 프로브: 기능 칸 + 검정은 COM, 빨강은 다이얼에 맞는 단자. 닿았으면 어디에 닿았는지
  const mode = c?.dial && c.dial !== 'OFF' ? c.dial : null, jack = mode === 'mA' ? 'mA' : 'VΩ';
  const at = s.touch && c?.at ? (s.swapped ? { r: c.at.b, b: c.at.r } : c.at) : null;
  const nm = FNAME[mode || 'OFF'];
  $('b3tag').textContent = mode ? FN[mode] : 'OFF';
  $('b3').innerHTML = `<div class="fnt"><i>${mode ? FN[mode] : 'OFF'}</i><div><b>${nm[0]}</b><small>${nm[1]}</small></div></div><p class="pl"><i class="dot b"></i>검정 → COM${at ? ` <s>· ${at.b}</s>` : ''}</p><p class="pl${mode === 'mA' ? ' hi' : ''}"><i class="dot r"></i>빨강 → ${jack}${at ? ` <s>· ${at.r}</s>` : ''}</p>`;
  // BAY 03 연결 방법: 작은 회로도 + 장 이름
  const how = c ? (c.conn || CONN[c.dial] || '') : '';
  $('b2tag').textContent = how || '—';
  const key = `${c?.id}|${how}`;
  if ($('b2').dataset.k !== key) { $('b2').dataset.k = key; $('b2').innerHTML = (c ? `<b>${c.chip}</b>${how ? connSVG(how, c.label || '') : `<p>${c.note.join('<br>')}</p>`}` : '<p>부품을 실험대에 놓는 중</p>') + '<p class="x"></p>'; }
  $('b2').querySelector('.x').textContent = s.extra || '';
  // BAY 04 기능: 다이얼 여덟 자리 중 지금 자리 · 몇 번째 장 · 다음 장
  $('b4tag').textContent = c ? `${s.ch + 1}/${CH.length}` : `0/${CH.length}`;
  $('b4').innerHTML = `<div class="fn">${Object.keys(FN).map((k) => `<span class="${k === (mode || 'OFF') ? 'on' : CH.some((x, i) => i < s.ch && x.dial === k) ? 'done' : ''}">${FN[k]}</span>`).join('')}</div><small class="next">${s.ch + 1 < CH.length ? `다음: ${CH[s.ch + 1].chip}` : '마지막 장'}</small>`;
  // 처음 말풍선: 조립하는 동안만
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
window.__state = (t) => { const s = stateAt(t); return { ch: s.c?.id, u: +s.u.toFixed(2), lcd: s.lcd, touch: s.touch }; };
window.__anchors = (prefix = '') => anchorNames().filter((n) => n.startsWith(prefix)).map((n) => [n, A(n).map((v) => +v.toFixed(3)), anchorInfo(n).kind || '']);
window.__parts = PARTS;
window.__check = checkBoard; window.__nets = netlist; window.__solve = solve;
const probs = checkBoard(); if (probs.length) console.warn('[꽂기 규칙]', probs.map((p) => `${p.level}: ${p.msg}`).join('\n'));
document.fonts.ready.then(() => requestAnimationFrame(loop));
}
