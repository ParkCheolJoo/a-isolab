// A형 기본 틀 — 부품 도서관. 부품마다 (1) 몸체(Zdog) (2) 접점 앵커 (3) 매 순간 그리는 깊이 항목(다리·인쇄)을 가진다.
// 규칙
//  · 꽂히는 것(다리·플러그·프로브 끝)은 반드시 앵커 위치에서 시작/끝난다. 좌표를 직접 쓰지 않는다.
//  · 다리는 구멍(z = 판 윗면)에서 몸체 바닥까지 이어져야 한다 → 떠 보이지 않음.
//  · 브레드보드 구멍 인쇄도 앵커와 같은 함수로 찍는다 → 인쇄 구멍과 실제 꽂힘 자리가 어긋나지 않음.
import {
  INK, V, prism, shape, strokeShape, rect, rrect, circle, part, anchor, A, decal, tube, rod, item, depth, partDepth, partReady,
  onPlane, add3, lerp, TAU, Zdog, PARTS, bezier, stage, proj, anchorInfo,
} from './engine.js';

// 꽂기·연결 규칙과 회로 계산은 board.js. 부품은 만들 때 register()로 "어느 다리가 어느 구멍에"를 등록한다.
import { register } from './board.js';

// ───────── 디지털 멀티미터 ─────────
export const MMH = 3.8;
export const JACK = { '10A': -3, mA: -1, COM: 1, V: 3 };
export const JY = 7.55;
export const DIAL = { x: 0, y: 1.2, r: 3.4 };
export const DIAL_ANG = { OFF: -2.618, VAC: -2.094, VDC: -1.571, OHM: -0.524, CAP: 0, HZ: 0.524, TEMP: 1.047, mA: 2.094 };
export function multimeter(id = 'dmm') {
  const g = part(id, { at: [0, 0], foot: rrect(0, 0, 9.4, 18.8, 1.6), h: MMH });
  prism(g, rrect(0, 0, 9.4, 18.8, 1.6), 0, MMH, '#e4663a', { top: '#e4663a', w: 1.3 });
  prism(g, rrect(0, 0.2, 8.0, 17.2, 1.1), MMH, MMH + 0.12, '#2b2d36', { top: '#2d2f38' });
  prism(g, rrect(0, -6.1, 6.6, 4.6, 0.6), MMH + 0.12, MMH + 0.2, '#1a1b21', { top: '#1c1d23' });
  shape(g, rect(0, -6.1, 5.8, 3.8).map(([x, y]) => V(x, y, MMH + 0.21)), '#c8d4a4');
  for (let i = 0; i < 4; i++) prism(g, rrect(-2.7 + i * 1.8, -2.75, 1.5, 0.7, 0.2, 2), MMH + 0.12, MMH + 0.4, '#3d404b', { w: 0.8 });
  prism(g, circle(DIAL.x, DIAL.y, DIAL.r + 0.25), MMH + 0.12, MMH + 0.3, '#3a3c45', { w: 0.9 });
  prism(g, circle(DIAL.x, DIAL.y, DIAL.r - 0.6), MMH + 0.3, MMH + 1.3, '#2e3038', { top: '#3b3d47', w: 1.1 });
  const dialBar = new Zdog.Shape({ addTo: g, path: [{ x: 0, y: 0, z: -(DIAL.r - 0.95) }, { x: 0, y: 0, z: DIAL.r - 0.95 }], translate: V(DIAL.x, DIAL.y, MMH + 1.34), stroke: 0.95, color: '#24262d' });
  for (const [k, x] of Object.entries(JACK)) {
    prism(g, circle(x, JY, 0.62, 18), MMH + 0.12, MMH + 0.36, k === 'COM' ? '#26272d' : '#b8332b', { top: k === 'COM' ? '#3a3b42' : '#cf3d33', w: 0.8 });
    shape(g, circle(x, JY, 0.27, 12).map(([a, b]) => V(a, b, MMH + 0.37)), '#0f0f12');
    anchor(`${id}.${k}`, [x, JY, MMH + 0.36], { kind: 'jack' }); // 플러그가 꽂히는 구멍 입구
  }
  anchor(`${id}.lcd`, [0, -6.1, MMH + 0.21]);
  anchor(`${id}.dial`, [DIAL.x, DIAL.y, MMH + 1.3]);
  anchor(`${id}.buttons`, [0, -2.75, MMH + 0.4]);
  const pts = [-4.7, 4.7].flatMap((x) => [-9.4, 9.4].flatMap((y) => [V(x, y, 0), V(x, y, MMH)]));
  return {
    id, pts,
    setDial(a) { dialBar.rotate.y = -a; },
    /** 표시창·단자 이름·다이얼 기호·버튼 이름 (부품 바로 다음에 그림) */
    prints(lcd, dialAng) {
      decal(id, () => {
        onPlane([-2.9, -8.0, MMH + 0.22], [1, 0, 0], [0, 1, 0], (c) => {
          c.fillStyle = '#1f2420';
          if (lcd.mode || lcd.auto) { c.font = '600 0.55px "JetBrains Mono"'; c.fillText(`${lcd.auto ? '자동 ' : ''}${lcd.mode || ''}`, 0.3, 0.75); }
          if (lcd.v) {
            c.font = '700 1.85px "JetBrains Mono"'; c.textAlign = 'right'; c.fillText((lcd.neg ? '-' : '') + lcd.v, 5.05, 3.2);
            c.font = '600 0.7px "JetBrains Mono"'; c.textAlign = 'left'; c.fillText(lcd.unit || '', 5.1, 3.2);
          }
        });
        onPlane([0, JY + 1.05, MMH + 0.13], [1, 0, 0], [0, 1, 0], (c) => {
          c.font = '600 0.42px "JetBrains Mono"'; c.textAlign = 'center'; c.fillStyle = '#e9e7df';
          for (const [k, x] of Object.entries(JACK)) c.fillText(k === 'V' ? 'VΩHz' : k, x, 0.15);
        });
        onPlane([DIAL.x, DIAL.y, MMH + 0.13], [1, 0, 0], [0, 1, 0], (c) => {
          c.font = '600 0.5px "JetBrains Mono"'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#e9e7df';
          const LAB = { OFF: 'OFF', VAC: 'V~', VDC: 'V⎓', OHM: 'Ω', CAP: '⊣⊢', HZ: 'Hz', TEMP: '°C', mA: 'mA' };
          for (const [k, a] of Object.entries(DIAL_ANG)) { const R = DIAL.r + 0.85; c.fillText(LAB[k], Math.sin(a) * R, -Math.cos(a) * R); }
          c.fillStyle = '#c9e46a'; const a = dialAng, R = DIAL.r - 0.15;
          c.beginPath(); c.moveTo(Math.sin(a) * (R + 0.3), -Math.cos(a) * (R + 0.3)); c.lineTo(Math.sin(a + 0.12) * (R - 0.5), -Math.cos(a + 0.12) * (R - 0.5)); c.lineTo(Math.sin(a - 0.12) * (R - 0.5), -Math.cos(a - 0.12) * (R - 0.5)); c.fill();
        });
        onPlane([-3.6, -2.75, MMH + 0.41], [1, 0, 0], [0, 1, 0], (c) => {
          c.font = '600 0.32px "JetBrains Mono"'; c.fillStyle = '#e9e7df'; c.textAlign = 'center';
          ['HOLD', 'SELECT', 'RANGE', 'REL'].forEach((b, i) => c.fillText(b, 0.9 + i * 1.8, 0.1));
        });
      });
    },
  };
}

// ───────── 바나나 플러그 + 시험 프로브 (선 포함) ─────────
const PLUG_H = 1.5;
/** 잭 앵커에 꽂힌 플러그. jackFrom→jackTo 사이를 k(0~1)로 옮기는 중이면 들어 올렸다 내림 */
export function plugTop(jackFrom, jackTo = jackFrom, k = 0) {
  const a = A(jackFrom), b = A(jackTo); const lift = Math.sin(Math.PI * k) * 2.5;
  const base = [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k) + lift];
  return { base, top: add3(base, [0, 0, PLUG_H]) };
}
export function drawPlug(pl, color, alpha = 1) {
  tube(rod(add3(pl.base, [0, 0, -0.25]), add3(pl.base, [0, 0, 0.35]), 0.3), 0.42, '#b9bcc4', { alpha, bias: 0.01 }); // 금속 목 (잭 안으로 0.25 들어감)
  tube(rod(add3(pl.base, [0, 0, 0.35]), pl.top, 0.4), 0.62, color, { alpha, bias: 0.02 });
}
/**
 * 프로브: tip(접촉점)에서 축 ax 방향으로 금속 끝 → 손가락 보호대 → 손잡이 → 꼬리. 선은 꼬리에서 플러그 위로.
 * 길이(cm): 금속 2.2 · 손잡이 7.8 · 꼬리 0.8
 */
export function drawProbe(tip, ax, color, plug, { alpha = 1, slack = [0, 3, 6] } = {}) {
  const at = (k) => add3(tip, ax, k);
  tube(rod(tip, at(2.2), 0.4), 0.13, '#c3c6cd', { alpha, inkW: 1.6 });
  tube(rod(at(2.2), at(10), 0.5), 0.78, color, { alpha });
  const g = at(2.7), gx = [ax[1], -ax[0], 0]; const gl = Math.hypot(gx[0], gx[1]) || 1;
  tube([add3(g, gx, -0.55 / gl), add3(g, gx, 0.55 / gl)], 0.3, color, { alpha, bias: 0.05 }); // 손가락 보호대
  tube(rod(at(10), at(10.8), 0.4), 0.42, color, { alpha });
  const tail = at(10.8);
  tube(bezierPts(tail, add3(tail, ax, 3.5), add3(plug.top, slack), plug.top), 0.3, color, { alpha });
}
const bezierPts = (a, b, c, d) => bezier(a, b, c, d, 0.45);

// ───────── 9 V 건전지 ─────────
export function battery9v(id = 'pila', at = [-12, 9], { emf = 9.42, rint = 1.5 } = {}) {
  const [x, y] = at;
  part(id, { at, foot: rect(x, y, 2.65, 1.75), h: 4.85 });
  const g = PARTS[id].g;
  prism(g, rrect(x, y, 2.65, 1.75, 0.25, 2), 0, 3.6, '#bcd75a', { w: 1.2 });
  prism(g, rrect(x, y, 2.65, 1.75, 0.25, 2), 3.6, 4.85, '#2c2e36', { top: '#3a3c45', w: 1.2 });
  prism(g, circle(x, y - 0.62, 0.36, 16), 4.85, 5.3, '#c9ccd3', { top: '#e8eaee', w: 0.8 }); // + (작은 원형)
  prism(g, circle(x, y + 0.62, 0.46, 6), 4.85, 5.25, '#b9bcc4', { top: '#dfe1e6', w: 0.8 });   // − (큰 육각)
  anchor(`${id}.+`, [x, y - 0.62, 5.3], { kind: 'terminal' }); anchor(`${id}.-`, [x, y + 0.62, 5.25], { kind: 'terminal' });
  register(id, 'battery', { '+': `${id}.+`, '-': `${id}.-` }, { emf, rint });
  return {
    prints() {
      decal(id, () => onPlane([x - 1.3, y + 0.88, 0.4], [1, 0, 0], [0, 0, -1], (c) => {
        c.fillStyle = INK; c.font = '700 1.0px "JetBrains Mono"'; c.textAlign = 'center'; c.fillText('9V', 1.32, -1.75); c.font = '600 0.3px "JetBrains Mono"'; c.fillText('ALKALINE', 1.32, -1.2);
      }));
    },
  };
}

// ───────── 멀티탭 (콘센트 3구) ─────────
export function powerStrip(id = 'strip', at = [-7, 23]) {
  const [x, y] = at; const SOCK = [-4.2, 0.5, 5.2].map((d) => x + d);
  const g = part(id, { at, foot: rrect(x, y, 17, 5.6, 1.2), h: 3.3 });
  strokeShape(g, [V(x - 8.4, y, 1.6), { bezier: [V(x - 12, y, 1.6), V(x - 14, y - 2, 0.4), V(x - 23, y - 3, 0.4)] }], '#f1f0ec', 7);
  prism(g, rrect(x, y, 17, 5.6, 1.2), 0, 3.3, '#f1f0ec', { w: 1.2 });
  SOCK.forEach((sx, i) => {
    prism(g, rrect(sx, y, 3.8, 4.0, 0.7, 3), 3.3, 3.4, '#e6e5e0', { w: 0.8 });
    for (const [dx, nm] of [[-0.62, 'L'], [0.62, 'N']]) {
      shape(g, rect(sx + dx, y - 0.1, 0.2, 0.95).map(([a, b]) => V(a, b, 3.41)), '#26272d');
      anchor(`${id}.${i + 1}.${nm}`, [sx + dx, y - 0.1, 3.0]); // 슬롯 안 0.4 cm
    }
    shape(g, circle(sx, y + 1.2, 0.28, 10).map(([a, b]) => V(a, b, 3.41)), '#26272d');
  });
  prism(g, rrect(x + 7.9, y, 1.5, 2.6, 0.3, 2), 3.3, 3.75, '#d8483a', { w: 0.9 });
}

// ───────── 브레드보드 (반 크기: 30열 × a~j, 피치 0.254 cm = 0.1 in) ─────────
// 구멍 위치는 보드 중심에서 잰 값. 가운데 홈(y = 0)을 사이에 두고 a~e / f~j, 바깥에 전원 줄 2개씩.
export const BB = { w: 8.3, d: 5.5, top: 0.86, pitch: 0.254 };
const ROWS = { a: -1.52, b: -1.27, c: -1.01, d: -0.76, e: -0.51, f: 0.51, g: 0.76, h: 1.02, i: 1.27, j: 1.52 };
const RAILS = { 'L-': -2.4, 'L+': -2.14, 'R+': 2.14, 'R-': 2.4 };
const colOff = (n) => -1.65 + (n - 9) * BB.pitch;   // 9열이 중심에서 −1.65 cm
export function breadboard(id = 'bb', at = [10, 21]) {
  const [cx, cy] = at; const colX = (n) => cx + colOff(n);
  const g = part(id, { at, foot: rect(cx, cy, BB.w, BB.d), h: BB.top, flat: true });
  prism(g, rrect(cx, cy, BB.w, BB.d, 0.3, 2), 0, BB.top, '#f3f1ea', { w: 1.1 });
  const x0 = colX(1) - 0.2, x1 = colX(30) + 0.2;
  shape(g, [V(x0, cy + RAILS['L-'] - 0.2, BB.top + 0.01), V(x1, cy + RAILS['L-'] - 0.2, BB.top + 0.01)], '#3456c4', { fill: false, closed: false, w: 1 });
  shape(g, [V(x0, cy + RAILS['L+'] + 0.2, BB.top + 0.01), V(x1, cy + RAILS['L+'] + 0.2, BB.top + 0.01)], '#d23b33', { fill: false, closed: false, w: 1 });
  shape(g, [V(x0, cy + RAILS['R+'] - 0.2, BB.top + 0.01), V(x1, cy + RAILS['R+'] - 0.2, BB.top + 0.01)], '#d23b33', { fill: false, closed: false, w: 1 });
  shape(g, [V(x0, cy + RAILS['R-'] + 0.2, BB.top + 0.01), V(x1, cy + RAILS['R-'] + 0.2, BB.top + 0.01)], '#3456c4', { fill: false, closed: false, w: 1 });
  shape(g, [V(x0, cy, BB.top + 0.01), V(x1, cy, BB.top + 0.01)], '#1d203330', { fill: false, closed: false, w: 2.2 }); // 가운데 홈
  const holes = [];
  for (let n = 1; n <= 30; n++) for (const [r, y] of Object.entries(ROWS)) holes.push(anchor(`${id}.${r}${n}`, [colX(n), cy + y, BB.top], { kind: 'hole', strip: `${n}${r <= 'e' ? 'L' : 'R'}` }));
  for (const [r, y] of Object.entries(RAILS)) for (let n = 1; n <= 30; n++) if (n % 6 !== 0) holes.push(anchor(`${id}.${r}${n}`, [colX(n), cy + y, BB.top], { kind: 'hole', strip: r })); // 전원 줄: 5칸마다 한 칸 비움
  return {
    prints() {
      decal(id, (c) => {
        c.fillStyle = '#1d203366';
        const s = Math.max(1, 0.1 * stage.CAM.zoom);
        for (const h of holes) { const p = proj(h); c.fillRect(p.x - s / 2, p.y - s / 2, s, s); }
      });
    },
  };
}

/** 다리 하나: 구멍 앵커에서 몸체 바닥점까지 (꺾인 다리도 됨) */
function leg(hole, ...via) { tube([A(hole), ...via].flatMap((p, i, arr) => (i ? rod(arr[i - 1], p, 0.3).slice(1) : [p])), 0.07, '#9a9da5', { inkW: 1.2, bias: 0.02 }); }

// ───────── 저항 (축 방향 리드, 두 구멍 사이에 눕힘) ─────────
export function resistor(id, holeA, holeB, { ohms = 220, bands = colorBands(ohms), z = 1.1, alone = false } = {}) {
  const a = A(holeA), b = A(holeB);
  part(id, { at: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], foot: rect((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, Math.abs(b[0] - a[0]) + 0.2, 0.4), h: z + 0.2, shadow: false });
  anchor(`${id}.1`, [a[0], a[1], (BB.top + z) / 2], { kind: 'leg' }); anchor(`${id}.2`, [b[0], b[1], (BB.top + z) / 2], { kind: 'leg' });
  register(id, 'resistor', { 1: holeA, 2: holeB }, { ohms, alone }); // alone: 따로 재려고 꽂아 둔 부품 (떠 있는 다리 경고 안 함)
  return {
    draw() {
      if (!partReady(id)) return;
      const ua = [a[0], a[1], z], ub = [b[0], b[1], z];
      leg(holeA, ua); leg(holeB, ub);
      // 실제 크기: 1/4 W 탄소피막 저항 몸통 6.3 mm × 지름 2.4 mm, 가운데에 놓고 리드는 몸통 끝에서 구멍 위로
      const L = Math.hypot(b[0] - a[0], b[1] - a[1]), k0 = 0.5 - Math.min(0.45, 0.315 / L), k1 = 1 - k0;
      const m1 = [lerp(a[0], b[0], k0), lerp(a[1], b[1], k0), z], m2 = [lerp(a[0], b[0], k1), lerp(a[1], b[1], k1), z];
      tube([ua, m1], 0.06, '#9a9da5', { inkW: 1.2 }); tube([m2, ub], 0.06, '#9a9da5', { inkW: 1.2 });
      tube(rod(m1, m2, 0.2), 0.24, '#d9c9a3', { bias: 0.01 });
      item(depth(m1.map((v, i) => (v + m2[i]) / 2)) + 0.03, (c) => {
        const P = proj(m1), Q = proj(m2); const dx = Q.x - P.x, dy = Q.y - P.y, L = Math.hypot(dx, dy) || 1; const h = 0.13 * stage.CAM.zoom;
        bands.forEach((col, i) => { const k = [0.22, 0.38, 0.54, 0.8][i]; const p = { x: lerp(P.x, Q.x, k), y: lerp(P.y, Q.y, k) };
          c.strokeStyle = col; c.lineWidth = Math.max(1.2, 0.07 * stage.CAM.zoom); c.beginPath(); c.moveTo(p.x - (dy / L) * h, p.y + (dx / L) * h); c.lineTo(p.x + (dy / L) * h, p.y - (dx / L) * h); c.stroke(); });
      });
    },
  };
}

// ───────── LED (지름 5 mm 원통 + 둥근 머리, 다리 2개가 몸체 바닥에서 구멍으로) ─────────
export function led(id, holeK, holeA, { color = '#c8382c', z0 = 1.6, vf = 2.0 } = {}) {
  const k = A(holeK), a = A(holeA); const cx = (k[0] + a[0]) / 2, cy = (k[1] + a[1]) / 2;
  const g = part(id, { at: [cx, cy], foot: rect(cx, cy, 0.6, 0.6), h: z0 + 0.95, shadow: false });
  prism(g, circle(cx, cy, 0.33, 16), z0, z0 + 0.12, color, { w: 0.8 });        // 테
  const top = prism(g, circle(cx, cy, 0.28, 16), z0 + 0.12, z0 + 0.7, color, { top: color, w: 0.8 });
  const dome = new Zdog.Shape({ addTo: g, translate: V(cx, cy, z0 + 0.7), stroke: 0.56, color });
  anchor(`${id}.K`, [k[0], k[1], (BB.top + z0) / 2], { kind: 'leg' }); anchor(`${id}.A`, [a[0], a[1], (BB.top + z0) / 2], { kind: 'leg' }); // 다리 가운데
  register(id, 'led', { A: holeA, K: holeK }, { vf });
  return {
    setGlow(v) { const col = v > 0.5 ? '#ff7a5c' : v > 0 ? '#f0573f' : color; top.color = col; dome.color = col; },
    draw(glow = 0) {
      if (!partReady(id)) return;
      leg(holeK, [k[0], k[1], z0]); leg(holeA, [a[0], a[1], z0]);
      if (glow > 0) item(depth([cx, cy, z0 + 0.7]) + 0.5, (c) => { const p = proj([cx, cy, z0 + 0.6]); const R = 1.6 * stage.CAM.zoom; const gr = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, R); gr.addColorStop(0, `rgba(255,90,60,${0.55 * glow})`); gr.addColorStop(1, 'rgba(255,90,60,0)'); c.fillStyle = gr; c.beginPath(); c.arc(p.x, p.y, R, 0, TAU); c.fill(); });
    },
  };
}

// ───────── 전해 축전기 (세운 원통, − 띠) ─────────
export function capacitor(id, holeNeg, holePos, { z0 = 1.3, h = 1.3, r = 0.34, label = '100 µF', uF = 100 } = {}) {
  const n = A(holeNeg), p = A(holePos); const cx = (n[0] + p[0]) / 2, cy = (n[1] + p[1]) / 2;
  const g = part(id, { at: [cx, cy], foot: rect(cx, cy, 0.7, 0.7), h: z0 + h, shadow: false });
  prism(g, circle(cx, cy, r, 18), z0, z0 + h, '#3d5fc4', { top: '#9fb3e8', w: 0.9 });
  // − 띠: 음극 쪽 옆면에 밝은 줄
  const ang = Math.atan2(n[1] - cy, n[0] - cx);
  shape(g, [V(cx + Math.cos(ang - 0.35) * (r + 0.005), cy + Math.sin(ang - 0.35) * (r + 0.005), z0 + 0.05), V(cx + Math.cos(ang + 0.35) * (r + 0.005), cy + Math.sin(ang + 0.35) * (r + 0.005), z0 + 0.05), V(cx + Math.cos(ang + 0.35) * (r + 0.005), cy + Math.sin(ang + 0.35) * (r + 0.005), z0 + h - 0.05), V(cx + Math.cos(ang - 0.35) * (r + 0.005), cy + Math.sin(ang - 0.35) * (r + 0.005), z0 + h - 0.05)], '#c9d4f2');
  anchor(`${id}.-`, [n[0], n[1], (BB.top + z0) / 2], { kind: 'leg' }); anchor(`${id}.+`, [p[0], p[1], (BB.top + z0) / 2], { kind: 'leg' });
  register(id, 'capacitor', { '+': holePos, '-': holeNeg }, { uF });
  return { label, draw() { if (!partReady(id)) return; leg(holeNeg, [n[0], n[1], z0]); leg(holePos, [p[0], p[1], z0]); } };
}

// ───────── 누름 버튼 (6 mm 택트 스위치, 가운데 홈을 걸쳐 4다리) ─────────
export function pushButton(id, holes /* [e22, e25, f22, f25]: a1·b1은 e행, a2·b2는 f행 */) {
  register(id, 'button', { a1: holes[0], b1: holes[1], a2: holes[2], b2: holes[3] });
  const P = holes.map(A); const cx = P.reduce((s, p) => s + p[0], 0) / 4, cy = P.reduce((s, p) => s + p[1], 0) / 4;
  const w = Math.abs(P[1][0] - P[0][0]) + 0.1, d = Math.abs(P[2][1] - P[0][1]) - 0.15;
  const g = part(id, { at: [cx, cy], foot: rect(cx, cy, w, d), h: BB.top + 0.5, shadow: false });
  prism(g, rect(cx, cy, w, d), BB.top, BB.top + 0.35, '#2a2b31', { w: 0.8 });
  const cap = new Zdog.Group({ addTo: g });
  prism(cap, circle(cx, cy, 0.24, 12), BB.top + 0.35, BB.top + 0.55, '#3c3e47', { w: 0.6 });
  return { press(k) { cap.translate.y = 0.12 * k; } };
}

// ───────── Arduino UNO (암 헤더: 디지털 열 x = 25.3, 전원 열 x = 20.75) ─────────
export const UNO_DIG = (() => { // 위(+y)에서 아래로: GND·D13~D8, 틈, D7~D0
  const out = { AREF: 15.0, GND: 14.75 }; for (let k = 13; k >= 8; k--) out[`D${k}`] = 14.75 - (14 - k) * 0.254;
  for (let k = 7; k >= 0; k--) out[`D${k}`] = 12.7 - (7 - k) * 0.254; return out;
})();
export const UNO_PWR = { IOREF: 15.2, RESET: 14.95, '3V3': 14.7, '5V': 14.44, GND1: 14.19, GND2: 13.93, VIN: 13.68 };
export function arduinoUno(id = 'uno', at = [23, 13]) {
  const [x, y] = at;
  const g = part(id, { at, foot: rect(x, y, 6.9, 5.35), h: 1.2, flat: true });
  prism(g, rrect(x, y, 6.9, 5.35, 0.3, 2), 0.1, 0.26, '#2864b8', { top: '#2f6fca', w: 1 });
  prism(g, rect(25.3, 13.0, 0.55, 4.4), 0.26, 1.06, '#23242a', { w: 0.8 });
  prism(g, rect(20.75, 14.45, 0.55, 2.2), 0.26, 1.06, '#23242a', { w: 0.8 });
  prism(g, rect(22.6, 10.95, 1.6, 1.3), 0.26, 1.35, '#b7bac2', { w: 0.9 });
  prism(g, rect(20.9, 10.9, 1.1, 1.4), 0.26, 1.35, '#26272d', { w: 0.9 });
  prism(g, rect(22.4, 14.2, 3.4, 0.9), 0.26, 0.55, '#1e1f24', { w: 0.8 });
  const net = (nm) => (/^GND/.test(nm) ? { net: `${id}:GND` } : {});
  for (const [nm, py] of Object.entries(UNO_DIG)) anchor(`${id}.${nm}`, [25.3, py, 0.95], { kind: 'socket', ...net(nm) });
  for (const [nm, py] of Object.entries(UNO_PWR)) anchor(`${id}.${nm}`, [20.75, py, 0.95], { kind: 'socket', ...net(nm) });
  // 전원 핀: solve({ on: { 'uno.D13': true } })처럼 켠 핀만 5 V 원천이 됨
  for (const nm of [...Object.keys(UNO_DIG).filter((k) => /^D/.test(k)), '5V', '3V3']) register(`${id}.${nm}`, 'pin', { out: `${id}.${nm}`, gnd: `${id}.GND` }, { volts: nm === '3V3' ? 3.3 : 5 });
  return {
    prints(on, pin13) {
      decal(id, (c) => {
        const s = Math.max(1, 0.11 * stage.CAM.zoom); c.fillStyle = '#0c0c0f';
        for (const py of Object.values(UNO_DIG)) { const p = proj([25.3, py, 1.06]); c.fillRect(p.x - s / 2, p.y - s / 2, s, s); }
        for (const py of Object.values(UNO_PWR)) { const p = proj([20.75, py, 1.06]); c.fillRect(p.x - s / 2, p.y - s / 2, s, s); }
        onPlane([21.0, 11.6, 0.27], [1, 0, 0], [0, 1, 0], (cc) => { cc.fillStyle = '#e9eef8'; cc.font = '700 0.6px "JetBrains Mono"'; cc.fillText('UNO', 0, 1.6); });
        if (on) {
          const pw = proj([24.9, 11.2, 0.3]); c.fillStyle = '#7dff6a'; c.beginPath(); c.arc(pw.x, pw.y, 0.14 * stage.CAM.zoom, 0, TAU); c.fill();
          if (pin13) { const p = proj([24.2, 12.0, 0.3]); c.fillStyle = '#ffb347'; c.beginPath(); c.arc(p.x, p.y, 0.16 * stage.CAM.zoom, 0, TAU); c.fill(); }
        }
      });
    },
  };
}

// ───────── 점퍼선 (수-수 듀폰: 한쪽은 헤더 소켓에, 한쪽은 브레드보드 구멍에) ─────────
/**
 * 전선 (등록 + 그리기). 끝마다 규칙:
 *  - 구멍·소켓: 끝이 수직으로 0.1 cm 들어가 꽂힘. 듀폰선이면 검은 껍데기(0.6 cm)가 서 있음
 *  - 건전지 단자: 스냅 집게가 단자 위에 얹힘
 *  - 같은 보드의 가까운 두 구멍(3 cm 미만): 판에 붙인 "평선"(점프 와이어 키트처럼 ㄷ자로 꺾임)
 *  - 그 밖: 위로 둥글게 휜 선 (arc = 휘는 높이)
 * 반환: { id, draw(k) } — k는 나타나는 정도(0~1)
 */
export function wire(id, from, to, color = '#2b2c33', { arc = 2.4, style = 'auto', dupont = true } = {}) {
  register(id, 'wire', { a: from, b: to });
  const a = A(from), b = A(to), ka = anchorInfo(from)?.kind, kb = anchorInfo(to)?.kind;
  const flat = style === 'flat' || (style === 'auto' && ka === 'hole' && kb === 'hole' && from.split('.')[0] === to.split('.')[0] && Math.hypot(a[0] - b[0], a[1] - b[1]) < 3);
  const endTop = (p, k) => add3(p, [0, 0, k === 'terminal' ? 0.25 : flat ? 0.12 : dupont ? 0.6 : 0.3]);
  return {
    id,
    draw(k = 1) {
      if (k <= 0) return;
      const aT = endTop(a, ka), bT = endTop(b, kb);
      for (const [p, kind, top] of [[a, ka, aT], [b, kb, bT]]) {
        if (kind === 'terminal') { tube([add3(p, [0, 0, -0.05]), top], 0.42, '#b9bcc4', { alpha: k, bias: 0.01 }); continue; } // 스냅 집게
        if (!flat && dupont) tube(rod(add3(p, [0, 0, -0.1]), top, 0.3), 0.26, '#26272d', { alpha: k, bias: 0.01 });   // 듀폰 껍데기
        else tube([add3(p, [0, 0, -0.1]), top], 0.09, '#9a9da5', { alpha: k, inkW: 1.2 });                          // 벗긴 심선 끝
      }
      if (flat) tube(rod(aT, bT, 0.3), 0.14, color, { alpha: k });
      else tube(bezier(aT, add3(aT, [0, 0, arc]), add3(bT, [0, 0, arc]), bT, 0.45), 0.2, color, { alpha: k });
    },
  };
}

/** 저항값 → 색띠 4개 (두 자리 + 승수 + 금색 ±5 %) */
export function colorBands(ohms) {
  const C = ['#1d1d1f', '#7a4a26', '#c8382c', '#e8822e', '#e8c63a', '#3f9a4a', '#3a5fc4', '#7b4fb0', '#8a8a8f', '#f2f2f2'];
  const e = Math.floor(Math.log10(ohms)) - 1, d = Math.round(ohms / 10 ** e);
  return [C[Math.floor(d / 10) % 10], C[d % 10], C[Math.max(0, e)], '#c9a227'];
}

// ───────── 커피잔 ─────────
export function mug(id = 'taza', at = [13, -12], { h = 9.6, r = 4.2 } = {}) {
  const [x, y] = at;
  const g = part(id, { at, foot: circle(x, y, r), h });
  prism(g, circle(x, y, r, 36), 0, h, '#f4f3ef', { top: '#f4f3ef', w: 1.3 });
  const handle = [V(x, y + r + 0.1, h - 2.2), { arc: [V(x, y + 6.5, h - 2.2), V(x, y + 6.5, h - 4.5)] }, { arc: [V(x, y + 6.5, h - 6.8), V(x, y + r + 0.1, h - 6.8)] }];
  strokeShape(g, handle, INK, 9.5); strokeShape(g, handle, '#f4f3ef', 7.2);
  shape(g, circle(x, y, r - 0.45, 36).map(([a, b]) => V(a, b, h - 0.2)), '#3a2618');
  shape(g, circle(x, y, r - 0.45, 36).map(([a, b]) => V(a, b, h - 0.2)), INK, { fill: false, w: 0.8 });
  anchor(`${id}.coffee`, [x + 0.4, y + 0.4, h - 0.2]);
  return {
    steam(t) {
      if (!partReady(id)) return;
      item(depth([x, y, h + 3]), (c) => {
        c.strokeStyle = '#1d203338'; c.lineWidth = 1.6;
        for (let k = 0; k < 3; k++) { c.beginPath(); for (let i = 0; i <= 20; i++) { const ph = t * 2.2 + k * 2 + i * 0.4; const p = proj([x + (k - 1) * 1.3 + Math.sin(ph) * 0.45, y + (k - 1) * 0.4, h + 0.4 + i * 0.25]); i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y); } c.stroke(); }
      });
    },
  };
}

// ───────── K형 열전대 (두 잭에 걸친 노란 플러그 + 노란 선 + 금속 탐침) ─────────
export function thermocouple(meterId, tip, { alpha = 1 } = {}) {
  const a = A(`${meterId}.COM`), b = A(`${meterId}.V`);
  const z0 = a[2] + 0.04, z1 = a[2] + 1.15, y0 = a[1] - 0.75, y1 = a[1] + 0.75, x0 = a[0] - 0.8, x1 = b[0] + 0.8;
  item(depth([(x0 + x1) / 2, a[1], z1]) + 0.2, (c) => {
    const box = (z) => [[x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z]].map(proj);
    const top = box(z1), bot = box(z0);
    c.lineWidth = 1.4; c.strokeStyle = INK;
    c.fillStyle = '#d9a92f'; c.beginPath(); [bot[3], bot[2], top[2], top[3]].forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y))); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#e8b93a'; c.beginPath(); [bot[2], bot[1], top[1], top[2]].forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y))); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#f2c94c'; c.beginPath(); top.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y))); c.closePath(); c.fill(); c.stroke();
    const kc = proj([(x0 + x1) / 2, a[1], z1]); c.fillStyle = INK; c.font = `700 ${0.7 * stage.CAM.zoom}px "JetBrains Mono"`; c.textAlign = 'center'; c.fillText('K', kc.x, kc.y + 0.25 * stage.CAM.zoom);
  }, alpha);
  const out = [(x0 + x1) / 2, y0 - 0.1, (z0 + z1) / 2];
  const stem = add3(tip, [0, 0, 3.2]);
  tube(bezier(out, add3(out, [0, -4, 5]), add3(stem, [0, 3, 5]), stem, 0.5), 0.2, '#f2c94c', { alpha });
  tube(rod(stem, tip, 0.4), 0.12, '#c9ccd3', { alpha, inkW: 1.6 });
}

// ───────── 탑 (수평으로 던지는 자리): 앞 벽에 높이 눈금 ─────────
// at: 발자국 중심 · w×d: 윗면 크기 · h: 높이(m를 cm 눈금에 1 : 1로 둠) · 앵커 `${id}.edge` 는 던지는 모서리(+x 쪽) 윗면 가운데
export function tower(id = 'tower', at = [-15, 12], { w = 8, d = 6, h = 19.6, major = 5 } = {}) {
  const [x, y] = at;
  const g = part(id, { at, foot: rect(x, y, w, d), h });
  prism(g, rect(x, y, w, d), 0, h, '#cdb89a', { top: '#e3d5bc', w: 1.2 });
  anchor(`${id}.edge`, [x + w / 2, y, h], { kind: 'edge' });
  return {
    prints() {
      decal(id, () => onPlane([x - w / 2, y + d / 2, 0], [1, 0, 0], [0, 0, -1], (c) => {
        c.strokeStyle = INK; c.fillStyle = INK; c.lineWidth = 0.09; c.textAlign = 'left';
        for (let m = 0; m <= h + 1e-6; m += 1) {
          const big = Math.abs(m % major) < 1e-6 || m === 0;
          c.beginPath(); c.moveTo(0, -m); c.lineTo(big ? 1.6 : 0.8, -m); c.stroke();
        }
        c.font = '700 1.05px "JetBrains Mono"';
        for (let m = major; m < h; m += major) c.fillText(`${m} m`, 2.0, -m + 0.35);
        c.fillText(`${h} m`, 2.0, -h + 1.15);
      }));
    },
  };
}

// ───────── 땅 위 눈금자 (x축 방향, 1 m 눈금) ─────────
// x0→x1: 눈금자가 놓인 구간(0 m = x0) · y: 놓인 줄 · 앵커 `${id}.0`·`${id}.end`
export function groundRuler(id = 'ruler', x0 = -11, x1 = 9, y = 18.5, { major = 5 } = {}) {
  const len = x1 - x0, w = 3;
  const g = part(id, { at: [(x0 + x1) / 2, y], foot: rect((x0 + x1) / 2, y, len, w), h: 0.2, flat: true, shadow: false });
  prism(g, rect((x0 + x1) / 2, y, len, w), 0, 0.2, '#e8c63a', { top: '#f2d95a', w: 1 });
  anchor(`${id}.0`, [x0, y, 0.2], { kind: 'mark' }); anchor(`${id}.end`, [x1, y, 0.2], { kind: 'mark' });
  return {
    prints() {
      decal(id, () => onPlane([x0, y - w / 2, 0.21], [1, 0, 0], [0, 1, 0], (c) => {
        c.strokeStyle = INK; c.fillStyle = INK; c.lineWidth = 0.08; c.textAlign = 'center';
        for (let m = 0; m <= len + 1e-6; m += 1) {
          const big = m % major === 0;
          c.beginPath(); c.moveTo(m, 0); c.lineTo(m, big ? 1.1 : 0.55); c.stroke();
        }
        c.font = '700 1.0px "JetBrains Mono"';
        for (let m = 0; m <= len + 1e-6; m += major) c.fillText(String(m), m, 2.3);
        c.textAlign = 'left'; c.fillText('m', len + 0.5, 2.3);
      }));
    },
  };
}
