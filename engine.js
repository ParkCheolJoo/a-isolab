// A형 기본 틀 — 엔진: 아이소메트릭 장면(Zdog) + 깊이로 정렬되는 2D 항목(전선·프로브·인쇄) + 접점(앵커)
// 이 파일은 실험 내용과 무관하다. 새 실험은 parts.js(부품)와 lesson.js(장·값)만 바꾼다.
//
// 좌표: 실험대 cm 단위. x(오른쪽 뒤) · y(왼쪽 앞) · z(높이). 바닥 = z 0.
// 그리기 순서 규칙(앞뒤):
//   1) 바닥층(책상·그림자)은 정렬 없이 먼저
//   2) 부품은 "발자국 중심 · 높이 절반" 한 점의 깊이로 정렬 (평평한 판은 맨 뒤로)
//   3) 전선·프로브는 짧은 토막마다 깊이를 따로 계산해 부품 사이에 끼워 넣음
//   4) 표면 인쇄(표시창 숫자·구멍)는 자기 부품 바로 다음
import Zdog from 'zdog';

export { Zdog };
export const TAU = Zdog.TAU;
export const INK = '#1d2033';
export const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
export const smooth = (t) => { t = clamp(t); return t * t * (3 - 2 * t); };
export const easeOut = (t) => 1 - Math.pow(1 - clamp(t), 3);
export const lerp = (a, b, t) => a + (b - a) * t;
export const seg = (t, a, b) => clamp((t - a) / (b - a));
export const mix3 = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);
export const add3 = (a, b, k = 1) => a.map((v, i) => v + b[i] * k);

// ───────── 카메라: 방위 45°, 고도 30° ─────────
export const ROT = { x: -TAU / 12, y: TAU / 8 };
export const scene = new Zdog.Anchor({ rotate: ROT });
export const floorLayer = new Zdog.Anchor({ addTo: scene });
export const objLayer = new Zdog.Anchor({ addTo: scene });
/** 실험대 좌표 (x, y, 높이 z) → Zdog 벡터 */
export const V = (x, y, z = 0) => ({ x, y: -z, z: y });
export const P3 = (a) => V(a[0], a[1], a[2]);
export const rotOnly = (p) => new Zdog.Vector(p).rotate(ROT);
/** 화면 깊이 (클수록 앞) */
export const depth = (a) => rotOnly(P3(a)).z;

export function tone(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const f = (c) => Math.round(clamp(c * k, 0, 255));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}
const outlines = [];
/** keep: 굵기를 확대와 무관하게 고정(w×0.1 cm) */
export function shape(group, path, color, { fill = true, w = 0, closed = true } = {}) {
  const s = new Zdog.Shape({ addTo: group, path, closed, fill, stroke: fill ? 0.04 : 1, color });
  if (!fill) outlines.push({ s, w });
  return s;
}
export function strokeShape(group, path, color, w, { closed = false } = {}) {
  const s = new Zdog.Shape({ addTo: group, path, closed, stroke: 1, color });
  outlines.push({ s, w, keep: true });
  return s;
}

/** 돌출 다각형: 바닥 다각형 pts=[[x,y]...]를 z0→z1로 세움 (상자·둥근 상자·원기둥 공통) */
export function prism(group, pts, z0, z1, color, { top = color, line = true, w = 1 } = {}) {
  const n = pts.length;
  const cx = pts.reduce((a, p) => a + p[0], 0) / n, cy = pts.reduce((a, p) => a + p[1], 0) / n;
  const sides = [];
  for (let i = 0; i < n; i++) {
    const a = pts[i], b = pts[(i + 1) % n];
    let nx = b[1] - a[1], ny = -(b[0] - a[0]); const L = Math.hypot(nx, ny) || 1; nx /= L; ny /= L;
    if (nx * ((a[0] + b[0]) / 2 - cx) + ny * ((a[1] + b[1]) / 2 - cy) < 0) { nx = -nx; ny = -ny; }
    const vis = rotOnly(V(nx, ny, 0)).z > 0.02;
    const k = 0.78 + 0.12 * clamp((ny - nx + 1) / 2);
    sides.push({ a, b, nx, ny, vis, k, depth: rotOnly(V((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, z0)).z });
  }
  sides.filter((s) => s.vis).sort((p, q) => p.depth - q.depth)
    .forEach((s) => shape(group, [V(s.a[0], s.a[1], z0), V(s.b[0], s.b[1], z0), V(s.b[0], s.b[1], z1), V(s.a[0], s.a[1], z1)], tone(color, s.k)));
  const topShape = shape(group, pts.map(([x, y]) => V(x, y, z1)), top);
  if (!line) return topShape;
  shape(group, pts.map(([x, y]) => V(x, y, z1)), INK, { fill: false, w });
  for (const s of sides) if (s.vis) shape(group, [V(s.a[0], s.a[1], z0), V(s.b[0], s.b[1], z0)], INK, { fill: false, closed: false, w });
  for (let i = 0; i < n; i++) {
    const p = sides[(i - 1 + n) % n], q = sides[i];
    const turn = Math.acos(clamp(p.nx * q.nx + p.ny * q.ny, -1, 1));
    if (p.vis !== q.vis || (p.vis && q.vis && turn > 0.5)) shape(group, [V(q.a[0], q.a[1], z0), V(q.a[0], q.a[1], z1)], INK, { fill: false, closed: false, w });
  }
  return topShape;
}
export const rect = (x, y, w, d) => [[x - w / 2, y - d / 2], [x + w / 2, y - d / 2], [x + w / 2, y + d / 2], [x - w / 2, y + d / 2]];
export function rrect(x, y, w, d, r, n = 5) {
  const out = []; const c = [[x + w / 2 - r, y - d / 2 + r, -Math.PI / 2], [x + w / 2 - r, y + d / 2 - r, 0], [x - w / 2 + r, y + d / 2 - r, Math.PI / 2], [x - w / 2 + r, y - d / 2 + r, Math.PI]];
  for (const [ox, oy, a0] of c) for (let k = 0; k <= n; k++) { const a = a0 + (k / n) * (Math.PI / 2); out.push([ox + r * Math.cos(a), oy + r * Math.sin(a)]); }
  return out;
}
export const circle = (x, y, r, n = 28) => Array.from({ length: n }, (_, i) => { const a = (i / n) * TAU; return [x + r * Math.cos(a), y + r * Math.sin(a)]; });

// ───────── 접점(앵커): 부품이 내놓는 이름 붙은 점 ─────────
// 연결은 반드시 앵커 이름으로만 한다 → "어디에 꽂혔나"가 데이터로 남고, 점검 스크립트로 확인할 수 있다.
const ANCH = new Map();
export function anchor(name, p, info = {}) { ANCH.set(name, { p, ...info }); return p; }
export function A(name) { const a = ANCH.get(name); if (!a) throw new Error(`앵커 없음: ${name}`); return a.p; }
export const anchorInfo = (name) => ANCH.get(name);
export const anchorNames = () => [...ANCH.keys()];

// ───────── 부품 ─────────
// at: 발자국 중심 [x,y] · foot: 바닥 다각형 · h: 높이 · flat: 얇은 판(위에 다른 것이 얹힘 → 항상 먼저 그림)
export const PARTS = {};
export function part(id, { at, foot, h, flat = false, shadow = true, sortZ = null }) {
  const g = new Zdog.Group({ addTo: objLayer, visible: false });
  PARTS[id] = { id, g, at, foot, h, flat, shadow, sortZ: sortZ ?? (flat ? h : h / 2), on: false, lift: 0 };
  return g;
}
export const partDepth = (id) => { const p = PARTS[id]; return depth([p.at[0], p.at[1], p.sortZ + p.lift]) + (p.flat ? -1000 : 0); };
export const partReady = (id) => PARTS[id].on && PARTS[id].lift < 0.3;

// ───────── 화면 ─────────
export const stage = { canvas: null, ctx: null, VIEW: { W: 800, H: 640, cssW: 800, cssH: 640, dpr: 1, cx: 400, cy: 300 }, CAM: { cx: 0, cy: 0, zoom: 10 } };
export function initStage(canvas, layout) {
  stage.canvas = canvas; stage.ctx = canvas.getContext('2d');
  const fit = () => {
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(r.width * dpr); canvas.height = Math.round(r.height * dpr);
    const { top, bottom } = layout();
    stage.VIEW = { cssW: r.width, cssH: r.height, dpr, W: r.width, H: r.height - bottom - top, cx: r.width / 2, cy: top + (r.height - bottom - top) / 2 };
  };
  new ResizeObserver(fit).observe(canvas); fit();
}
export const project = (p) => { const q = rotOnly(p), { VIEW, CAM } = stage; return { x: VIEW.cx + CAM.zoom * (q.x - CAM.cx), y: VIEW.cy + CAM.zoom * (q.y - CAM.cy) }; };
export const proj = (a) => project(P3(a));
export function screen2d(fn) { const { ctx, VIEW } = stage; ctx.save(); ctx.setTransform(VIEW.dpr, 0, 0, VIEW.dpr, 0, 0); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; fn(ctx); ctx.restore(); }
/** 평면 위에 그리기: 원점 o에서 u·v 방향 1 cm = 그림 1 단위 */
export function onPlane(o, u, v, fn) {
  const { ctx, VIEW } = stage;
  const O = proj(o), U = proj(add3(o, u)), W = proj(add3(o, v)); const d = VIEW.dpr;
  ctx.save(); ctx.setTransform((U.x - O.x) * d, (U.y - O.y) * d, (W.x - O.x) * d, (W.y - O.y) * d, O.x * d, O.y * d); fn(ctx); ctx.restore();
}
export function inked(path, color, w, extra = 2.2) {
  const { ctx, CAM } = stage; const z = CAM.zoom;
  ctx.strokeStyle = INK; ctx.lineWidth = w * z + extra; path(); ctx.stroke();
  ctx.strokeStyle = color; ctx.lineWidth = w * z; path(); ctx.stroke();
}

// ───────── 깊이 항목 (전선·프로브·인쇄·빛) ─────────
let ITEMS = [];
/** d: 깊이(클수록 나중에 그림) · draw(ctx): 화면 좌표(CSS px)로 그림 */
export function item(d, draw, alpha = 1) {
  ITEMS.push({ sortValue: d, updateSortValue() {}, render() { screen2d((c) => { c.globalAlpha = alpha; draw(c); }); } });
}
/** 부품 표면에 붙은 인쇄: 그 부품 바로 다음에 그림 */
export function decal(id, draw, alpha = 1) { if (partReady(id)) item(partDepth(id) + 0.002, draw, alpha); }

/** 3차 베지에를 점 목록으로 (간격 ≈ step cm) */
export function bezier(a, b, c, d, step = 0.4) {
  const L = Math.hypot(...a.map((v, i) => d[i] - v)) + Math.hypot(...a.map((v, i) => b[i] - v)) + Math.hypot(...c.map((v, i) => d[i] - v));
  const n = Math.max(4, Math.ceil(L / step)); const out = [];
  for (let i = 0; i <= n; i++) { const t = i / n, u = 1 - t; out.push(a.map((_, k) => u * u * u * a[k] + 3 * u * u * t * b[k] + 3 * u * t * t * c[k] + t * t * t * d[k])); }
  return out;
}
/**
 * 굵은 선(전선·프로브 손잡이·다리). 2점씩 토막 내 토막마다 깊이를 매긴다.
 * 이음매: 외곽선은 토막 그대로(butt), 색은 앞뒤로 한 점씩 겹쳐 그려 어느 토막이 나중이든 이음매가 안 보임.
 */
export function tube(pts, w, color, { alpha = 1, piece = 2, bias = 0, caps = [true, true], ink = true, inkW = 2.2 } = {}) {
  const n = pts.length; if (n < 2) return;
  for (let i = 0; i < n - 1; i += piece) {
    const j = Math.min(n - 1, i + piece);
    const sub = pts.slice(i, j + 1), ext = pts.slice(Math.max(0, i - 1), Math.min(n, j + 2));
    const d = sub.reduce((acc, p) => acc + depth(p), 0) / sub.length + bias;
    const first = i === 0, last = j === n - 1;
    item(d, (c) => {
      const z = stage.CAM.zoom, cw = Math.max(1, w * z), iw = cw + inkW;
      const S = sub.map(proj), E = ext.map(proj);
      const line = (P) => { c.beginPath(); P.forEach((p, k) => (k ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y))); };
      const dot = (p, r, col) => { c.fillStyle = col; c.beginPath(); c.arc(p.x, p.y, r, 0, TAU); c.fill(); };
      c.lineCap = 'butt';
      if (ink) { c.strokeStyle = INK; c.lineWidth = iw; line(S); c.stroke(); if (first && caps[0]) dot(S[0], iw / 2, INK); if (last && caps[1]) dot(S.at(-1), iw / 2, INK); }
      c.strokeStyle = color; c.lineWidth = cw; line(E); c.stroke();
      if (first && caps[0]) dot(S[0], cw / 2, color); if (last && caps[1]) dot(S.at(-1), cw / 2, color);
    }, alpha);
  }
}
/** 곧은 막대를 토막 낸 점 목록 */
export const rod = (a, b, step = 0.5) => { const n = Math.max(1, Math.ceil(Math.hypot(...a.map((v, i) => b[i] - v)) / step)); return Array.from({ length: n + 1 }, (_, i) => mix3(a, b, i / n)); };

// ───────── 카메라 맞춤 ─────────
export const partPts = (id) => { const p = PARTS[id]; if (!p) return []; return p.foot.flatMap(([x, y]) => [V(x, y, 0), V(x, y, p.h)]); };
export const mixCam = (a, b, k) => ({ cx: lerp(a.cx, b.cx, k), cy: lerp(a.cy, b.cy, k), zoom: Math.exp(lerp(Math.log(a.zoom), Math.log(b.zoom), k)) });
export function fitCam(points, margin = 0.9, shift = [0, 0]) {
  const view = stage.VIEW; const q = points.map(rotOnly);
  const xs = q.map((p) => p.x), ys = q.map((p) => p.y);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const zoom = Math.min((view.W * margin) / (x1 - x0), (view.H * margin) / (y1 - y0));
  return { cx: (x0 + x1) / 2 + shift[0] * (x1 - x0), cy: (y0 + y1) / 2 + shift[1] * (y1 - y0), zoom };
}

// ───────── 그림자 (높이 1 cm당 화면 오른쪽 약간 아래로 밀림) ─────────
const shadowGroup = new Zdog.Group({ addTo: floorLayer });
function convexHull(P) {
  const p = P.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const q of p) { while (lo.length >= 2 && cr(lo.at(-2), lo.at(-1), q) <= 0) lo.pop(); lo.push(q); }
  for (const q of p.slice().reverse()) { while (up.length >= 2 && cr(up.at(-2), up.at(-1), q) <= 0) up.pop(); up.push(q); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}
function drawShadows(color = '70,82,190', SH = [0.62, -0.2]) {
  shadowGroup.children.slice().forEach((ch) => shadowGroup.removeChild(ch));
  for (const p of Object.values(PARTS)) {
    if (!p.on || !p.shadow) continue;
    const h = Math.min(p.h, 5);
    const hull = convexHull([...p.foot, ...p.foot.map(([a, b]) => [a + SH[0] * h, b + SH[1] * h])]);
    const k = 1 - clamp(p.lift / 22);
    new Zdog.Shape({ addTo: shadowGroup, path: hull.map(([a, b]) => V(a, b, 0.02)), closed: true, fill: true, stroke: false, color: `rgba(${color},${(0.95 * k).toFixed(3)})` });
  }
  shadowGroup.updateFlatGraph();
}

// ───────── 한 장면 그리기 ─────────
// paper: 바탕 · buildItems(): 이 순간의 전선·프로브·인쇄를 item()/tube()/decal()로 등록
export function renderScene({ cam, paper = '#f6f1e6', buildItems }) {
  const { ctx, VIEW } = stage; stage.CAM = cam;
  const d = VIEW.dpr;
  ctx.setTransform(d, 0, 0, d, 0, 0);
  ctx.fillStyle = paper; ctx.fillRect(0, 0, VIEW.cssW, VIEW.cssH);
  ctx.strokeStyle = '#1d20330a'; ctx.lineWidth = 1;
  for (let x = 0; x < VIEW.cssW; x += 24) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, VIEW.cssH); ctx.stroke(); }
  for (let y = 0; y < VIEW.cssH; y += 24) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(VIEW.cssW, y); ctx.stroke(); }

  for (const p of Object.values(PARTS)) { p.g.visible = p.on; p.g.translate.y = -p.lift; }
  if (floorLayer.children.at(-1) !== shadowGroup) { floorLayer.removeChild(shadowGroup); floorLayer.addChild(shadowGroup); } // 그림자는 책상 위에 (책상이 나중에 추가돼도)
  drawShadows();
  for (const o of outlines) o.s.stroke = o.keep ? o.w * 0.1 : (o.w * 1.6) / cam.zoom;
  scene.translate = new Zdog.Vector({ x: -cam.cx, y: -cam.cy, z: 0 });
  scene.update();

  ctx.save(); ctx.setTransform(d, 0, 0, d, 0, 0); ctx.translate(VIEW.cx, VIEW.cy); ctx.scale(cam.zoom, cam.zoom);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  floorLayer.updateFlatGraph(); floorLayer.flatGraph.forEach((it) => it.updateSortValue()); floorLayer.renderGraphCanvas(ctx);

  objLayer.updateFlatGraph();
  const graph = objLayer.flatGraph; graph.forEach((it) => it.updateSortValue());
  for (const p of Object.values(PARTS)) p.g.sortValue = partDepth(p.id);
  ITEMS = []; buildItems();
  const all = graph.concat(ITEMS).sort(Zdog.Anchor.shapeSorter);
  for (const it of all) it.render(ctx, Zdog.CanvasRenderer);
  ctx.restore();
}
