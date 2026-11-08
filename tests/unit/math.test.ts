import { describe, expect, it } from "vitest";
import {
  bandOpacity, bandPeak, clamp, coverRect, damp, dampAlpha, frameAt, frameIndexAt, linearKeys,
  loadOrder, nearestLoaded, normaliseKeys, parseBand, sectionProgress,
} from "../../engine/core/math";
import { framesFromManifest } from "../../engine/core/manifest";

describe("sectionProgress", () => {
  it("is 0 before the stage, 1 when the pin releases", () => {
    expect(sectionProgress(100, 4000, 1000)).toBe(0);
    expect(sectionProgress(0, 4000, 1000)).toBe(0);
    expect(sectionProgress(-1500, 4000, 1000)).toBeCloseTo(0.5);
    expect(sectionProgress(-3000, 4000, 1000)).toBe(1);
    expect(sectionProgress(-9000, 4000, 1000)).toBe(1);
  });
  it("handles a stage no taller than the viewport", () => {
    expect(sectionProgress(10, 800, 1000)).toBe(0);
    expect(sectionProgress(-1, 800, 1000)).toBe(1);
  });
});

describe("keys", () => {
  it("linear keys reproduce round(progress * (count - 1))", () => {
    const keys = linearKeys(120);
    for (const p of [0, 0.1, 0.33, 0.5, 0.77, 1]) expect(frameIndexAt(p, keys)).toBe(Math.round(p * 119));
  });
  it("equal frames create a hold", () => {
    const keys = normaliseKeys([[0, 0], [0.2, 50], [0.4, 50], [1, 99]], 100);
    expect(frameIndexAt(0.25, keys)).toBe(50);
    expect(frameIndexAt(0.39, keys)).toBe(50);
    expect(frameAt(0.7, keys)).toBeCloseTo(74.5);
  });
  it("normalises unsorted, out-of-range and partial keys", () => {
    const keys = normaliseKeys([[0.8, 500], [0.3, 10]], 100);
    expect(keys).toEqual([[0, 10], [0.3, 10], [0.8, 99], [1, 99]]);
  });
  it("rejects non-finite keys", () => {
    expect(() => normaliseKeys([[Number.NaN, 1]], 10)).toThrow();
  });
  it("is monotonic for monotonic keys (no backwards frames while scrolling down)", () => {
    const keys = normaliseKeys([[0, 0], [0.18, 60], [0.3, 60], [0.62, 160], [0.72, 160], [1, 246]], 247);
    let prev = -1;
    for (let p = 0; p <= 1.0001; p += 0.001) {
      const f = frameIndexAt(p, keys);
      expect(f).toBeGreaterThanOrEqual(prev);
      prev = f;
    }
  });
});

describe("damp", () => {
  it("is frame-rate independent", () => {
    let a = 0; for (let i = 0; i < 60; i++) a = damp(a, 1, 0.18, 1000 / 60);
    let b = 0; for (let i = 0; i < 30; i++) b = damp(b, 1, 0.18, 1000 / 30);
    let c = 0; for (let i = 0; i < 144; i++) c = damp(c, 1, 0.18, 1000 / 144);
    expect(a).toBeCloseTo(b, 6);
    expect(a).toBeCloseTo(c, 6);
  });
  it("smooth = 1 jumps straight to the target", () => {
    expect(dampAlpha(1, 16)).toBe(1);
  });
});

describe("bands", () => {
  it("parses the three forms", () => {
    expect(parseBand("0.2")).toMatchObject({ start: 0.2, end: 1, rampOut: 0 });
    expect(parseBand("0.1 0.6")).toMatchObject({ start: 0.1, end: 0.6 });
    expect(parseBand("0.1 0.9 0.05 0.4")).toEqual({ start: 0.1, end: 0.9, rampIn: 0.05, rampOut: 0.4 });
    expect(() => parseBand("0.6 0.1")).toThrow();
    expect(() => parseBand("abc")).toThrow();
  });
  it("reaches full opacity at its peak and is hidden outside", () => {
    const b = parseBand("0.1 0.6");
    expect(bandOpacity(b, 0.05)).toBe(0);
    expect(bandOpacity(b, bandPeak(b))).toBe(1);
    expect(bandOpacity(b, 0.7)).toBe(0);
  });
  it("greet: already visible at the start", () => {
    const b = parseBand("0 0.78 0");
    expect(bandOpacity(b, 0)).toBe(1);
  });
  it("scales ramps that exceed the window so the caption still peaks", () => {
    const b = parseBand("0.5 0.52 0.3 0.3");
    expect(b.rampIn + b.rampOut).toBeCloseTo(0.02);
    expect(bandOpacity(b, bandPeak(b))).toBeCloseTo(1);
  });
  it("hold-to-end stays visible at progress 1", () => {
    expect(bandOpacity(parseBand("0.7"), 1)).toBe(1);
  });
});

describe("coverRect", () => {
  it("crops a 16:9 frame for a portrait phone around the focal point", () => {
    const centred = coverRect(1600, 900, 390, 844);
    expect(centred.sh).toBeCloseTo(900);
    expect(centred.sx + centred.sw / 2).toBeCloseTo(800);
    const left = coverRect(1600, 900, 390, 844, 0.2, 0.5);
    expect(left.sx).toBeLessThan(centred.sx);
    expect(left.sx).toBeGreaterThanOrEqual(0);
  });
  it("never samples outside the image", () => {
    const r = coverRect(1600, 900, 390, 844, 0, 1);
    expect(r.sx).toBe(0);
    expect(r.sy + r.sh).toBeLessThanOrEqual(900);
  });
});

describe("loading", () => {
  it("loads endpoints and priorities first, every frame exactly once", () => {
    const order = loadOrder(100, [50, 75]);
    expect(order.slice(0, 4)).toEqual([0, 99, 50, 75]);
    expect(new Set(order).size).toBe(100);
  });
  it("finds the nearest decoded frame", () => {
    const loaded = new Set([0, 40, 99]);
    expect(nearestLoaded(37, (i) => loaded.has(i), 100)).toBe(40);
    expect(nearestLoaded(80, (i) => loaded.has(i), 100)).toBe(99);
    expect(nearestLoaded(5, () => false, 100)).toBe(-1);
  });
});

describe("manifest", () => {
  it("builds frame URLs from the ffmpeg pattern", () => {
    const spec = framesFromManifest({ version: 1, count: 3, width: 1600, height: 900, fps: 24, pattern: "frame-%04d.webp", start: 1 }, "/film/lg");
    expect(spec.src(0)).toBe("/film/lg/frame-0001.webp");
    expect(spec.src(2)).toBe("/film/lg/frame-0003.webp");
  });
});

describe("clamp", () => {
  it("treats NaN as the minimum", () => { expect(clamp(Number.NaN)).toBe(0); });
  it("treats undefined as the minimum (regression: smooth: undefined from the React adapter)", () => {
    expect(clamp(undefined as unknown as number, 0.0001, 1)).toBe(0.0001);
    expect(Number.isNaN(damp(0, 1, undefined as unknown as number, 16))).toBe(false);
  });
});
