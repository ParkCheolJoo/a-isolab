// A 키트 예제 3 — 병렬 회로: 갈래마다 전압은 같고, 전체 전류는 갈래 전류의 합. 합성 저항은 가장 작은 저항보다 작다.
// 시험하는 규칙: 두 저항이 같은 두 세로줄(5번·11번)에 함께 꽂힘 · 전원을 뺀 뒤 저항 재기 · 끊은 틈에 전류계 직렬
import { V, prism, shape, rrect, floorLayer, Zdog, PARTS, A, add3, lerp, smooth, seg } from '../../engine.js';
import { multimeter, battery9v, breadboard, resistor, wire, mug, DIAL_ANG } from '../../parts.js';
import { makeTimeline, drawMeasure } from '../../timeline.js';
import { solve, checkContacts } from '../../board.js';

// 1) 실험대 (화면보다 크게)
const desk = new Zdog.Group({ addTo: floorLayer });
prism(desk, rrect(2, 8, 84, 72, 6, 6), -2.2, 0, '#e8e1d2', { top: '#f4efe4', w: 1.2 });
for (let x = -38; x <= 42; x += 2) shape(desk, [V(x, -26, 0), V(x, 42, 0)], x % 10 === 0 ? '#1d20331c' : '#1d20330b', { fill: false, closed: false, w: 0.8 });
for (let y = -26; y <= 42; y += 2) shape(desk, [V(-38, y, 0), V(42, y, 0)], y % 10 === 0 ? '#1d20331c' : '#1d20330b', { fill: false, closed: false, w: 0.8 });

// 0) 화면 글자: 아래 띠·조립 중 말풍선
export const INFO = { lab: 'LAB 03', kit: '멀티미터 · 9 V 건전지 · 브레드보드 · 1 kΩ · 2.2 kΩ', intro: ['저항 두 개를 나란히 이으면?', '전압·전류·합성 저항을 재 봐요'], names: { dmm: ['멀티미터', [150, -20]], pila: '건전지 9 V', bb: '브레드보드' } };

// 2) 부품 · 연결 (모두 앵커 이름)
// 회로: 건전지 + → R+ 줄 → (평선) j5 ─┬─ R1 1 kΩ (i5~i11) ─┬─ j11 → (평선) R− 줄 → 건전지 −
//                                     └─ R2 2.2 kΩ (g5~g11) ┘   (5번·11번 세로줄 f~j가 두 갈래의 공통 마디)
export const dmm = multimeter('dmm');
export const pila = battery9v('pila', [-4, 17]);
export const bb = breadboard('bb', [8, 16]);
export const r1 = resistor('r1', 'bb.i5', 'bb.i11', { ohms: 1000 });
export const r2 = resistor('r2', 'bb.g5', 'bb.g11', { ohms: 2200 });
export const taza = mug('taza', [24, -6]);                // 꾸밈: 책상 위 머그 (회로와 상관없음)
const W = {
  bp: wire('bp', 'pila.+', 'bb.R+2', '#c8382c', { dupont: false, arc: 3 }),
  bn: wire('bn', 'pila.-', 'bb.R-2', '#2b2c33', { dupont: false, arc: 2.4 }),
  w1: wire('w1', 'bb.R+5', 'bb.j5', '#c8382c'),
  w2: wire('w2', 'bb.j11', 'bb.R-11', '#2b2c33'),
};

// 3) 장 표 · meter: 'V' | 'A' | 'Ω' · off: 그 장에서 빼 둔 전선
const ORDER = ['dmm', 'pila', 'bb', 'r1', 'r2', 'taza'];
export const CH = [
  { id: 'v1', t0: 4.4, dur: 6, chip: 'R1 전압', dial: 'VDC', meter: 'V', at: { r: 'r1.1', b: 'r1.2' }, target: 'r1', label: 'R1 1 kΩ', note: ['갈래 하나의 양 끝에 병렬로 대요.', '두 갈래는 같은 두 마디에 붙어 있어요.'] },
  { id: 'v2', t0: 10.4, dur: 6, chip: 'R2 전압', dial: 'VDC', meter: 'V', at: { r: 'r2.1', b: 'r2.2' }, target: 'r2', label: 'R2 2.2 kΩ', note: ['저항이 달라도 전압은 R1과 같아요.', '병렬 갈래의 전압은 모두 같아요.'] },
  { id: 'amp', t0: 16.4, dur: 7, chip: '전체 전류', dial: 'mA', meter: 'A', off: ['w2'], at: { r: 'bb.f11', b: 'bb.R-13' }, target: 'bb', label: '끊은 자리', note: ['되돌아가는 선을 빼고, 그 틈에 직렬로 이어요.', '두 갈래 전류가 모여서 흘러요.'] },
  { id: 'ohm', t0: 23.4, dur: 6, chip: '합성 저항', dial: 'OHM', meter: 'Ω', off: ['bp'], at: { r: 'bb.f5', b: 'bb.f11' }, target: 'bb', label: '두 마디', note: ['저항은 전원을 뺀 뒤 재요.', '합성 저항은 가장 작은 저항보다 작아요.'] },
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
  const mA = (i) => CH[i]?.meter === 'A';                 // 빨강 플러그: 전류 장에서만 mA 단자
  s.redK = !c ? 0 : mA(s.ch) ? smooth(seg(s.u, 0.3, 1.0)) : mA(s.ch - 1) ? 1 - smooth(seg(s.u, 0.3, 1.0)) : 0;
  s.wire = Object.fromEntries(Object.keys(W).map((k, i) => [k, smooth(seg(t, WIRE_T[i], WIRE_T[i] + 0.4)) * (c?.off?.includes(k) ? 1 - smooth(seg(s.u, 0.2, 0.6)) : 1)]));
  const on = Object.fromEntries(Object.entries(s.wire).map(([k, v]) => [k, v > 0.99]));
  s.lcd = { v: '' }; s.extra = '';
  if (c) {
    const meter = c.meter && s.touch ? { mode: c.meter, r: c.at.r, b: c.at.b } : null;
    const R = solve({ on, meter }), ok = s.u >= 2;
    const I1 = Math.abs(R.parts.r1?.I || 0) * 1000, I2 = Math.abs(R.parts.r2?.I || 0) * 1000;
    if (c.meter === 'V') s.lcd = { v: s.touch ? (ok ? f2(Math.abs(R.reading)) : '0.0') : '0.00', neg: R.reading < 0, mode: 'DC', unit: 'V', auto: true };
    if (c.meter === 'A') s.lcd = { v: s.touch && !R.fuse ? (ok ? f2(Math.abs(R.reading) * 1000) : '0.0') : '0.00', mode: 'DC', unit: 'mA', auto: true };
    if (c.meter === 'Ω') s.lcd = { v: !s.touch || !Number.isFinite(R.reading) ? 'OL' : ok ? R.reading.toFixed(1) : R.reading.toFixed(0) + '.', unit: 'Ω', auto: true };
    if (c.id === 'v1' || c.id === 'v2') s.extra = `V₁ = ${f2(Math.abs(R.parts.r1?.Vd || 0))} V · V₂ = ${f2(Math.abs(R.parts.r2?.Vd || 0))} V`;
    if (c.id === 'amp' && s.touch) s.extra = `I = I₁ + I₂ = ${f2(I1)} + ${f2(I2)} = ${f2(I1 + I2)} mA`;
    if (c.id === 'ohm' && s.touch) s.extra = `1/R = 1/1000 + 1/2200 → R = ${(1 / (1 / 1000 + 1 / 2200)).toFixed(1)} Ω`;
  }
  s.note = c && s.u > 0.35 ? c.note : null;
  return s;
}

// 5) 그리기
export function buildItems(s) {
  dmm.setDial(s.dial); dmm.prints(s.lcd, s.dial); pila.prints(); bb.prints();
  r1.draw(); r2.draw(); taza.steam(performance.now() / 1000);
  for (const [k, w] of Object.entries(W)) w.draw(s.wire[k]);
  drawMeasure(s, { red: { from: 'dmm.V', to: 'dmm.mA', k: s.redK } });
}
export function labelsFor(s) {
  const c = s.c; if (!c?.label || s.u < 0.6) return [];
  const p = PARTS[c.target];
  return [[c.label, c.target === 'bb' ? add3(A(c.at.r), [0, 0, 0.3]) : [p.at[0], p.at[1], p.h + 0.6], [-40, -36]]];
}
