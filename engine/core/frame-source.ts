import { loadOrder, nearestLoaded } from "./math";

export type Drawable = HTMLImageElement | ImageBitmap;

export interface FrameSetSpec {
  /** Number of frames in the sequence. */
  count: number;
  /** Returns the URL of frame `i` (0-based). */
  src: (i: number) => string;
  /** Intrinsic size, used before the first frame decodes (avoids layout jumps). */
  width?: number;
  height?: number;
}

export interface FrameSourceOptions {
  /** Parallel requests. 6 matches the HTTP/1.1 per-host limit; HTTP/2 tolerates more. */
  concurrency?: number;
  /** Frames to fetch right after the first and last (usually the key frames). */
  priority?: readonly number[];
  /** Fraction of failed frames above which the source reports a fatal error. */
  maxFailureRatio?: number;
  onProgress?: (loaded: number, total: number) => void;
  onFirstFrame?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Progressive loader for a WebP/AVIF/JPEG frame sequence.
 * It never blocks drawing: `nearest(i)` returns the closest decoded frame,
 * so the canvas shows an approximate frame instead of a blank one while loading.
 */
export class FrameSource {
  readonly spec: FrameSetSpec;
  private readonly frames: Array<Drawable | null>;
  private readonly failed = new Set<number>();
  private readonly opts: Required<Omit<FrameSourceOptions, "onProgress" | "onFirstFrame" | "onError">> & FrameSourceOptions;
  private loadedCount = 0;
  private cancelled = false;
  private started = false;

  constructor(spec: FrameSetSpec, options: FrameSourceOptions = {}) {
    if (!Number.isInteger(spec.count) || spec.count < 1) throw new Error("FrameSetSpec.count must be a positive integer");
    this.spec = spec;
    this.frames = new Array(spec.count).fill(null);
    this.opts = { concurrency: 6, priority: [], maxFailureRatio: 0.05, ...options };
  }

  get total(): number { return this.spec.count; }
  get loaded(): number { return this.loadedCount; }
  get complete(): boolean { return this.loadedCount + this.failed.size >= this.spec.count; }

  has(i: number): boolean { return this.frames[i] != null; }

  get(i: number): Drawable | null { return this.frames[i] ?? null; }

  /** Closest decoded frame to `i`, or null if nothing has decoded yet. */
  nearest(i: number): { index: number; image: Drawable } | null {
    const idx = nearestLoaded(i, (k) => this.frames[k] != null, this.spec.count);
    return idx < 0 ? null : { index: idx, image: this.frames[idx]! };
  }

  start(): void {
    if (this.started) return;
    this.started = true;
    const queue = loadOrder(this.spec.count, this.opts.priority);
    const worker = async () => {
      while (!this.cancelled && queue.length) {
        const i = queue.shift()!;
        try {
          const image = await decodeFrame(this.spec.src(i));
          if (this.cancelled) { closeDrawable(image); return; }
          this.frames[i] = image;
          this.loadedCount++;
          if (this.loadedCount === 1) this.opts.onFirstFrame?.();
          this.opts.onProgress?.(this.loadedCount, this.spec.count);
        } catch {
          this.failed.add(i);
          if (this.failed.size / this.spec.count > this.opts.maxFailureRatio) {
            this.opts.onError?.(new Error(`${this.failed.size} of ${this.spec.count} frames failed to load`));
            this.cancel();
            return;
          }
        }
      }
    };
    const workers = Math.max(1, Math.min(this.opts.concurrency, this.spec.count));
    for (let w = 0; w < workers; w++) void worker();
  }

  cancel(): void { this.cancelled = true; }

  dispose(): void {
    this.cancel();
    this.frames.forEach((f) => f && closeDrawable(f));
    this.frames.fill(null);
  }
}

async function decodeFrame(url: string): Promise<Drawable> {
  // createImageBitmap decodes off the main thread where supported (Chromium, Firefox, Safari 17+).
  if (typeof createImageBitmap === "function" && typeof fetch === "function") {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      return await createImageBitmap(await res.blob());
    } catch (error) {
      // A real HTTP error is final; anything else (old Safari, opaque blobs) falls back to <img>.
      if (error instanceof Error && error.message.startsWith("HTTP ")) throw error;
    }
  }
  const img = new Image();
  img.decoding = "async";
  img.src = url;
  await img.decode();
  return img;
}

function closeDrawable(d: Drawable): void {
  if ("close" in d && typeof d.close === "function") d.close();
}
