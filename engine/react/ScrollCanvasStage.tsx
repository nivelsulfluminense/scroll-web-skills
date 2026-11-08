/**
 * React adapter for the 10K stage engine. SSR-safe: the server renders real
 * markup (headings, copy, poster) and the engine attaches on the client.
 * Works in TanStack Start, Vite SPA (Lovable legacy) and Next.js ("use client").
 */
"use client";

import {
  createContext, useContext, useEffect, useMemo, useRef, useSyncExternalStore,
  type CSSProperties, type ReactNode,
} from "react";
import { ScrollStage, type StageSnapshot, type StageStatus, type StageVariant } from "../core/scroll-stage";
import type { FrameKey } from "../core/math";

export interface ScrollCanvasStageProps {
  /** Accessible name of the scene, e.g. "Morning light over the roastery". */
  label: string;
  /** Variants, first matching media query wins. Put the portrait one first with media "(max-aspect-ratio: 3/4)". */
  variants: readonly StageVariant[];
  keys?: readonly FrameKey[];
  /** Scroll length of the stage in viewport heights (desktop). One vh per ~0.2 s of film feels deliberate. */
  spanVh?: number;
  /** Optional different scroll length on narrow screens. */
  spanVhMobile?: number;
  smooth?: number;
  /** Static fallback image shown before the first frame, on error, in reduced motion and without JS. */
  poster: { src: string; srcMobile?: string; alt?: string; width?: number; height?: number };
  /** Lets previews force a motion mode; production should leave "auto". */
  reducedMotion?: "auto" | "reduce" | "no-preference";
  className?: string;
  style?: CSSProperties;
  onStatus?: (status: StageStatus, error?: Error) => void;
  /** Captions (<StageBand>) and any bespoke layers that read --tk-p. */
  children?: ReactNode;
}

type Listener = () => void;

/** Tiny external store so children can subscribe to progress without re-rendering the stage. */
class SnapshotStore {
  private value: StageSnapshot = { progress: 0, target: 0, frame: 0, drawnFrame: -1, status: "idle" };
  private listeners = new Set<Listener>();
  get = () => this.value;
  set(next: StageSnapshot) { this.value = next; this.listeners.forEach((l) => l()); }
  subscribe = (l: Listener) => { this.listeners.add(l); return () => { this.listeners.delete(l); }; };
}

const StageContext = createContext<SnapshotStore | null>(null);

const SERVER_SNAPSHOT: StageSnapshot = { progress: 0, target: 0, frame: 0, drawnFrame: -1, status: "idle" };

/**
 * Subscribe to the stage from a child. Re-renders on every engine update, so use it for
 * low-frequency UI (a progress label, a step indicator). For per-frame visuals prefer CSS
 * reading `var(--tk-p)`, which costs no React render at all.
 */
export function useStageSnapshot(): StageSnapshot {
  const store = useContext(StageContext);
  if (!store) throw new Error("useStageSnapshot must be used inside <ScrollCanvasStage>");
  return useSyncExternalStore(store.subscribe, store.get, () => SERVER_SNAPSHOT);
}

export function ScrollCanvasStage(props: ScrollCanvasStageProps) {
  const {
    label, variants, keys, spanVh = 400, spanVhMobile, smooth, poster,
    reducedMotion = "auto", className, style, onStatus, children,
  } = props;
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<ScrollStage | null>(null);
  const store = useMemo(() => new SnapshotStore(), []);
  const onStatusRef = useRef(onStatus);
  onStatusRef.current = onStatus;

  // Rebuild the engine only when the media identity changes, not on every parent render.
  const variantKey = useMemo(
    () => JSON.stringify(variants.map((v) => ({ m: v.media, c: v.frames.count, s: v.frames.src(0), k: v.keys, f: v.focal }))),
    [variants],
  );
  const keysKey = JSON.stringify(keys ?? null);

  useEffect(() => {
    document.documentElement.classList.add("tk-js");
    const section = sectionRef.current;
    const canvas = canvasRef.current;
    if (!section || !canvas) return;
    const stage = new ScrollStage({
      section, canvas, variants, keys, smooth, reducedMotion,
      onUpdate: (s) => store.set(s),
      onStatus: (s, e) => onStatusRef.current?.(s, e),
    });
    stageRef.current = stage;
    return () => { stage.destroy(); stageRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- identity tracked by variantKey/keysKey
  }, [variantKey, keysKey, smooth, reducedMotion, store]);

  // Captions may change after mount (copy edits, i18n): let the engine re-read them.
  useEffect(() => { stageRef.current?.collectBands(); });

  const sectionStyle = {
    "--tk-span": `${spanVh}vh`,
    ...(spanVhMobile ? { "--tk-span-mobile": `${spanVhMobile}vh` } : {}),
    ...style,
  } as CSSProperties;

  return (
    <section
      ref={sectionRef}
      data-tk-stage=""
      data-tk-status="idle"
      aria-label={label}
      className={className}
      style={sectionStyle}
    >
      <div data-tk-pin="">
        <canvas ref={canvasRef} data-tk-canvas="" aria-hidden="true" />
        <picture>
          {poster.srcMobile ? <source media="(max-aspect-ratio: 3/4)" srcSet={poster.srcMobile} /> : null}
          <img
            data-tk-poster=""
            src={poster.src}
            alt={poster.alt ?? ""}
            width={poster.width}
            height={poster.height}
            fetchPriority="high"
            decoding="async"
          />
        </picture>
        <StageContext.Provider value={store}>{children}</StageContext.Provider>
      </div>
    </section>
  );
}

export interface StageBandProps {
  /** "in out", "in" (hold to end) or "in out rampIn rampOut", in stage progress units (0..1). */
  at: string;
  /** Adds a soft scrim behind this caption only. */
  scrim?: boolean;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

/** A caption that fades over a progress window. Real text, never baked into frames. */
export function StageBand({ at, scrim, className, style, children }: StageBandProps) {
  return (
    <div data-tk-band={at} data-tk-scrim={scrim ? "" : undefined} className={className} style={style}>
      {children}
    </div>
  );
}
