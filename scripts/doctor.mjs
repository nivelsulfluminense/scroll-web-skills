#!/usr/bin/env node
// Preflight. Reports what is missing instead of letting it surface later as a confusing error.
// Exit 1 only when a REQUIRED item is missing.
import { spawnSync } from "node:child_process";
import fs from "node:fs";

const rows = [];
const check = (name, required, fn) => {
  let result;
  try { result = fn(); } catch (e) { result = { ok: false, detail: e.message }; }
  rows.push({ name, required, ...result });
};
const run = (cmd, args) => spawnSync(cmd, args, { encoding: "utf8" });

check("node >= 22.18 (runs .ts scripts natively)", true, () => {
  const [maj, min] = process.versions.node.split(".").map(Number);
  return { ok: maj > 22 || (maj === 22 && min >= 18), detail: process.versions.node };
});

check("ffmpeg (full build)", true, () => {
  const ff = process.env.TK_FFMPEG || "ffmpeg";
  const r = run(ff, ["-hide_banner", "-filters"]);
  if (r.status !== 0) return { ok: false, detail: "not found (set TK_FFMPEG)" };
  const filters = r.stdout.split("\n").length;
  const webp = run(ff, ["-hide_banner", "-encoders"]).stdout.includes("libwebp");
  return { ok: filters > 200, detail: `${filters} filters, libwebp ${webp ? "yes" : "no (sharp fallback is used)"}` };
});

check("ffprobe", true, () => ({ ok: run("ffprobe", ["-version"]).status === 0, detail: "" }));

check("WebP encoder (libwebp or sharp)", true, () => {
  const ff = (run(process.env.TK_FFMPEG || "ffmpeg", ["-hide_banner", "-encoders"]).stdout ?? "").includes("libwebp");
  const sharp = spawnSync(process.execPath, ["-e", "import('sharp').then(()=>process.exit(0),()=>process.exit(1))"]).status === 0;
  return { ok: ff || sharp, detail: ff ? "ffmpeg libwebp" : sharp ? "sharp" : "neither: npm i -D sharp" };
});

check("playwright + chromium", true, () => {
  const r = spawnSync(process.execPath, ["-e", "import('playwright').then(async ({chromium})=>{const b=await chromium.launch();await b.close()}).then(()=>process.exit(0),e=>{console.error(e.message.split('\\n')[0]);process.exit(1)})"], { encoding: "utf8" });
  return { ok: r.status === 0, detail: r.status === 0 ? "launches" : `${r.stderr.trim()} -> npx playwright install chromium` };
});

check("playwright webkit (Safari engine)", false, () => {
  const r = spawnSync(process.execPath, ["-e", "import('playwright').then(async ({webkit})=>{const b=await webkit.launch();await b.close()}).then(()=>process.exit(0),()=>process.exit(1))"]);
  return { ok: r.status === 0, detail: r.status === 0 ? "launches" : "npx playwright install webkit (strongly recommended: iOS is WebKit)" };
});

check("lighthouse (optional performance/a11y/SEO numbers)", false, () => ({ ok: run("npx", ["--no-install", "lighthouse", "--version"]).status === 0, detail: "npm i -D lighthouse" }));

check("project brief", false, () => ({ ok: fs.existsSync(".10k/BRIEF.md"), detail: ".10k/BRIEF.md (created in phase 1)" }));

check("media provider key (only if generating)", false, () => {
  const keys = ["TK_MEDIA_PROVIDER", "KIE_AI_API_KEY", "OPENART_API_KEY", "HIGGSFIELD_API_KEY"].filter((k) => process.env[k]);
  return { ok: keys.length > 0, detail: keys.length ? keys.join(", ") : "none set. Fine for builds from the client's own photos and footage" };
});

let missingRequired = 0;
for (const r of rows) {
  const mark = r.ok ? "ok  " : r.required ? "MISS" : "--  ";
  if (!r.ok && r.required) missingRequired++;
  console.log(`${mark} ${r.name}${r.detail ? `: ${r.detail}` : ""}`);
}
console.log(missingRequired ? `\n${missingRequired} required item(s) missing. Fix them before phase 4.` : "\nReady.");
process.exit(missingRequired ? 1 : 0);
