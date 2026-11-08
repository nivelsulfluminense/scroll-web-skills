/**
 * Pure math for the 10K stage engine. No DOM access here, so every function
 * is unit-tested in Node (tests/unit/math.test.ts).
 */

/** A `[progress, frame]` pair. Two consecutive keys with the same frame form a hold. */
export type FrameKey = readonly [progress: number, frame: number];

export function clamp(value: number, min = 0, max = 1): number {
  // Coerce first: an `undefined` that slipped through options must not become NaN downstream.
  const v = Number(value);
  if (Number.isNaN(v)) return min;
  return v < min ? min : v > max ? max : v + 0; // "+ 0" normalises -0
}

/**
 * Scroll progress of a pinned section, in [0, 1].
 * `sectionTop` is the section's top relative to the viewport (getBoundingClientRect().top),
 * `sectionHeight` its full height and `viewportHeight` the visible height.
 * The travel is `sectionHeight - viewportHeight`: progress hits 1 exactly when the
 * sticky child is about to release, so there is never dead scroll inside the stage.
 */
export function sectionProgress(sectionTop: number, sectionHeight: number, viewportHeight: number): number {
  const travel = sectionHeight - viewportHeight;
  if (travel <= 0) return sectionTop <= 0 ? 1 : 0;
  return clamp(-sectionTop / travel);
}

/** Default keys: a straight line from the first to the last frame (the classic formula). */
export function linearKeys(frameCount: number): FrameKey[] {
  return [[0, 0], [1, Math.max(0, frameCount - 1)]];
}

/**
 * Validates and normalises keys: sorted by progress, progress clamped to [0, 1],
 * frames clamped to the sequence, endpoints added if missing.
 * Throws on non-finite input because a silent fallback would hide an authoring bug.
 */
export function normaliseKeys(keys: readonly FrameKey[] | undefined, frameCount: number): FrameKey[] {
  if (frameCount < 1) throw new Error("frameCount must be at least 1");
  const last = frameCount - 1;
  if (!keys || keys.length === 0) return linearKeys(frameCount);
  for (const [p, f] of keys) {
    if (!Number.isFinite(p) || !Number.isFinite(f)) throw new Error(`Invalid key [${p}, ${f}]`);
  }
  const sorted = keys
    .map(([p, f]) => [clamp(p), clamp(Math.round(f), 0, last)] as FrameKey)
    .sort((a, b) => a[0] - b[0]);
  if (sorted[0][0] > 0) sorted.unshift([0, sorted[0][1]]);
  if (sorted[sorted.length - 1][0] < 1) sorted.push([1, sorted[sorted.length - 1][1]]);
  return sorted;
}

/**
 * Maps progress to a (fractional) frame position through piecewise-linear keys.
 * With linearKeys this reduces to `progress * (frameCount - 1)`.
 */
export function frameAt(progress: number, keys: readonly FrameKey[]): number {
  const p = clamp(progress);
  if (keys.length === 1) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [p1, f1] = keys[i];
    if (p <= p1) {
      const [p0, f0] = keys[i - 1];
      const span = p1 - p0;
      if (span <= 0) return f1;
      return f0 + (f1 - f0) * ((p - p0) / span);
    }
  }
  return keys[keys.length - 1][1];
}

/** Integer frame to draw. Rounding keeps forward and reverse scroll deterministic. */
export function frameIndexAt(progress: number, keys: readonly FrameKey[]): number {
  return Math.round(frameAt(progress, keys));
}

/**
 * Frame-rate independent exponential smoothing.
 * `smooth` is the fraction of the remaining distance covered per 60 Hz frame
 * (0 < smooth <= 1; 1 means no smoothing). The result is identical at 30, 60 or 144 Hz.
 */
export function dampAlpha(smooth: number, dtMs: number): number {
  const s = clamp(smooth, 0.0001, 1);
  if (s >= 1) return 1;
  const frames = Math.max(0, dtMs) / (1000 / 60);
  return 1 - Math.pow(1 - s, frames);
}

export function damp(current: number, target: number, smooth: number, dtMs: number): number {
  return current + (target - current) * dampAlpha(smooth, dtMs);
}

/**
 * A caption band: `"in out"` fades in around `in` and out around `out`.
 * Ramps default to 30% of the window on each side (capped so they never overlap).
 * `"in"` alone fades in and holds to the end of the stage.
 * `"in out rampIn rampOut"` sets explicit ramp lengths in progress units; 0 means a hard edge.
 */
export interface Band {
  start: number;
  end: number;
  rampIn: number;
  rampOut: number;
}

export function parseBand(spec: string): Band {
  const parts = spec.trim().split(/\s+/).filter(Boolean).map(Number);
  if (parts.length === 0 || parts.some((n) => !Number.isFinite(n))) {
    throw new Error(`Invalid band "${spec}". Use "in", "in out" or "in out rampIn rampOut".`);
  }
  const start = clamp(parts[0]);
  const end = parts.length >= 2 ? clamp(parts[1]) : 1;
  if (end < start) throw new Error(`Band "${spec}" ends before it starts.`);
  const width = end - start;
  const defaultRamp = Math.min(width * 0.3, width / 2);
  const holdsToEnd = parts.length === 1;
  let rampIn = parts.length >= 3 ? Math.max(0, parts[2]) : defaultRamp;
  let rampOut = holdsToEnd ? 0 : parts.length >= 4 ? Math.max(0, parts[3]) : defaultRamp;
  // Ramps longer than the window would keep the caption from ever reaching full opacity:
  // scale them down proportionally so the authored in/out ratio survives.
  if (rampIn + rampOut > width && rampIn + rampOut > 0) {
    const k = width / (rampIn + rampOut);
    rampIn *= k; rampOut *= k;
  }
  return { start, end, rampIn, rampOut };
}

/** Opacity in [0, 1] of a band at a given progress. */
export function bandOpacity(band: Band, progress: number): number {
  const p = clamp(progress);
  if (p < band.start || p > band.end) return 0;
  const fadeIn = band.rampIn === 0 ? 1 : clamp((p - band.start) / band.rampIn);
  const fadeOut = band.rampOut === 0 ? 1 : clamp((band.end - p) / band.rampOut);
  return smoothstep(Math.min(fadeIn, fadeOut));
}

/** The progress where a band is guaranteed fully opaque (used by QA to sample it). */
export function bandPeak(band: Band): number {
  const plateauStart = band.start + band.rampIn;
  const plateauEnd = band.end - band.rampOut;
  return clamp(plateauEnd >= plateauStart ? (plateauStart + plateauEnd) / 2 : (band.start + band.end) / 2);
}

export function smoothstep(t: number): number {
  const x = clamp(t);
  return x * x * (3 - 2 * x);
}

/**
 * Source rectangle for drawing an image into a canvas with `object-fit: cover`
 * semantics and a focal point (0..1 on each axis). The focal point keeps the
 * subject inside the crop on portrait phones.
 */
export interface Rect { sx: number; sy: number; sw: number; sh: number }

export function coverRect(
  imageW: number, imageH: number, targetW: number, targetH: number,
  focalX = 0.5, focalY = 0.5,
): Rect {
  if (imageW <= 0 || imageH <= 0 || targetW <= 0 || targetH <= 0) return { sx: 0, sy: 0, sw: imageW, sh: imageH };
  const scale = Math.max(targetW / imageW, targetH / imageH);
  const sw = targetW / scale;
  const sh = targetH / scale;
  const sx = clamp(imageW * clamp(focalX) - sw / 2, 0, imageW - sw);
  const sy = clamp(imageH * clamp(focalY) - sh / 2, 0, imageH - sh);
  return { sx, sy, sw, sh };
}

/**
 * Load order for a frame sequence: first and last frame, the key frames,
 * then a breadth-first bisection so any scroll position soon has a near neighbour.
 */
export function loadOrder(frameCount: number, priority: readonly number[] = []): number[] {
  const seen = new Set<number>();
  const order: number[] = [];
  const push = (i: number) => {
    if (i >= 0 && i < frameCount && !seen.has(i)) { seen.add(i); order.push(i); }
  };
  push(0);
  push(frameCount - 1);
  priority.forEach((i) => push(Math.round(i)));
  const queue: Array<[number, number]> = [[0, frameCount - 1]];
  while (queue.length) {
    const [a, b] = queue.shift()!;
    if (b - a < 2) continue;
    const mid = (a + b) >> 1;
    push(mid);
    queue.push([a, mid], [mid, b]);
  }
  for (let i = 0; i < frameCount; i++) push(i);
  return order;
}

/** Nearest loaded index to `wanted`, searching outward. Returns -1 if nothing is loaded. */
export function nearestLoaded(wanted: number, isLoaded: (i: number) => boolean, frameCount: number): number {
  if (isLoaded(wanted)) return wanted;
  for (let d = 1; d < frameCount; d++) {
    if (wanted - d >= 0 && isLoaded(wanted - d)) return wanted - d;
    if (wanted + d < frameCount && isLoaded(wanted + d)) return wanted + d;
  }
  return -1;
}
