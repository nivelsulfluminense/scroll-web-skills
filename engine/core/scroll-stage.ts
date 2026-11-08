import { FrameSource, type FrameSetSpec, type Drawable } from "./frame-source";
import {
  bandOpacity, bandPeak, coverRect, damp, frameIndexAt, normaliseKeys, parseBand, sectionProgress,
  type Band, type FrameKey,
} from "./math";

export type StageStatus = "idle" | "loading" | "ready" | "reduced" | "error";

export interface StageVariant {
  /** Media query that selects this variant. The first match wins; omit on the default (last) variant. */
  media?: string;
  frames: FrameSetSpec;
  /** Keys for this variant (portrait films often have their own timing). Falls back to the stage keys. */
  keys?: readonly FrameKey[];
  /** Focal point of the subject, 0..1 on each axis. Keeps the subject in frame on portrait crops. */
  focal?: readonly [number, number];
}

export interface StageSnapshot {
  progress: number;       // smoothed progress actually rendered
  target: number;         // raw scroll progress
  frame: number;          // frame requested by the progress
  drawnFrame: number;     // frame actually on the canvas (may differ while loading)
  status: StageStatus;
}

export interface ScrollStageOptions {
  /** The tall element whose scroll range drives the stage. Its sticky child holds the canvas. */
  section: HTMLElement;
  canvas: HTMLCanvasElement;
  variants: readonly StageVariant[];
  keys?: readonly FrameKey[];
  /** Fraction of remaining distance per 60 Hz frame. 1 = no smoothing; set 1 if Lenis already smooths. */
  smooth?: number;
  /** Device-pixel-ratio cap. 2 is visually lossless for photographic frames and halves memory vs 3. */
  maxDpr?: number;
  /** "auto" follows the OS setting live; the others force a mode (useful for previews and tests). */
  reducedMotion?: "auto" | "reduce" | "no-preference";
  /** Frame shown in reduced motion and before loading. Defaults to the last key frame (the resolved state). */
  posterFrame?: number;
  onUpdate?: (s: StageSnapshot) => void;
  onStatus?: (status: StageStatus, error?: Error) => void;
}

const SETTLE_EPSILON = 0.0005;

/**
 * Pinned canvas stage. Native `position: sticky` does the pinning, so the page
 * never hijacks scroll; this class only reads scroll position and paints.
 *
 * Contract with the markup (the engine never creates DOM):
 *   <section data-tk-stage style="--tk-span: 500vh">
 *     <div data-tk-pin>
 *       <canvas data-tk-canvas></canvas>
 *       <img data-tk-poster ...>            optional static fallback
 *       <div data-tk-band="0.1 0.4">...</div>  captions
 *     </div>
 *   </section>
 *
 * Published state, readable from CSS and from QA:
 *   --tk-p on the section (smoothed progress), data-tk-status, data-tk-frame,
 *   data-tk-drawn, data-tk-settled ("1" when idle), data-tk-motion ("full" | "reduced").
 */
export class ScrollStage {
  private readonly o: Required<Omit<ScrollStageOptions, "onUpdate" | "onStatus" | "posterFrame" | "keys">> & ScrollStageOptions;
  private readonly ctx: CanvasRenderingContext2D;
  private source: FrameSource | null = null;
  private variant: StageVariant | null = null;
  private keys: FrameKey[] = [];
  private bands: Array<{ el: HTMLElement; band: Band }> = [];
  private status: StageStatus = "idle";
  private current = 0;
  private target = 0;
  private drawn = -1;
  private wanted = 0;
  private raf = 0;
  private last = 0;
  private visible = true;
  private reduced = false;
  private destroyed = false;
  private cleanups: Array<() => void> = [];

  constructor(options: ScrollStageOptions) {
    if (!options.variants.length) throw new Error("ScrollStage needs at least one variant");
    // `??` rather than spread: adapters pass `smooth: undefined`, which a spread would keep.
    this.o = {
      ...options,
      smooth: options.smooth ?? 0.18,
      maxDpr: options.maxDpr ?? 2,
      reducedMotion: options.reducedMotion ?? "auto",
    };
    const ctx = options.canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("2D canvas context unavailable");
    this.ctx = ctx;
    this.collectBands();
    this.bindEnvironment();
    this.selectVariant();
  }

  /** Current state, for adapters and tests. */
  snapshot(): StageSnapshot {
    return { progress: this.current, target: this.target, frame: this.wanted, drawnFrame: this.drawn, status: this.status };
  }

  /** Re-reads [data-tk-band] children, e.g. after a framework re-render changed them. */
  collectBands(): void {
    this.bands = Array.from(this.o.section.querySelectorAll<HTMLElement>("[data-tk-band]")).map((el) => ({
      el, band: parseBand(el.dataset.tkBand ?? "0 1"),
    }));
    this.wake();
  }

  destroy(): void {
    this.destroyed = true;
    cancelAnimationFrame(this.raf);
    this.cleanups.forEach((fn) => fn());
    this.cleanups = [];
    this.source?.dispose();
    this.source = null;
  }

  // ---------------------------------------------------------------- environment

  private bindEnvironment(): void {
    const onScroll = () => this.wake();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    this.cleanups.push(() => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    });

    const ro = new ResizeObserver(() => { this.resizeCanvas(); this.drawn = -1; this.wake(); });
    ro.observe(this.o.canvas);
    this.cleanups.push(() => ro.disconnect());

    const io = new IntersectionObserver(([entry]) => {
      this.visible = entry.isIntersecting;
      if (this.visible) this.wake();
    }, { rootMargin: "50% 0px" });
    io.observe(this.o.section);
    this.cleanups.push(() => io.disconnect());

    // Variant and motion preferences are re-evaluated live (rotation, OS toggle).
    const queries = this.o.variants.filter((v) => v.media).map((v) => matchMedia(v.media!));
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const onMedia = () => this.selectVariant();
    [...queries, motion].forEach((q) => q.addEventListener("change", onMedia));
    this.cleanups.push(() => [...queries, motion].forEach((q) => q.removeEventListener("change", onMedia)));

    // Keyboard users: focusing a control inside a caption scrolls to where that caption is fully visible.
    const onFocus = (e: FocusEvent) => {
      if (this.reduced) return;
      const host = (e.target as HTMLElement).closest<HTMLElement>("[data-tk-band]");
      const item = this.bands.find((b) => b.el === host);
      if (item) this.scrollToProgress(bandPeak(item.band));
    };
    this.o.section.addEventListener("focusin", onFocus);
    this.cleanups.push(() => this.o.section.removeEventListener("focusin", onFocus));
  }

  private prefersReduced(): boolean {
    if (this.o.reducedMotion === "reduce") return true;
    if (this.o.reducedMotion === "no-preference") return false;
    return matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  private selectVariant(): void {
    if (this.destroyed) return;
    const reduced = this.prefersReduced();
    const next = this.o.variants.find((v) => !v.media || matchMedia(v.media).matches) ?? this.o.variants[this.o.variants.length - 1];
    const modeChanged = reduced !== this.reduced;
    this.reduced = reduced;
    this.o.section.dataset.tkMotion = reduced ? "reduced" : "full";
    if (next === this.variant && !modeChanged && this.source) { this.wake(); return; }

    this.variant = next;
    this.keys = normaliseKeys(next.keys ?? this.o.keys, next.frames.count);
    this.source?.dispose();
    this.drawn = -1;
    this.resizeCanvas();

    const poster = this.posterIndex();
    if (reduced) {
      // Hand captions back to the stylesheet: in reduced motion they are laid out statically.
      for (const { el } of this.bands) { el.style.removeProperty("opacity"); el.style.removeProperty("pointer-events"); el.style.setProperty("--tk-band", "1"); }
    }
    this.setStatus(reduced ? "reduced" : "loading");
    this.source = new FrameSource(
      // Reduced motion only needs the poster frame: one request instead of hundreds.
      reduced ? { ...next.frames, count: 1, src: () => next.frames.src(poster) } : next.frames,
      {
        priority: this.keys.map((k) => k[1]),
        onFirstFrame: () => { if (!this.reduced) this.setStatus("ready"); this.wake(); },
        onProgress: () => this.wake(),
        onError: (err) => this.setStatus("error", err),
      },
    );
    this.source.start();
    this.wake();
  }

  private posterIndex(): number {
    const last = this.variant!.frames.count - 1;
    if (this.o.posterFrame != null) return Math.max(0, Math.min(last, Math.round(this.o.posterFrame)));
    return this.keys[this.keys.length - 1][1];
  }

  private resizeCanvas(): void {
    const c = this.o.canvas;
    const dpr = Math.min(window.devicePixelRatio || 1, this.o.maxDpr);
    const w = Math.max(1, Math.round(c.clientWidth * dpr));
    const h = Math.max(1, Math.round(c.clientHeight * dpr));
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
  }

  private setStatus(status: StageStatus, error?: Error): void {
    if (this.status === status) return;
    this.status = status;
    this.o.section.dataset.tkStatus = status;
    this.o.onStatus?.(status, error);
    this.o.section.dispatchEvent(new CustomEvent("tk:status", { detail: { status, error }, bubbles: true }));
  }

  private scrollToProgress(p: number): void {
    const rect = this.o.section.getBoundingClientRect();
    const travel = rect.height - window.innerHeight;
    const top = window.scrollY + rect.top + travel * p;
    window.scrollTo({ top, behavior: "auto" });
  }

  // ---------------------------------------------------------------- loop

  private wake(): void {
    if (this.destroyed || this.raf) return;
    this.o.section.dataset.tkSettled = "0";
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.tick);
  }

  private readonly tick = (now: number): void => {
    this.raf = 0;
    const dt = Math.min(100, now - this.last); // a long tab-away must not produce a jump
    this.last = now;

    const rect = this.o.section.getBoundingClientRect();
    this.target = sectionProgress(rect.top, rect.height, window.innerHeight);

    if (this.reduced) {
      this.current = this.target;
      this.renderFrame(0, 0);
      this.publish();
      this.settle();
      return;
    }

    this.current = damp(this.current, this.target, this.o.smooth, dt);
    if (Math.abs(this.target - this.current) < SETTLE_EPSILON) this.current = this.target;

    this.wanted = frameIndexAt(this.current, this.keys);
    if (this.visible) this.renderFrame(this.wanted, this.wanted);
    this.updateBands(this.current);
    this.publish();

    if (this.current !== this.target) { this.raf = requestAnimationFrame(this.tick); return; }
    // At rest. If the exact frame is still downloading, its arrival wakes the loop (onProgress),
    // so there is no busy-wait; QA treats "settled" as exact frame on canvas or nothing left to load.
    if (this.drawn === this.wanted || (this.source?.complete ?? true) || !this.visible) this.settle();
  };

  private settle(): void {
    this.o.section.dataset.tkSettled = "1";
  }

  /** Draws `wanted` (or its nearest decoded neighbour). `logical` is what QA reads back. */
  private renderFrame(wanted: number, logical: number): void {
    if (!this.source || !this.variant) return;
    const hit = this.source.nearest(wanted);
    if (!hit || hit.index === this.drawn) return;
    this.paint(hit.image, this.variant.focal);
    // In reduced mode the source holds a single frame whose real index is the poster.
    this.drawn = this.reduced ? this.posterIndex() : hit.index;
    this.o.section.dataset.tkDrawn = String(this.drawn);
    this.o.section.dataset.tkFrame = String(this.reduced ? this.drawn : logical);
  }

  private paint(image: Drawable, focal: readonly [number, number] = [0.5, 0.5]): void {
    const { width, height } = this.o.canvas;
    const iw = "naturalWidth" in image ? image.naturalWidth : image.width;
    const ih = "naturalHeight" in image ? image.naturalHeight : image.height;
    const r = coverRect(iw, ih, width, height, focal[0], focal[1]);
    this.ctx.drawImage(image, r.sx, r.sy, r.sw, r.sh, 0, 0, width, height);
  }

  private updateBands(p: number): void {
    for (const { el, band } of this.bands) {
      const a = bandOpacity(band, p);
      el.style.opacity = a.toFixed(3);
      el.style.setProperty("--tk-band", a.toFixed(3));
      // Invisible captions must not swallow clicks; their text stays in the accessibility tree.
      el.style.pointerEvents = a > 0.5 ? "" : "none";
    }
  }

  private publish(): void {
    this.o.section.style.setProperty("--tk-p", this.current.toFixed(4));
    this.o.onUpdate?.(this.snapshot());
  }
}
