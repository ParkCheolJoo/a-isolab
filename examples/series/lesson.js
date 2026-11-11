// A 키트 예제 2 — 직렬 회로: 전압은 저항 크기에 비례해 나뉘고, 전류는 어디서나 같다.
// 시험하는 규칙: 저항 다리 간격·같은 행 · 전원 줄 · 평선/둥근 선 · 끊긴 회로에 전류계 넣기 · 전류계를 전원에 바로 대면 퓨즈
import { V, prism, shape, rrect, floorLayer, Zdog, PARTS, A, add3, lerp, smooth, seg, partPts } from '../../engine.js';
import { multimeter, battery9v, breadboard, resistor, wire, DIAL_ANG } from '../../parts.js';
import { makeTimeline, drawMeasure } from '../../timeline.js';
import { solve, checkContacts } from '../../board.js';

// 1) 실험대
const desk = new Zdog.Group({ addTo: floorLayer });
prism(desk, rrect(2, 8, 84, 72, 6, 6), -2.2, 0, '#e8e1d2', { top: '#f4efe4', w: 1.2 });
for (let x = -38; x <= 42; x += 2) shape(desk, [V(x, -26, 0), V(x, 42, 0)], x % 10 === 0 ? '#1d20331c' : '#1d20330b', { fill: false, closed: false, w: 0.8 });
for (let y = -26; y <= 42; y += 2) shape(desk, [V(-38, y, 0), V(42, y, 0)], y % 10 === 0 ? '#1d20331c' : '#1d20330b', { fill: false, closed: false, w: 0.8 });

// 0) 화면 글자: 아래 띠·조립 중 말풍선
export const INFO = { lab: 'LAB 02', kit: '멀티미터 · 9 V 건전지 · 브레드보드 · 1 kΩ · 2.2 kΩ', intro: ['저항 두 개를 한 줄로 이으면?', '전압과 전류를 차례로 재 봐요'], names: { dmm: ['멀티미터', [150, -20]], pila: '건전지 9 V', bb: '브레드보드' } };

// 2) 부품 · 연결 (모두 앵커 이름)
// 회로: 건전지 + → R+ 줄 → (평선) j5 ─ R1 1 kΩ (i5~i10) ─ R2 2.2 kΩ (h10~h16) ─ (평선) j16 → R− 줄 → 건전지 −
export const dmm = multimeter('dmm');
export const pila = battery9v('pila', [-4, 17]);
export const bb = breadboard('bb', [8, 16]);
export const r1 = resistor('r1', 'bb.i5', 'bb.i10', { ohms: 1000 });
export const r2 = resistor('r2', 'bb.h10', 'bb.h16', { ohms: 2200 });
const W = {
  bp: wire('bp', 'pila.+', 'bb.R+2', '#c8382c', { dupont: false, arc: 3 }),
  bn: wire('bn', 'pila.-', 'bb.R-2', '#2b2c33', { dupont: false, arc: 2.4 }),
  w1: wire('w1', 'bb.R+5', 'bb.j5', '#c8382c'),
  w2: wire('w2', 'bb.j16', 'bb.R-16', '#2b2c33'),
};

// 3) 장 표 · meter: 'V' | 'A' · off: 그 장에서 빼 둔 전선
const ORDER = ['dmm', 'pila', 'bb', 'r1', 'r2'];
export const CH = [
  { id: 'tot', t0: 4.2, dur: 6, chip: '전체 전압', dial: 'VDC', meter: 'V', at: { r: 'bb.R+8', b: 'bb.R-8' }, target: 'bb', label: '전원 줄', note: ['전원 줄 두 개에 대면 회로 전체의 전압을 재요.', '내부 저항 때문에 건전지 전압 9.42 V보다 조금 낮아요.'] },
  { id: 'v1', t0: 10.2, dur: 6, chip: 'R1 전압', dial: 'VDC', meter: 'V', at: { r: 'r1.1', b: 'r1.2' }, target: 'r1', label: 'R1 1 kΩ', note: ['저항 하나의 양 끝에 병렬로 대요.', '작은 저항에는 작은 전압이 걸려요.'] },
  { id: 'v2', t0: 16.2, dur: 6, chip: 'R2 전압', dial: 'VDC', meter: 'V', at: { r: 'r2.1', b: 'r2.2' }, target: 'r2', label: 'R2 2.2 kΩ', note: ['R1 전압 + R2 전압 = 전체 전압.', '전압은 저항 크기에 비례해 나뉘어요.'] },
  { id: 'amp', t0: 22.2, dur: 7, chip: '전류', dial: 'mA', meter: 'A', off: ['w2'], at: { r: 'bb.g16', b: 'bb.R-17' }, target: 'bb', label: '끊은 자리', note: ['전류는 회로를 끊고, 그 틈에 직렬로 이어서 재요.', '빨강 플러그를 mA 단자로 옮겨요.'] },
  { id: 'fuse', t0: 29.2, dur: 6, chip: '잘못 대면?', dial: 'mA', meter: 'A', conn: '잘못 연결', at: { r: 'bb.R+20', b: 'bb.R-20' }, target: 'bb', label: '전원 줄', note: ['전류계를 전원에 바로 대면 안 돼요.', '전류계는 저항이 아주 작아서 큰 전류가 흘러 퓨즈가 끊어져요.'] },
];
export const TL = makeTimeline({
  order: ORDER, chapters: CH, meter: dmm, overview: ['dmm', 'pila', 'bb'],
  park: { r: [3.2, 12.5, 0.3], b: [0.8, 13.3, 0.3], ar: [0.1, -0.5, 0.86], ab: [-0.5, 0.1, 0.86] },
});
const WIRE_T = Object.keys(W).map((_, i) => TL.buildEnd + 0.2 + i * 0.3);
export const DUR = TL.end + 0.6;
const PROBLEMS = checkContacts(CH); if (PROBLEMS.length) console.warn('[장 표]', PROBLEMS);

// 4) 상태: 표시값은 회로를 풀어서
const f2 = (x) => x.toFixed(2);
export function stateAt(t) {
  const s = TL.stateAt(t), c = s.c;
  const prev = s.ch > 0 ? CH[s.ch - 1].dial : 'OFF';
  s.dial = c ? lerp(DIAL_ANG[prev], DIAL_ANG[c.dial], smooth(seg(s.u, 0.05, 0.5))) : DIAL_ANG.OFF;
  // 빨강 플러그: 전류 장에서 V → mA로 옮김 (0.3~1.0 s)
  const mA = (i) => CH[i]?.meter === 'A';
  s.redK = !c ? 0 : mA(s.ch) ? (mA(s.ch - 1) ? 1 : smooth(seg(s.u, 0.3, 1.0))) : 0;
  // 전선: 조립 뒤 하나씩 나타나고, off 장에서는 빠짐
  s.wire = Object.fromEntries(Object.keys(W).map((k, i) => [k, smooth(seg(t, WIRE_T[i], WIRE_T[i] + 0.4)) * (c?.off?.includes(k) ? 1 - smooth(seg(s.u, 0.2, 0.6)) : 1)]));
  const on = Object.fromEntries(Object.entries(s.wire).map(([k, v]) => [k, v > 0.99]));
  s.lcd = { v: '' }; s.extra = '';
  if (c) {
    const meter = c.meter && s.touch ? { mode: c.meter, r: c.at.r, b: c.at.b } : null;
    const R = solve({ on, meter });
    const I = Math.abs(R.parts.r1?.I || 0) * 1000;
    if (c.meter === 'V') s.lcd = { v: s.touch ? (s.u >= 2 ? f2(Math.abs(R.reading)) : '0.0') : '0.00', neg: R.reading < 0, mode: 'DC', unit: 'V', auto: true };
    if (c.meter === 'A') s.lcd = { v: s.touch && !R.fuse ? (s.u >= 2 ? f2(Math.abs(R.reading) * 1000) : '0.0') : '0.00', mode: 'DC', unit: 'mA', auto: true };
    const V1 = Math.abs(R.parts.r1?.Vd || 0), V2 = Math.abs(R.parts.r2?.Vd || 0);
    if (c.id === 'tot') s.extra = `V = ${f2(V1 + V2)} V`;
    if (c.id === 'v1') s.extra = `V₁ = I·R₁ = ${f2(I)} mA × 1 kΩ = ${f2(V1)} V`;
    if (c.id === 'v2') s.extra = `V₁ + V₂ = ${f2(V1)} + ${f2(V2)} = ${f2(V1 + V2)} V`;
    if (c.id === 'amp' && s.touch) s.extra = `I = 9.42 V ÷ (1000 + 2200 + 1.5 + 0.5) Ω = ${f2(Math.abs(R.reading) * 1000)} mA`;
    if (c.id === 'fuse' && s.touch) s.extra = R.fuse ? `순간 전류 ${(9.42 / 2).toFixed(1)} A > 퓨즈 0.4 A → 끊어짐. 표시 0.00` : '';
    s.fuse = c.id === 'fuse' && s.touch && R.fuse;
  }
  s.note = c && s.u > 0.35 ? c.note : null;
  return s;
}

// 5) 그리기
export function buildItems(s) {
  dmm.setDial(s.dial); dmm.prints(s.lcd, s.dial); pila.prints(); bb.prints();
  r1.draw(); r2.draw();
  for (const [k, w] of Object.entries(W)) w.draw(s.wire[k]);
  drawMeasure(s, { red: { from: 'dmm.V', to: 'dmm.mA', k: s.redK } });
}
export function labelsFor(s) {
  const c = s.c; if (!c?.label || s.u < 0.6) return [];
  const p = PARTS[c.target]; const L = [[c.label, c.target === 'bb' ? add3(A(c.at.r), [0, 0, 0.3]) : [p.at[0], p.at[1], p.h + 0.6], [-40, -36]]];
  if (s.fuse) L.push(['퓨즈 끊김', A('dmm.mA'), [-90, 30]]);
  return L;
}
