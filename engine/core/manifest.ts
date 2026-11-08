import type { FrameSetSpec } from "./frame-source";

/**
 * Written by `scripts/process-media.sh frames` next to the frames (manifest.json).
 * Keeping count, size and naming in one file means markup never hard-codes them.
 */
export interface FrameManifest {
  version: 1;
  count: number;
  width: number;
  height: number;
  fps: number;
  /** printf-style pattern relative to the manifest, e.g. "frame-%04d.webp". */
  pattern: string;
  /** Index of the first file on disk (ffmpeg -start_number). */
  start: number;
}

export function framesFromManifest(manifest: FrameManifest, baseUrl: string): FrameSetSpec {
  if (manifest.version !== 1) throw new Error(`Unsupported manifest version ${manifest.version}`);
  const base = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  const m = /%0(\d+)d/.exec(manifest.pattern);
  if (!m) throw new Error(`Manifest pattern "${manifest.pattern}" must contain %0Nd`);
  const pad = Number(m[1]);
  return {
    count: manifest.count,
    width: manifest.width,
    height: manifest.height,
    src: (i) => base + manifest.pattern.replace(m[0], String(i + manifest.start).padStart(pad, "0")),
  };
}
