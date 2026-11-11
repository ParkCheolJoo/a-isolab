// A 키트 예제 4 — 수평으로 던진 운동: 가로로는 등속 운동, 세로로는 자유 낙하. 두 운동은 서로 영향을 주지 않는다.
// 이 예제는 멀티미터가 없으므로 화면 틀(app.js)과 index.html의 아래 칸 네 개를 이 폴더에서 따로 쓴다.
// 순서: 1) 실험대 2) 수치 모델 3) 부품 놓기 4) 장 표 5) 상태 6) 아래 칸 7) 그리기 8) 이름표
import { V, prism, shape, rrect, floorLayer, Zdog, PARTS, A, add3, easeOut, seg, fitCam, partPts, item, depth, proj, stage, onPlane, INK, TAU } from '../../engine.js';
import { tower, groundRuler } from '../../parts.js';

// 1) 실험대 (화면보다 크게)
const desk = new Zdog.Group({ addTo: floorLayer });
prism(desk, rrect(2, 8, 84, 72, 6, 6), -2.2, 0, '#e8e1d2', { top: '#f4efe4', w: 1.2 });
for (let x = -38; x <= 42; x += 2) shape(desk, [V(x, -26, 0), V(x, 42, 0)], x % 10 === 0 ? '#1d20331c' : '#1d20330b', { fill: false, closed: false, w: 0.8 });
for (let y = -26; y <= 42; y += 2) shape(desk, [V(-38, y, 0), V(42, y, 0)], y % 10 === 0 ? '#1d20331c' : '#1d20330b', { fill: false, closed: false, w: 0.8 });

// 2) 수치 모델 ─ 단위는 m·s. 그림에서는 1 m = 실험대 1 cm. 공기 저항은 없다.
const G = 9.8, V0 = 10, H = 19.6;           // 중력 가속도(m/s²) · 처음 가로 속력(m/s) · 탑 높이(m)
const RB = 1;                                // 공 반지름 (그림 크기)
const X0 = -11, Y0 = 12;                     // 던지는 모서리 자리 (그림 좌표)
const ROLL = 0.3;                            // 모서리까지 굴러오는 시간(s)
const SLOW = 2;                              // 느린 화면: 실제 1 s를 화면 2 s로
export const T_FALL = Math.sqrt((2 * H) / G);       // 땅에 닿는 시간
export const RANGE = V0 * T_FALL;                   // 도달 거리
const STROBE = Array.from({ length: Math.floor((T_FALL + 1e-9) / 0.5) + 1 }, (_, i) => i * 0.5);   // 0.5 s마다 찍는 사진
const clampTau = (tau) => Math.min(Math.max(tau, -ROLL), T_FALL);
const dropAt = (tau) => 0.5 * G * Math.max(clampTau(tau), 0) ** 2;
const ballAt = (tau) => [X0 + V0 * clampTau(tau), Y0, H + RB - dropAt(tau)];
const f1 = (x) => x.toFixed(1), f2 = (x) => x.toFixed(2);

// 3) 부품 놓기
const tw = tower('tower', [-15, Y0], { w: 8, d: 6, h: H });
const rl = groundRuler('ruler', X0, X0 + RANGE, Y0);
const ORDER = ['tower', 'ruler'], BUILD = { start: 0.4, gap: 0.35, drop: 0.35 };
ORDER.forEach((id, i) => { PARTS[id].t = BUILD.start + i * BUILD.gap; });
const T_BALL = BUILD.start + ORDER.length * BUILD.gap;     // 공은 부품 다음에 내려놓임

// 0) 화면 글자
export const INFO = {
  lab: 'LAB 04',
  kit: `${H} m 탑 · 쇠공 · 눈금자 · 느린 화면`,
  intro: ['공을 옆으로 던지면 어디에 떨어질까요?', '가로와 세로를 따로 나눠 살펴봐요'],
  names: { tower: ['탑', [-36, -30]], ruler: ['눈금자', [34, 26]] },
};

// 4) 장 표 ─ 장마다 같은 비행을 다시 보여 주고, 겹쳐 그리는 것만 다르다 (u: 장 안의 시각, U0에 공이 모서리를 떠남)
const U0 = 1.5;
export const CH = [
  { id: 'launch', t0: 2.4, dur: 6.6, chip: '수평으로 던지기', note: ['탑 끝에서 공을 수평으로 던져요.', `처음 속력은 가로 방향뿐이에요 (${f1(V0)} m/s).`] },
  { id: 'x', t0: 9.0, dur: 6.6, chip: '가로 방향', note: ['그림자는 같은 시간마다 같은 거리를 가요.', '가로 방향은 힘이 없어서 속력이 그대로예요.'] },
  { id: 'y', t0: 15.6, dur: 6.6, chip: '세로 방향', note: ['세로로는 가만히 떨어뜨린 공과 같아요.', '같은 시간 간격마다 낙하 거리가 점점 커져요.'] },
  { id: 'v', t0: 22.2, dur: 6.6, chip: '속도 합성', note: ['가로 속도는 그대로, 세로 속도는 커져요.', '두 속도를 합친 방향이 곡선의 접선이에요.'] },
  { id: 'range', t0: 28.8, dur: 7, chip: '도달 거리', note: ['땅에 닿는 시간은 높이만으로 정해져요.', '도달 거리는 가로 속력과 낙하 시간의 곱이에요.'] },
];
const END = CH.at(-1).t0 + CH.at(-1).dur;
export const DUR = END + 0.6;
const chapterAt = (t) => { for (let i = CH.length - 1; i >= 0; i--) if (t >= CH[i].t0) return i; return -1; };
export const TL = { chapters: CH, end: END, chapterAt };

// 카메라: 탑과 눈금자, 비행 전체가 한눈에 들어오게
const whole = () => fitCam([...partPts('tower'), ...partPts('ruler'), ...STROBE.map((t) => V(...ballAt(t)))], 0.8);

// 5) 상태 ─ tau: 모서리를 지난 뒤 흐른 실제 시간(s). 굴러오는 동안은 음수
export function stateAt(t) {
  for (const id of ORDER) { const p = PARTS[id]; p.on = t >= p.t; p.lift = (1 - easeOut(seg(t, p.t, p.t + BUILD.drop))) * 22; }
  const i = chapterAt(t), c = i >= 0 ? CH[i] : null, u = c ? t - c.t0 : 0;
  const tau = c ? (u - U0) / SLOW : -ROLL;
  const s = { t, ch: i, c, u, tau: clampTau(tau) };
  s.ball = { on: t >= T_BALL, lift: (1 - easeOut(seg(t, T_BALL, T_BALL + BUILD.drop))) * 22, p: ballAt(tau) };
  s.cam = whole();
  s.note = c && u > 0.35 ? c.note : null;
  return s;
}

// 6) 아래 칸 ─ [{ tag, html }] 네 개 (표시창 · 가로 방향 · 세로 방향 · 속도 합성)
const BLUE = '#3a46aa', HOT = '#e2632f';
const vr = (n) => `<i class="v">${n}</i>`;
function stripX(tau) {
  const w = 180, a = 8, b = w - 8, px = (m) => a + (m / RANGE) * (b - a);
  let h = `<svg viewBox="0 0 ${w} 34" aria-hidden="true"><line x1="${a}" y1="14" x2="${b}" y2="14" stroke="${INK}" stroke-width="1"/>`;
  for (const t of STROBE) {
    const on = tau >= t - 1e-9, cx = px(V0 * t);
    h += `<circle cx="${cx}" cy="14" r="${on ? 4 : 2.5}" fill="${on ? BLUE : 'none'}" stroke="${INK}" stroke-width="1"/><text x="${cx}" y="30" text-anchor="middle" font-size="8.5" fill="${INK}">${f1(t)}</text>`;
  }
  const cur = px(Math.min(V0 * tau, RANGE));
  return `${h}<path d="M${cur - 3} 1 h6 l-3 5 z" fill="${HOT}" stroke="${INK}" stroke-width=".8"/></svg>`;
}
function stripY(tau) {
  const top = 6, len = 72, py = (d) => top + (d / H) * len;
  let h = `<svg viewBox="0 0 46 86" width="46" height="86" aria-hidden="true"><line x1="14" y1="${top}" x2="14" y2="${top + len}" stroke="${INK}" stroke-width="1"/>`;
  for (const t of STROBE) {
    const on = tau >= t - 1e-9, cy = py(dropAt(t));
    h += `<circle cx="14" cy="${cy}" r="${on ? 4 : 2.5}" fill="${on ? HOT : 'none'}" stroke="${INK}" stroke-width="1"/>`;
    if (t > 0) h += `<text x="24" y="${cy + 3}" font-size="8.5" fill="${INK}">${f1(t)}</text>`;
  }
  const cur = py(Math.min(dropAt(tau), H));
  return `${h}<path d="M2 ${cur - 3} v6 l5 -3 z" fill="${HOT}" stroke="${INK}" stroke-width=".8"/></svg>`;
}
function vectors(tau) {
  const O = [16, 8], k = 2.5, vx = V0 * k, vy = G * Math.max(tau, 0) * k;
  const arrow = (x1, y1, x2, y2, col) => {
    const L = Math.hypot(x2 - x1, y2 - y1); if (L < 1) return '';
    const ux = (x2 - x1) / L, uy = (y2 - y1) / L, hd = Math.min(6, L * 0.5);
    return `<line x1="${x1}" y1="${y1}" x2="${x2 - ux * hd * 0.6}" y2="${y2 - uy * hd * 0.6}" stroke="${col}" stroke-width="2"/><path d="M${x2} ${y2} L${x2 - ux * hd - uy * hd * 0.5} ${y2 - uy * hd + ux * hd * 0.5} L${x2 - ux * hd + uy * hd * 0.5} ${y2 - uy * hd - ux * hd * 0.5} z" fill="${col}"/>`;
  };
  const dash = `stroke="${INK}" stroke-opacity=".35" stroke-dasharray="2 2" stroke-width="1"`;
  return `<svg viewBox="0 0 110 86" width="110" height="86" aria-hidden="true"><circle cx="${O[0]}" cy="${O[1]}" r="3" fill="#c8382c" stroke="${INK}"/>`
    + `<line x1="${O[0] + vx}" y1="${O[1]}" x2="${O[0] + vx}" y2="${O[1] + vy}" ${dash}/><line x1="${O[0]}" y1="${O[1] + vy}" x2="${O[0] + vx}" y2="${O[1] + vy}" ${dash}/>`
    + `${arrow(O[0], O[1], O[0] + vx, O[1], BLUE)}${arrow(O[0], O[1], O[0], O[1] + vy, HOT)}${arrow(O[0], O[1], O[0] + vx, O[1] + vy, INK)}</svg>`;
}
export function bays(s) {
  const c = s.c, tau = Math.max(s.tau, 0), landed = tau >= T_FALL - 1e-9;
  const x = V0 * tau, y = dropAt(tau), vy = G * tau, v = Math.hypot(V0, vy), th = (Math.atan2(vy, V0) * 180) / Math.PI;
  const state = !c ? '준비 중' : s.tau < 0 ? '던지기 전' : landed ? '땅에 닿음' : '날아가는 중';
  const gaps = STROBE.slice(1).map((t, i) => dropAt(t) - dropAt(STROBE[i]));
  const ratio = gaps.map((d) => Math.round(d / gaps[0])).join(' : ');
  return [
    { tag: `느리게 ×${1 / SLOW}`, html: `<div class="lcd"><small>${state}</small><b>${f2(tau)}</b><u>s</u></div>` },
    { tag: '등속 운동', html: `<p class="eq vx">${vr('v')}<sub>x</sub> = ${f1(V0)} m/s</p><p class="eq">${vr('x')} = ${f1(x)} m</p>${stripX(tau)}<small class="cap">점 아래 숫자는 시간이에요 (s).</small>` },
    { tag: '자유 낙하', html: `<div class="split"><div><p class="eq vy">${vr('v')}<sub>y</sub> = ${f1(vy)} m/s</p><p class="eq">${vr('y')} = ${f1(y)} m</p><small class="cap">간격의 비는 ${ratio}</small></div>${stripY(tau)}</div>` },
    { tag: '합성', html: `<div class="split">${vectors(tau)}<div><p class="eq vx">${vr('v')}<sub>x</sub> = ${f1(V0)} m/s</p><p class="eq vy">${vr('v')}<sub>y</sub> = ${f1(vy)} m/s</p><p class="eq">${vr('v')} = ${f1(v)} m/s</p><p class="eq">${vr('θ')} = ${f1(th)}°</p></div></div>` },
  ];
}

// 7) 그리기 ─ 공 · 그림자 · 궤적 · 겹쳐 찍은 공 · 화살표 (깊이 정렬은 엔진이 알아서)
const dot2d = (c, P, r) => { c.beginPath(); c.arc(P.x, P.y, r, 0, TAU); };
function drawBall(p, { ghost = false, alpha = 1 } = {}) {
  item(depth(p) + (ghost ? -0.01 : 0), (c) => {
    const P = proj(p), r = RB * stage.CAM.zoom;
    if (ghost) { c.fillStyle = 'rgba(200,56,44,.16)'; dot2d(c, P, r); c.fill(); c.setLineDash([3, 3]); c.strokeStyle = INK; c.lineWidth = 1.2; c.stroke(); return; }
    const g = c.createRadialGradient(P.x - r * 0.35, P.y - r * 0.35, r * 0.1, P.x, P.y, r);
    g.addColorStop(0, '#f2948a'); g.addColorStop(1, '#c8382c');
    c.fillStyle = g; dot2d(c, P, r); c.fill(); c.strokeStyle = INK; c.lineWidth = 1.6; c.stroke();
  }, alpha);
}
function drawGroundShadow(p) {
  if (p[0] <= X0 + 1e-6) return;        // 탑 위에서는 땅에 그림자가 지지 않음
  item(-900, () => onPlane([p[0], p[1], 0.22], [1, 0, 0], [0, 1, 0], (c) => {
    c.fillStyle = `rgba(40,50,140,${(0.5 - 0.25 * ((p[2] - RB) / H)).toFixed(3)})`; c.beginPath(); c.ellipse(0, 0, RB * 0.95, RB * 0.7, 0, 0, TAU); c.fill();
  }));
}
function dotted(a, b, col = INK, alpha = 0.55) {
  item(Math.min(depth(a), depth(b)) - 0.02, (c) => { const P = proj(a), Q = proj(b); c.setLineDash([2, 3]); c.strokeStyle = col; c.lineWidth = 1.2; c.beginPath(); c.moveTo(P.x, P.y); c.lineTo(Q.x, Q.y); c.stroke(); }, alpha);
}
function arrow3(a, b, col, w = 2.6) {
  item(depth(a) + 0.6, (c) => {
    const P = proj(a), Q = proj(b), L = Math.hypot(Q.x - P.x, Q.y - P.y); if (L < 2) return;
    const ux = (Q.x - P.x) / L, uy = (Q.y - P.y) / L, hd = Math.min(10, L * 0.6);
    c.strokeStyle = col; c.fillStyle = col; c.lineWidth = w; c.setLineDash([]);
    c.beginPath(); c.moveTo(P.x, P.y); c.lineTo(Q.x - ux * hd * 0.7, Q.y - uy * hd * 0.7); c.stroke();
    c.beginPath(); c.moveTo(Q.x, Q.y); c.lineTo(Q.x - ux * hd - uy * hd * 0.5, Q.y - uy * hd + ux * hd * 0.5); c.lineTo(Q.x - ux * hd + uy * hd * 0.5, Q.y - uy * hd - ux * hd * 0.5); c.closePath(); c.fill();
  });
}
const GUIDE_X = -8;                                // 세로 방향을 보는 눈금 기둥 자리
const VK = 0.45;                                   // 속도 화살표: 1 m/s = 0.45 cm
export function buildItems(s) {
  tw.prints(); rl.prints();
  const b = s.ball; if (!b.on) return;
  const id = s.c?.id, tau = s.tau, p = add3(b.p, [0, 0, b.lift]);
  if (b.lift < 0.3) {
    // 궤적: 모서리를 떠난 뒤 지금까지
    if (tau > 0.02) { const pts = Array.from({ length: Math.ceil(tau / 0.05) + 1 }, (_, k) => ballAt(Math.min(tau, k * 0.05))); item(depth(p) - 0.02, (c) => { c.setLineDash([4, 4]); c.strokeStyle = INK; c.lineWidth = 1.4; c.beginPath(); pts.forEach((q, k) => { const P = proj(q); k ? c.lineTo(P.x, P.y) : c.moveTo(P.x, P.y); }); c.stroke(); }, 0.7); }
    if (id === 'x' || id === 'y') for (const t of STROBE) if (tau >= t - 1e-9) {
      const q = ballAt(t); drawBall(q, { ghost: true });
      if (id === 'x') { dotted([q[0], q[1], q[2] - RB], [q[0], q[1], 0.25]); item(-890, () => onPlane([q[0], q[1], 0.23], [1, 0, 0], [0, 1, 0], (c) => { c.fillStyle = BLUE; c.strokeStyle = INK; c.lineWidth = 0.12; c.beginPath(); c.arc(0, 0, 0.42, 0, TAU); c.fill(); c.stroke(); })); }
      else { dotted(q, [GUIDE_X, Y0, q[2]]); item(depth([GUIDE_X, Y0, q[2]]) + 0.5, () => { const P = proj([GUIDE_X, Y0, q[2]]); stage.ctx.fillStyle = HOT; stage.ctx.strokeStyle = INK; stage.ctx.lineWidth = 1.2; dot2d(stage.ctx, P, 4); stage.ctx.fill(); stage.ctx.stroke(); }); }
    }
    if (id === 'y') dotted([GUIDE_X, Y0, 0.25], [GUIDE_X, Y0, H + RB], INK, 0.8);
    if (id === 'range' && tau > 0) { const a = [X0, Y0 + 2.4, 0.3], e = [X0 + V0 * tau, Y0 + 2.4, 0.3]; arrow3(a, e, '#1d2033', 2); }
    drawGroundShadow(b.p);
  }
  drawBall(p);
  if (id === 'v' && b.lift < 0.3 && tau >= 0) {
    const vy = G * tau;
    if (vy > 0.05) { arrow3(p, add3(p, [0, 0, -vy * VK]), HOT); arrow3(p, add3(p, [V0 * VK, 0, -vy * VK]), INK, 2.8); }
    arrow3(p, add3(p, [V0 * VK, 0, 0]), BLUE);
  }
}

// 8) 이름표: [글, 위치, 화면 밀림(px)]
export function labelsFor(s) {
  const c = s.c, b = s.ball, tau = s.tau, p = b.p;
  if (!c) return b.on && b.lift < 0.3 ? [['쇠공', p, [30, -34]]] : [];
  if (c.id === 'launch') return s.u > 0.6 ? [['던지는 곳', A('tower.edge'), [48, -30]]] : [];
  if (c.id === 'x') return STROBE.filter((t) => tau >= t - 1e-9).map((t) => [`${f1(V0 * t)} m`, [X0 + V0 * t, Y0, 0.3], [0, 24]]);
  if (c.id === 'y') return s.u > 0.6 ? [['낙하 거리', [GUIDE_X, Y0, H * 0.55], [-52, 0]]] : [];
  if (c.id === 'v') {
    if (tau < 0.4 || tau >= T_FALL - 1e-9) return [];
    const vy = G * tau;
    return [['가로 속도', add3(p, [V0 * VK * 0.6, 0, 0]), [30, -26]], ['세로 속도', add3(p, [0, 0, -vy * VK * 0.6]), [-52, 4]], ['합친 속도', add3(p, [V0 * VK, 0, -vy * VK]), [48, 22]]];
  }
  if (c.id === 'range' && tau > 0.05) return [[`도달 거리 ${f1(V0 * tau)} m`, [X0 + (V0 * tau) / 2, Y0 + 2.4, 0.3], [0, 30]]];
  return [];
}
