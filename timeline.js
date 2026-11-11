// A 키트 — 시간축 도우미: "장 표"만 주면 조립 낙하·장 전환·프로브 이동·카메라를 계산한다.
// 화면은 시간 t 하나의 함수 → 되감기·장 건너뛰기·속도 조절이 저절로 된다.
import { PARTS, A, anchorInfo, smooth, easeOut, seg, mix3, add3, V, fitCam, mixCam, partPts } from './engine.js';
import { plugTop, drawPlug, drawProbe } from './parts.js';

/** 프로브 기울기 (프로브 끝 → 손잡이 방향). 빨강은 오른쪽 뒤로, 검정은 왼쪽 뒤로 눕힌다. */
export const AX_RED = [0.09, -0.39, 0.92], AX_BLACK = [-0.39, 0.09, 0.92];

/**
 * @param {object} o
 *  order: 조립 순서(부품 id 배열) · build: { start, gap, drop }
 *  chapters: [{ id, t0, dur, at?: { r: 앵커, b: 앵커 }, target?: 부품 id, swap?: true(중간에 거꾸로 다시 댐), ... }]
 *  park: 첫 장 전 프로브가 놓인 자리 { r, b, ar, ab } · meter: 멀티미터 부품(카메라 기준)
 *  overview: 처음 전체 보기에 넣을 부품 id
 */
export function makeTimeline({ order, build = { start: 0.4, gap: 0.35, drop: 0.35 }, chapters, park, meter, overview }) {
  order.forEach((id, i) => { PARTS[id].t = build.start + i * build.gap; });
  const buildEnd = build.start + order.length * build.gap;
  const chapterAt = (t) => { for (let i = chapters.length - 1; i >= 0; i--) if (t >= chapters[i].t0) return i; return -1; };
  const tipOf = (name) => add3(A(name), [0, 0, anchorInfo(name)?.kind === 'hole' ? 0.04 : 0]);
  const poseOf = (c, swap = false) => { const r = tipOf(c.at.r), b = tipOf(c.at.b); return swap ? { r: b, b: r, ar: AX_BLACK, ab: AX_RED } : { r, b, ar: AX_RED, ab: AX_BLACK }; };
  const mixPose = (P, Q, k) => ({ r: mix3(P.r, Q.r, k), b: mix3(P.b, Q.b, k), ar: mix3(P.ar, Q.ar, k), ab: mix3(P.ab, Q.ab, k) });
  const endOf = (i) => { if (i < 0) return park; const c = chapters[i]; return c.at ? poseOf(c, c.swap) : endOf(i - 1); };
  const camOf = (c) => {
    if (!c) return fitCam(overview.flatMap(partPts), 0.8);
    if (c.cam) return c.cam();
    if (!c.at) return fitCam([...meter.pts, ...(c.target ? partPts(c.target) : [])], 0.9);
    const p = poseOf(c);
    const extra = [[p.r, AX_RED], [p.b, AX_BLACK]].flatMap(([q, ax]) => [V(...q), V(...add3(q, ax, 10))]);
    return fitCam([...meter.pts, ...extra, ...(c.target ? partPts(c.target) : [])], 0.78);
  };

  return {
    chapters, buildEnd, chapterAt,
    end: chapters.at(-1).t0 + chapters.at(-1).dur,
    /** 공통 상태. 장마다 값(표시창 등)은 lesson.js가 이 위에 덧붙인다. */
    stateAt(t) {
      for (const p of Object.values(PARTS)) { if (p.t == null) continue; const u = seg(t, p.t, p.t + build.drop); p.on = t >= p.t; p.lift = (1 - easeOut(u)) * 22; }
      const i = chapterAt(t), c = i >= 0 ? chapters[i] : null, u = c ? t - c.t0 : 0;
      const s = { t, ch: i, c, u, touch: false, swapped: false, probeAlpha: c ? 1 : 0 };
      // 프로브: 앞 장 자리 → 이 장 자리 (0.75~1.75 s, 포물선으로 들어 올려 옮김), 닿으면 touch
      let P = endOf(i - 1), lift = 0;
      if (c?.at) {
        const to = poseOf(c), k = smooth(seg(u, 0.75, 1.75));
        P = mixPose(P, to, k); lift = Math.sin(Math.PI * k) * 4; s.touch = k >= 1;
        if (c.swap && u >= 3.5) { // 떼었다가 빨강·검정을 바꿔 다시 댐
          const up = smooth(seg(u, 3.5, 3.75)), mv = smooth(seg(u, 3.75, 4.5));
          P = mixPose(to, poseOf(c, true), mv); lift = Math.max(up * 2.8 * (1 - mv), Math.sin(Math.PI * mv) * 2.8);
          s.touch = u >= 4.5; s.swapped = u >= 4.5;
        }
      }
      s.probes = { ...P, lift };
      s.cam = c ? mixCam(camOf(i > 0 ? chapters[i - 1] : null), camOf(c), smooth(seg(u, 0, 0.9))) : camOf(null);
      return s;
    },
  };
}

/** 플러그 2개 + 프로브 2개 + 선. red: { from: 'dmm.V', to: 'dmm.mA', k } 로 빨강 플러그를 옮길 수 있음 */
export function drawMeasure(s, { meterId = 'dmm', red = { from: `${meterId}.V` }, black = `${meterId}.COM` } = {}) {
  if (s.probeAlpha <= 0 || !PARTS[meterId].on) return;
  const a = Math.min(1, s.probeAlpha);
  const rp = plugTop(red.from, red.to ?? red.from, red.k ?? 0), bp = plugTop(black);
  drawPlug(bp, '#2a2b31', a); drawPlug(rp, '#c8382c', a);
  const up = [0, 0, s.probes.lift];
  drawProbe(add3(s.probes.b, up), s.probes.ab, '#2a2b31', bp, { alpha: a });
  drawProbe(add3(s.probes.r, up), s.probes.ar, '#c8382c', rp, { alpha: a });
}
