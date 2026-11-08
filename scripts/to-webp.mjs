#!/usr/bin/env node
// Fallback WebP encoder for ffmpeg builds without libwebp (common on Linux distro packages).
// Usage: node to-webp.mjs <png_dir> <out_dir> <quality>
// Converts frame-NNNN.png to frame-NNNN.webp with the same numbering. Requires `sharp`.
import fs from "node:fs";
import path from "node:path";

const [src, out, q = "78"] = process.argv.slice(2);
if (!src || !out) { console.error("usage: to-webp.mjs <png_dir> <out_dir> [quality]"); process.exit(2); }

let sharp;
try { sharp = (await import("sharp")).default; } catch {
  console.error("No WebP encoder: install sharp (npm i -D sharp) or an ffmpeg build with libwebp.");
  process.exit(1);
}

fs.mkdirSync(out, { recursive: true });
const files = fs.readdirSync(src).filter((f) => /^frame-\d+\.png$/.test(f)).sort();
const quality = Number(q);
let i = 0;
// Bounded parallelism keeps memory flat on long sequences.
async function worker() {
  while (i < files.length) {
    const f = files[i++];
    await sharp(path.join(src, f)).webp({ quality, effort: 5 }).toFile(path.join(out, f.replace(/\.png$/, ".webp")));
  }
}
await Promise.all(Array.from({ length: 4 }, worker));
console.log(`to-webp: ${files.length} frames encoded with sharp (q${quality})`);
