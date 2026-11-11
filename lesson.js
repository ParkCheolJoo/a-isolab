// A 키트 — 예제 내용: "멀티미터로 건전지 전압과 저항 재기" (3장)
// ▶ 새 실험을 만들 때 고치는 파일은 이것 하나. 순서:
//   1) 실험대(바닥) 2) 부품 놓기 3) 수치 모델 4) 장 표 5) 표시값 6) 이 순간 그릴 것
import { V, prism, shape, rrect, circle, floorLayer, Zdog, PARTS, A, add3, lerp, smooth, seg, fitCam, partPts } from './engine.js';
import { multimeter, battery9v, breadboard, resistor, DIAL_ANG } from './parts.js';
import { makeTimeline, drawMeasure } from './timeline.js';
import { solve } from './board.js';

// 1) 실험대 ─ 크림색 판 + 2 cm 격자. 판은 화면보다 크게 둬서 가장자리가 화면 밖으로 나가게 (작은 판이 떠 보이지 않게)
const desk = new Zdog.Group({ addTo: floorLayer });
prism(desk, rrect(-4, 8, 84, 72, 6, 6), -2.2, 0, '#e8e1d2', { top: '#f4efe4', w: 1.2 });
for (let x = -44; x <= 36; x += 2) shape(desk, [V(x, -26, 0), V(x, 42, 0)], x % 10 === 0 ? '#1d20331c' : '#1d20330b', { fill: false, closed: false, w: 0.8 });
for (let y = -26; y <= 42; y += 2) shape(desk, [V(-44, y, 0), V(36, y, 0)], y % 10 === 0 ? '#1d20331c' : '#1d20330b', { fill: false, closed: false, w: 0.8 });

// 0) 화면 글자: 아래 띠의 LAB 번호·부품 목록, 조립하는 동안 뜨는 말풍선 두 줄
export const INFO = { lab: 'LAB 01', kit: '멀티미터 · 9 V 건전지 · 브레드보드 · 220 Ω 저항', intro: ['멀티미터 하나로 무엇을 잴까요?', '건전지 전압과 저항을 차례로 재 봐요'], names: { dmm: ['멀티미터', [150, -20]], pila: '건전지 9 V', bb: '브레드보드' } };

// 2) 부품 놓기 ─ 연결은 앵커 이름으로만 (구멍 bb.h10, 다리 res.1 …)
export const dmm = multimeter('dmm');
export const pila = battery9v('pila', [-12, 9]);
export const bb = breadboard('bb');                       // 중심 (10, 21) · 구멍 a~j × 1~30
export const res = resistor('res', 'bb.h10', 'bb.h14', { ohms: 218.6, alone: true }); // 표시 220 Ω ±5 %, 실제 218.6 Ω · 회로 없이 따로 잼

// 3) 수치 ─ 표시값은 손으로 적지 않고 board.js가 회로를 풀어 낸다 (건전지 9.42 V·내부저항 1.5 Ω, 저항 218.6 Ω)

// 4) 장 표 ─ t0 시작 시각(s), dur 길이, dial 다이얼, at 프로브가 닿는 앵커, target 카메라가 담을 부품, note 안내 두 줄
const ORDER = ['dmm', 'pila', 'bb', 'res'];
export const CH = [
  { id: 'anat', t0: 2.2, dur: 4, chip: '멀티미터 알아보기', dial: 'OFF', note: ['검정은 언제나 COM에 꽂아요.', '빨강은 V·Ω 단자에.'] },
  { id: 'vdc', t0: 6.2, dur: 6.5, chip: 'DC 전압', dial: 'VDC', at: { r: 'pila.+', b: 'pila.-' }, target: 'pila', label: '건전지 9 V', swap: true, note: ['병렬로 대요: 빨강은 +, 검정은 −.', '거꾸로 대면 − 부호가 붙어요.'] },
  { id: 'ohm', t0: 12.7, dur: 5.5, chip: '저항', dial: 'OHM', at: { r: 'res.2', b: 'res.1' }, target: 'res', label: '220 Ω', note: ['저항은 전원을 끈 상태에서 재요.', '220 Ω ±5 %: 209~231 Ω이면 정상.'] },
];
export const TL = makeTimeline({
  order: ORDER, chapters: CH, meter: dmm, overview: ORDER,
  park: { r: [4.2, 14.5, 0.3], b: [1.8, 15.3, 0.3], ar: [0.1, -0.5, 0.86], ab: [-0.5, 0.1, 0.86] },
});
CH[0].cam = () => fitCam([...dmm.pts, ...partPts('pila')], 1.0);

// 5) 표시값 ─ 장과 장 안의 시각 u, 닿았는지(touch)로 결정
const METER = { VDC: 'V', OHM: 'Ω' };
function lcdFor(s) {
  const c = s.c; if (!c || c.dial === 'OFF') return { v: '' };
  const mode = METER[c.dial];
  const settle = s.u >= 2 || s.swapped;                       // 닿고 나서 값이 자리 잡는 시간
  if (!s.touch) return mode === 'Ω' ? { v: 'OL', unit: 'Ω', auto: true } : { v: '0.00', mode: 'DC', unit: 'V', auto: true };
  const r = solve({ meter: { mode, r: s.swapped ? c.at.b : c.at.r, b: s.swapped ? c.at.r : c.at.b } }).reading;
  if (mode === 'V') return { v: settle ? Math.abs(r).toFixed(2) : '0.0', neg: r < 0, mode: 'DC', unit: 'V', auto: true };
  return { v: !Number.isFinite(r) ? 'OL' : settle ? r.toFixed(1) : r.toFixed(0) + '.', unit: 'Ω', auto: true };
}

export function stateAt(t) {
  const s = TL.stateAt(t);
  if (s.c?.id === 'anat') s.probeAlpha = smooth(seg(s.u, 2.5, 3));
  const prev = s.ch > 0 ? CH[s.ch - 1].dial : 'OFF';
  s.dial = s.c ? lerp(DIAL_ANG[prev], DIAL_ANG[s.c.dial], smooth(seg(s.u, 0.05, 0.5))) : DIAL_ANG.OFF;
  s.lcd = lcdFor(s);
  s.note = s.c && s.u > 0.35 ? s.c.note : null;
  return s;
}

// 6) 이 순간 그릴 것 (깊이 정렬은 엔진이 알아서)
export function buildItems(s) {
  dmm.setDial(s.dial);
  dmm.prints(s.lcd, s.dial);
  pila.prints();
  bb.prints();
  res.draw();
  drawMeasure(s);
}

// 이름표: [글, 앵커 위치, 화면 밀림(px)]
export function labelsFor(s) {
  const c = s.c;
  if (c?.id === 'anat' && s.u > 0.6) return [['COM: 검정', A('dmm.COM'), [-40, 56]], ['VΩ: 빨강', A('dmm.V'), [70, 46]], ['다이얼: 기능', add3(A('dmm.dial'), [2.9, 0, 0]), [70, 42]]];
  if (c?.label && s.u > 0.6) { const p = PARTS[c.target]; return [[c.label, [p.at[0], p.at[1], p.h + 0.6], [-36, -34]]]; }
  return [];
}
export const DUR = TL.end + 0.6;
