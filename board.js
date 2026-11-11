// A 키트 — 꽂기·연결 규칙 + 회로 계산
// 부품을 놓을 때마다 register()로 "어느 다리가 어느 구멍에" 들어갔는지 등록한다.
// 그러면 (1) 꽂기 규칙을 검사하고 (2) 브레드보드 줄·전선으로 이어진 마디(net)를 만들고
// (3) 그 회로를 직접 풀어 계기 값을 낸다 → 표시값을 손으로 적지 않아도 실제 회로와 맞는다.
import { A, anchorInfo } from './engine.js';

// ───────── 등록부 ─────────
// part: { id, kind, pins: { 이름: 앵커 }, model: { … 전기 성질 } }
// kind: 'resistor' | 'led' | 'capacitor' | 'button' | 'wire' | 'battery' | 'pin'(전원 핀) | 'meter'
export const REG = { parts: [], issues: [] };
const OCC = new Map();           // 구멍 → 차지한 부품
const issue = (level, msg, who) => { REG.issues.push({ level, msg, who }); if (level === 'error') console.warn(`[꽂기 규칙] ${msg}`); };

// ───────── 꽂기 규칙 ─────────
// 브레드보드 구멍 이름: '<보드>.<행><열>' (행 a~j, 열 1~30) · 전원 줄: '<보드>.R+5' 등
const parseHole = (name) => { const m = /^([^.]+)\.([a-j])(\d+)$/.exec(name); return m ? { board: m[1], row: m[2], col: +m[3] } : null; };
const ROW_I = 'abcdefghij';
export const RULES = {
  // 2다리 부품: 다리 사이 열 간격(구멍 수) 허용 범위, 같은 행에 꽂는지
  resistor: { span: [3, 8], sameRow: true, why: '저항(1/4 W)의 몸통은 약 6 mm라 다리를 3~8칸(7.6~20 mm) 벌려 같은 행에 눕혀 꽂습니다.' },
  led: { span: [1, 1], sameRow: true, why: 'LED 다리 간격은 2.54 mm(1칸)입니다. 옆 칸에 나란히 꽂습니다.' },
  capacitor: { span: [1, 2], sameRow: true, why: '전해 축전기 다리 간격은 1~2칸입니다.' },
  button: { straddle: true, why: '택트 스위치는 가운데 홈을 걸쳐 e행·f행에 꽂아야 네 다리가 서로 다른 줄에 들어갑니다.' },
};

/** 부품 등록 + 즉시 규칙 검사 */
export function register(id, kind, pins, model = {}) {
  const p = { id, kind, pins, model }; REG.parts.push(p);
  for (const [pin, a] of Object.entries(pins)) {
    if (!anchorInfo(a)) { issue('error', `${id}.${pin}: 앵커 ${a} 없음`, id); continue; }
    const k = anchorInfo(a).kind;
    if ((k === 'hole' || k === 'socket') && !['pin', 'battery', 'meter'].includes(kind)) {
      if (OCC.has(a)) issue('error', `${a}에 ${OCC.get(a)}와 ${id}가 함께 꽂힘 (한 구멍에 다리 하나)`, id);
      OCC.set(a, id);
    }
  }
  const rule = RULES[kind];
  const H = Object.values(pins).map(parseHole);
  if (rule?.span && H.every(Boolean)) {
    const [h1, h2] = H; const span = Math.abs(h1.col - h2.col);
    if (rule.sameRow && h1.row !== h2.row) issue('error', `${id}: 두 다리가 다른 행(${h1.row}, ${h2.row}) — ${rule.why}`, id);
    if (span < rule.span[0] || span > rule.span[1]) issue('error', `${id}: 다리 간격 ${span}칸 — ${rule.why}`, id);
    if (h1.col === h2.col && (h1.row <= 'e') === (h2.row <= 'e')) issue('error', `${id}: 두 다리가 같은 줄(${h1.col}열)에 있어 부품이 건너뛰어짐(단락)`, id);
  }
  if (rule?.straddle && H.every(Boolean)) {
    const rows = new Set(H.map((h) => h.row));
    if (!(rows.has('e') && rows.has('f') && rows.size === 2)) issue('error', `${id}: ${rule.why}`, id);
  }
  return p;
}
export const occupied = (hole) => OCC.get(hole);

// ───────── 마디(net) ─────────
// 브레드보드: 한 열의 a~e가 한 줄, f~j가 한 줄, 전원 줄은 길게 한 줄. 전선·닫힌 스위치는 두 끝을 한 마디로 묶는다.
function stripOf(a) {
  const info = anchorInfo(a); if (!info) return a;
  if (info.kind === 'hole') return `${a.split('.')[0]}:${info.strip}`;
  if (info.net) return info.net;   // 같은 마디인 단자(예: UNO GND 여러 개)
  return a;
}
/** 다리 앵커('res.1')나 구멍·단자 앵커를 마디 이름으로 */
export function netOf(a, state = {}) {
  const leg = legHole(a); const base = stripOf(leg);
  return find(buildUnion(state), base);
}
const legHole = (a) => { for (const p of REG.parts) for (const [pin, h] of Object.entries(p.pins)) if (`${p.id}.${pin}` === a) return h; return a; };
function buildUnion(state) {
  const parent = new Map();
  const f = (x) => { if (!parent.has(x)) parent.set(x, x); let r = x; while (parent.get(r) !== r) r = parent.get(r); parent.set(x, r); return r; };
  const u = (a, b) => parent.set(f(a), f(b));
  for (const p of REG.parts) {
    const nets = Object.values(p.pins).map(stripOf); nets.forEach(f);
    if (p.kind === 'wire' && (state.on?.[p.id] ?? true)) u(nets[0], nets[1]);
    if (p.kind === 'button') { u(stripOf(p.pins.a1), stripOf(p.pins.a2)); u(stripOf(p.pins.b1), stripOf(p.pins.b2)); } // 같은 쪽 다리는 늘 이어짐
  }
  return { f };
}
const find = (U, x) => U.f(x);

// ───────── 회로 풀기 (마디 해석, 직류) ─────────
/**
 * solve(state) → { V(net), I(partId), parts: { id: { I, Vd, on } } }
 * state: { on: { 부품id: true/false } (스위치·전원), meter: { mode: 'V'|'A'|'Ω'|'diode', r: 앵커, b: 앵커 } }
 * 모델: 저항 R · 전지 기전력+내부저항 · LED(문턱 Vf 넘으면 Vf + 직렬 Rs, 아니면 끊김) · 축전기 직류 끊김
 *       버튼 누르면 0.05 Ω · 전압계 10 MΩ · 전류계 0.5 Ω(퓨즈 0.4 A) · 저항계·다이오드 시험은 1 mA 시험 전류
 */
export function solve(state = {}) {
  const U = buildUnion(state); const N = (a) => U.f(stripOf(legHole(a)));
  const nodes = new Map(); const id = (n) => { if (!nodes.has(n)) nodes.set(n, nodes.size); return nodes.get(n); };
  const el = [];
  for (const p of REG.parts) {
    const m = p.model, P = p.pins;
    if (p.kind === 'resistor') el.push({ p, t: 'R', a: N(P['1']), b: N(P['2']), R: m.ohms });
    if (p.kind === 'led') el.push({ p, t: 'D', a: N(P.A), b: N(P.K), vf: m.vf ?? 2.0, rs: m.rs ?? 15, imax: m.imax ?? 0.03 });
    if (p.kind === 'battery' && (state.on?.[p.id] ?? true)) el.push({ p, t: 'E', a: N(P['+']), b: N(P['-']), E: m.emf, R: m.rint ?? 1.5 });
    if (p.kind === 'pin' && (state.on?.[p.id] ?? false)) el.push({ p, t: 'E', a: N(P.out), b: N(P.gnd), E: m.volts, R: m.rout ?? 25 });
    if (p.kind === 'button' && state.on?.[p.id]) el.push({ p, t: 'R', a: N(P.a1), b: N(P.b1), R: 0.05 });
  }
  const mt = state.meter;
  if (mt) {
    const a = N(mt.r), b = N(mt.b);
    if (mt.mode === 'V') el.push({ t: 'R', a, b, R: 1e7, meter: true });
    if (mt.mode === 'A') el.push({ t: 'R', a, b, R: 0.5, meter: true });
    if (mt.mode === 'Ω' || mt.mode === 'diode') el.push({ t: 'J', a, b, I: 1e-3, meter: true, vmax: mt.mode === 'Ω' ? 3.0 : 2.8 });
  }
  el.forEach((e) => { id(e.a); id(e.b); });
  const n = nodes.size; if (n === 0) return { V: () => 0, I: () => 0, parts: {} };
  let dOn = el.filter((e) => e.t === 'D').map(() => false);
  let x = new Array(n).fill(0);
  for (let it = 0; it < 12; it++) {
    const G = Array.from({ length: n }, () => new Array(n).fill(0)), Ib = new Array(n).fill(0);
    const stamp = (a, b, g) => { const i = id(a), j = id(b); G[i][i] += g; G[j][j] += g; G[i][j] -= g; G[j][i] -= g; };
    const inject = (a, b, cur) => { Ib[id(a)] -= cur; Ib[id(b)] += cur; }; // a → b 로 cur가 흐르는 전류원 (회로 밖에서 b에 넣음)
    let di = 0;
    for (const e of el) {
      if (e.t === 'R') stamp(e.a, e.b, 1 / e.R);
      if (e.t === 'E') { stamp(e.a, e.b, 1 / e.R); inject(e.b, e.a, e.E / e.R); }
      if (e.t === 'D') { if (dOn[di]) { stamp(e.a, e.b, 1 / e.rs); inject(e.b, e.a, e.vf / e.rs); } else stamp(e.a, e.b, 1e-9); di++; }
      if (e.t === 'J') inject(e.b, e.a, e.I);
    }
    for (let i = 0; i < n; i++) G[i][i] += 1e-9;   // 떠 있는 마디 방지
    G[0] = G[0].map((_, j) => (j === 0 ? 1 : 0)); Ib[0] = 0;   // 기준 마디 0 V
    x = gauss(G, Ib);
    // 저항계: 시험 전압 한계(개방이면 OL)
    let changed = false; di = 0;
    for (const e of el) if (e.t === 'D') { const vd = x[id(e.a)] - x[id(e.b)]; const on = dOn[di] ? (vd - e.vf) / e.rs > 0 : vd > e.vf; if (on !== dOn[di]) { dOn[di] = on; changed = true; } di++; }
    if (!changed) break;
  }
  const V = (net) => (nodes.has(net) ? x[nodes.get(net)] : 0);
  const parts = {}; let di = 0;
  for (const e of el) {
    if (!e.p) continue; const vd = V(e.a) - V(e.b);
    if (e.t === 'R') parts[e.p.id] = { I: vd / e.R, Vd: vd };
    if (e.t === 'E') parts[e.p.id] = { I: (e.E - (V(e.a) - V(e.b))) / e.R, Vd: vd };
    if (e.t === 'D') { const on = dOn[di++]; parts[e.p.id] = { I: on ? (vd - e.vf) / e.rs : 0, Vd: vd, on, over: on && (vd - e.vf) / e.rs > e.imax }; }
  }
  const out = { V, parts, nets: [...nodes.keys()] };
  if (mt) {
    const a = N(mt.r), b = N(mt.b), vd = V(a) - V(b);
    out.reading = mt.mode === 'V' ? vd : mt.mode === 'A' ? vd / 0.5 : vd;
    if (mt.mode === 'Ω') out.reading = vd > 2.9 ? Infinity : vd / 1e-3;           // 시험 전류 1 mA → R = V/I, 열려 있으면 OL
    if (mt.mode === 'diode') out.reading = vd > 2.7 ? Infinity : vd;
    if (mt.mode === 'A' && Math.abs(out.reading) > 0.4) out.fuse = true;            // 전류계를 병렬로 대면 퓨즈가 끊김
  }
  return out;
}
function gauss(A, b) {
  const n = b.length; const M = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]]; const d = M[c][c] || 1e-18;
    for (let r = 0; r < n; r++) if (r !== c) { const k = M[r][c] / d; if (k) for (let j = c; j <= n; j++) M[r][j] -= k * M[c][j]; }
  }
  return M.map((r, i) => r[n] / (r[i] || 1e-18));
}

// ───────── 점검 ─────────
/** 꽂기 규칙 위반 + 떠 있는 다리(아무것과도 이어지지 않음) */
export function checkBoard() {
  const out = [...REG.issues];
  const U = buildUnion({ on: Object.fromEntries(REG.parts.map((p) => [p.id, true])) });
  const count = new Map();
  for (const p of REG.parts) for (const a of Object.values(p.pins)) { const k = U.f(stripOf(a)); count.set(k, (count.get(k) || 0) + 1); }
  for (const p of REG.parts) {
    if (!['resistor', 'led', 'capacitor'].includes(p.kind) || p.model.alone) continue;
    for (const [pin, a] of Object.entries(p.pins)) if ((count.get(U.f(stripOf(a))) || 0) < 2) out.push({ level: 'warn', msg: `${p.id}.${pin}(${a}): 다른 무엇과도 이어지지 않은 다리`, who: p.id });
  }
  return out;
}
/**
 * 장 표 점검: 프로브가 닿는 곳이 (1) 있는 앵커이고 (2) 그 장에서 다른 다리가 꽂힌 구멍이 아닌지.
 * chapters: [{ id, at: { r, b }, off?: [그 장에서 뺀 전선·부품 id] }]
 */
export function checkContacts(chapters) {
  const out = [];
  for (const c of chapters) if (c.at) for (const [pol, a] of Object.entries(c.at)) {
    const info = anchorInfo(a); if (!info) { out.push({ level: 'error', msg: `${c.id}: ${a} 앵커 없음` }); continue; }
    const who = OCC.get(a); if (who && !(c.off || []).includes(who)) out.push({ level: 'error', msg: `${c.id}: ${pol} 프로브가 ${who}가 꽂힌 ${a}에 또 꽂힘 — 빈 구멍이나 다리에 대세요` });
  }
  return out;
}
/** 마디 목록 (콘솔 점검용): { 마디: [부품.다리 …] } */
export function netlist(state = { on: {} }) {
  const U = buildUnion(state); const out = {};
  for (const p of REG.parts) for (const [pin, a] of Object.entries(p.pins)) (out[U.f(stripOf(a))] ||= []).push(`${p.id}.${pin}`);
  return out;
}
export { A };
