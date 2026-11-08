#!/usr/bin/env node
/**
 * 10K QA audit: technical invariants of a scroll-stage page, checked in real browsers.
 *
 *   node scripts/qa-audit.ts --url http://127.0.0.1:4600 [--out qa-report]
 *        [--viewports desktop,mobile] [--browsers chromium,webkit] [--steps 10]
 *        [--config qa.config.json] [--lighthouse]
 *
 * What it proves (exit 1 on any "fail"):
 *   - no page errors, console errors, failed or 4xx/5xx requests, horizontal overflow
 *   - every [data-tk-stage] becomes ready, paints a non-blank canvas, lands on the exact frame
 *   - frames never run backwards on a downward scroll, and the same position gives the same
 *     frame on the way down and on the way back up (deterministic seeking)
 *   - no dead scroll: consecutive positions where neither the frame nor any caption changes
 *   - every caption reaches full opacity at its peak, with WCAG contrast measured against the
 *     actual pixels behind it (scrims included, text hidden for the measurement)
 *   - reduced motion: stage unpinned, every caption visible; no JS: poster and headline present
 *   - keyboard: focused controls are visible and show a focus indicator
 *   - page weight against per-viewport budgets
 *
 * What it does NOT prove: that the page is beautiful, that the story lands, that type moves
 * with the film, or that a physical iPhone behaves like emulated WebKit. Those stay human
 * reviews (references/08-qa.md). Say so in every report.
 */
import { chromium, webkit, type Browser, type BrowserContext, type BrowserContextOptions, type Page } from "playwright";
import { PNG } from "pngjs";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { bandPeak, parseBand } from "../engine/core/math.ts";

// ------------------------------------------------------------------ config

type Severity = "fail" | "warn" | "info";
interface Finding { severity: Severity; check: string; where: string; message: string }

interface Config {
  steps: number;
  settleTimeoutMs: number;
  readyTimeoutMs: number;
  budgetsMB: Record<string, number>;
  minContrast: number;
  minContrastLarge: number;
  deadScrollSteps: number;
  minBandVh: number;
  ignoreConsole: string[];
}

const DEFAULTS: Config = {
  steps: 10,
  settleTimeoutMs: 10_000,
  readyTimeoutMs: 20_000,
  budgetsMB: { desktop: 20, mobile: 8 },
  minContrast: 4.5,
  minContrastLarge: 3,
  deadScrollSteps: 2,
  minBandVh: 0.5,
  ignoreConsole: [],
};

const VIEWPORTS: Record<string, BrowserContextOptions> = {
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
  mobile: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
};

function parseArgs(argv: string[]) {
  const get = (name: string, fallback?: string) => {
    const i = argv.indexOf(`--${name}`);
    return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : fallback;
  };
  const url = get("url");
  if (!url) {
    console.error("usage: node scripts/qa-audit.ts --url <http://...> [--out dir] [--viewports desktop,mobile] [--browsers chromium,webkit] [--steps N] [--config file] [--lighthouse]");
    process.exit(2);
  }
  const fileConfig = get("config") ? JSON.parse(fs.readFileSync(get("config")!, "utf8")) : {};
  const config: Config = { ...DEFAULTS, ...fileConfig, budgetsMB: { ...DEFAULTS.budgetsMB, ...(fileConfig.budgetsMB ?? {}) } };
  if (get("steps")) config.steps = Math.max(2, Number(get("steps")));
  return {
    url,
    out: path.resolve(get("out", "qa-report")!),
    viewports: get("viewports", "desktop,mobile")!.split(",").map((s) => s.trim()).filter(Boolean),
    browsers: get("browsers", "chromium")!.split(",").map((s) => s.trim()).filter(Boolean),
    lighthouse: argv.includes("--lighthouse"),
    config,
  };
}

// ------------------------------------------------------------------ helpers

const findings: Finding[] = [];
const shots: Array<{ file: string; label: string }> = [];
const add = (severity: Severity, check: string, where: string, message: string) => findings.push({ severity, check, where, message });

async function nextFrames(page: Page): Promise<void> {
  await page.evaluate(() => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))));
}

async function waitSettled(page: Page, index: number, timeout: number): Promise<boolean> {
  await nextFrames(page);
  try {
    await page.waitForFunction(
      (i) => document.querySelectorAll<HTMLElement>("[data-tk-stage]")[i]?.dataset.tkSettled === "1",
      index, { timeout, polling: 50 },
    );
    return true;
  } catch { return false; }
}

interface StageGeometry { top: number; travel: number; viewportH: number }

async function stageGeometry(page: Page, index: number): Promise<StageGeometry> {
  return page.evaluate((i) => {
    const el = document.querySelectorAll<HTMLElement>("[data-tk-stage]")[i];
    const r = el.getBoundingClientRect();
    return { top: r.top + window.scrollY, travel: r.height - window.innerHeight, viewportH: window.innerHeight };
  }, index);
}

interface StageReading { frame: number; drawn: number; progress: number; bands: number[]; status: string }

async function readStage(page: Page, index: number): Promise<StageReading> {
  return page.evaluate((i) => {
    const el = document.querySelectorAll<HTMLElement>("[data-tk-stage]")[i];
    return {
      frame: Number(el.dataset.tkFrame ?? -1),
      drawn: Number(el.dataset.tkDrawn ?? -1),
      progress: Number(getComputedStyle(el).getPropertyValue("--tk-p") || "0"),
      bands: Array.from(el.querySelectorAll<HTMLElement>("[data-tk-band]")).map((b) => Number(getComputedStyle(b).opacity)),
      status: el.dataset.tkStatus ?? "none",
    };
  }, index);
}

/** Standard deviation of luminance over a coarse grid of canvas pixels. ~0 means a blank canvas. */
async function canvasSpread(page: Page, index: number): Promise<number | null> {
  return page.evaluate((i) => {
    const c = document.querySelectorAll<HTMLElement>("[data-tk-stage]")[i]?.querySelector("canvas");
    if (!c || !c.width || !c.height) return null;
    try {
      const probe = document.createElement("canvas");
      probe.width = 32; probe.height = 32;
      const ctx = probe.getContext("2d")!;
      ctx.drawImage(c, 0, 0, 32, 32);
      const d = ctx.getImageData(0, 0, 32, 32).data;
      const ys: number[] = [];
      for (let k = 0; k < d.length; k += 4) ys.push(0.2126 * d[k] + 0.7152 * d[k + 1] + 0.0722 * d[k + 2]);
      const mean = ys.reduce((a, b) => a + b, 0) / ys.length;
      return Math.sqrt(ys.reduce((a, b) => a + (b - mean) ** 2, 0) / ys.length);
    } catch { return null; } // tainted canvas (cross-origin frames without CORS)
  }, index);
}

function relLuminance([r, g, b]: number[]): number {
  const lin = (c: number) => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}
const contrastRatio = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

function parseColor(css: string): number[] | null {
  const m = /rgba?\(([^)]+)\)/.exec(css);
  if (!m) return null;
  const parts = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
  return [parts[0], parts[1], parts[2], parts.length > 3 ? parts[3] : 1];
}

/** Luminance percentile of a PNG region (the background with text hidden). */
function luminancePercentile(png: Buffer, pct: number): number {
  const img = PNG.sync.read(png);
  const ys: number[] = [];
  for (let k = 0; k < img.data.length; k += 16) ys.push(relLuminance([img.data[k], img.data[k + 1], img.data[k + 2]]));
  ys.sort((a, b) => a - b);
  return ys[Math.min(ys.length - 1, Math.floor((pct / 100) * ys.length))] ?? 0;
}

async function shoot(page: Page, out: string, name: string, label: string, fullPage = false) {
  const file = path.join(out, "shots", `${name}.png`);
  await page.screenshot({ path: file, fullPage });
  shots.push({ file: path.relative(out, file), label });
}

// ------------------------------------------------------------------ checks

function watchPage(page: Page, where: string, config: Config, bytes: { total: number }) {
  page.on("pageerror", (e) => add("fail", "page-error", where, e.message));
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    const text = m.text();
    if (config.ignoreConsole.some((s) => text.includes(s))) return;
    add("fail", "console-error", where, text.slice(0, 300));
  });
  page.on("requestfailed", (r) => {
    const reason = r.failure()?.errorText ?? "failed";
    if (/ERR_ABORTED|cancelled|NS_BINDING_ABORTED/i.test(reason)) return; // superseded loads, not defects
    add("fail", "request-failed", where, `${r.url()} (${reason})`);
  });
  page.on("response", async (res) => {
    if (res.status() >= 400) add("fail", "http-status", where, `${res.status()} ${res.url()}`);
    try { bytes.total += (await res.request().sizes()).responseBodySize; } catch { /* ignore */ }
  });
}

async function checkOverflow(page: Page, where: string) {
  const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (over > 1) add("fail", "horizontal-overflow", where, `page is ${over}px wider than the viewport`);
}

async function auditStage(page: Page, index: number, where: string, out: string, tag: string, config: Config) {
  const at = `${where} stage#${index}`;
  try {
    await page.waitForFunction(
      (i) => ["ready", "reduced", "error"].includes(document.querySelectorAll<HTMLElement>("[data-tk-stage]")[i]?.dataset.tkStatus ?? ""),
      index, { timeout: config.readyTimeoutMs },
    );
  } catch {
    add("fail", "stage-ready", at, `not ready after ${config.readyTimeoutMs} ms (status stayed loading/idle)`);
    return;
  }
  const first = await readStage(page, index);
  if (first.status === "error") { add("fail", "stage-ready", at, "engine reported status=error (frames failed to load)"); return; }

  const geo = await stageGeometry(page, index);
  if (geo.travel <= 0) add("warn", "stage-span", at, "stage is not taller than the viewport, so nothing scrubs");

  const positions = Array.from({ length: config.steps + 1 }, (_, k) => k / config.steps);
  const down: StageReading[] = [];
  let unsettled = 0;

  for (const [k, p] of positions.entries()) {
    await page.evaluate((y) => window.scrollTo(0, y), geo.top + geo.travel * p);
    if (!(await waitSettled(page, index, config.settleTimeoutMs))) {
      add("fail", "settle", at, `did not settle at p=${p.toFixed(2)}`);
      if (++unsettled >= 3) { add("fail", "settle", at, "aborting this stage: the engine never comes to rest (NaN progress or a busy loop?)"); return; }
    }
    const r = await readStage(page, index);
    down.push(r);
    if (Math.abs(r.progress - p) > 0.01) add("fail", "progress", at, `scroll p=${p.toFixed(2)} but engine shows ${r.progress.toFixed(3)}`);
    if (r.drawn !== r.frame) add("warn", "exact-frame", at, `p=${p.toFixed(2)} wants frame ${r.frame}, canvas shows ${r.drawn} (still loading or failed frame)`);
    if (k === 0 || k === positions.length - 1 || k === Math.floor(positions.length / 2)) {
      const spread = await canvasSpread(page, index);
      if (spread === null) add("warn", "blank-canvas", at, "canvas could not be sampled (cross-origin frames?)");
      else if (spread < 1.5) add("fail", "blank-canvas", at, `canvas is a flat colour at p=${p.toFixed(2)} (luminance sd ${spread.toFixed(2)})`);
    }
    await shoot(page, out, `${tag}-s${index}-p${String(k).padStart(2, "0")}`, `${where} · p=${p.toFixed(2)} · frame ${r.frame}`);
  }

  for (let k = 1; k < down.length; k++) {
    if (down[k].frame < down[k - 1].frame) add("fail", "monotonic", at, `frame went backwards on a downward scroll: ${down[k - 1].frame} -> ${down[k].frame}`);
  }

  // Dead scroll: N consecutive steps where neither the frame nor any caption changes.
  let still = 0;
  for (let k = 1; k < down.length; k++) {
    const same = down[k].frame === down[k - 1].frame && down[k].bands.every((b, j) => Math.abs(b - (down[k - 1].bands[j] ?? 0)) < 0.02);
    still = same ? still + 1 : 0;
    if (still === config.deadScrollSteps) {
      add("warn", "dead-scroll", at, `nothing changes between p=${positions[k - still].toFixed(2)} and p=${positions[k].toFixed(2)}. If this silence is authored, record it in BRIEF.md`);
    }
  }

  // Determinism: walk back up and compare.
  for (let k = positions.length - 1; k >= 0; k--) {
    await page.evaluate((y) => window.scrollTo(0, y), geo.top + geo.travel * positions[k]);
    await waitSettled(page, index, config.settleTimeoutMs);
    const r = await readStage(page, index);
    if (r.frame !== down[k].frame) add("fail", "deterministic", at, `p=${positions[k].toFixed(2)}: frame ${down[k].frame} going down, ${r.frame} coming back up`);
  }

  // Captions: full opacity at peak, contrast against the real pixels behind them.
  const specs = await page.evaluate((i) => Array.from(
    document.querySelectorAll<HTMLElement>("[data-tk-stage]")[i].querySelectorAll<HTMLElement>("[data-tk-band]"),
  ).map((b) => b.dataset.tkBand ?? ""), index);

  for (const [j, spec] of specs.entries()) {
    let peak: number;
    try { peak = bandPeak(parseBand(spec)); } catch (e) { add("fail", "band-spec", at, `band #${j}: ${(e as Error).message}`); continue; }
    await page.evaluate((y) => window.scrollTo(0, y), geo.top + geo.travel * peak);
    await waitSettled(page, index, config.settleTimeoutMs);
    const r = await readStage(page, index);
    const band = parseBand(spec);
    const readableVh = ((band.end - band.start) * geo.travel) / geo.viewportH;
    if (readableVh < config.minBandVh) {
      add("warn", "band-too-short", at, `band #${j} "${spec}" is on screen for ${(readableVh * 100).toFixed(0)}vh of scroll (min ${config.minBandVh * 100}vh): too brief to read`);
    }
    if ((r.bands[j] ?? 0) < 0.98) {
      add("fail", "band-visible", at, `band #${j} "${spec}" peaks at opacity ${(r.bands[j] ?? 0).toFixed(2)} (never fully visible)`);
      continue; // contrast of an invisible caption is meaningless
    }
    await checkBandContrast(page, index, j, at, config);
  }
}

async function checkBandContrast(page: Page, stage: number, band: number, at: string, config: Config) {
  const texts = await page.evaluate(([i, j]) => {
    const host = document.querySelectorAll<HTMLElement>("[data-tk-stage]")[i].querySelectorAll<HTMLElement>("[data-tk-band]")[j];
    const leaves = Array.from(host.querySelectorAll<HTMLElement>("h1,h2,h3,h4,p,li,a,span,strong,em,button,label"))
      // Only elements that own text: a <p> wrapping a button is measured through the button.
      .filter((el) => Array.from(el.childNodes).some((n) => n.nodeType === 3 && n.textContent!.trim()) && el.getClientRects().length);
    return leaves.map((el) => {
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return {
        text: el.innerText.trim().slice(0, 40), color: cs.color, background: cs.backgroundColor,
        size: parseFloat(cs.fontSize), weight: Number(cs.fontWeight) || 400,
        box: { x: Math.max(0, r.x), y: Math.max(0, r.y), width: Math.min(r.width, innerWidth - Math.max(0, r.x)), height: Math.min(r.height, innerHeight - Math.max(0, r.y)) },
      };
    }).filter((t) => t.box.width > 2 && t.box.height > 2);
  }, [stage, band] as const);

  // Hide glyphs only (scrims and backgrounds stay), screenshot each text box, restore.
  const style = await page.addStyleTag({ content: "[data-tk-band] * { color: transparent !important; text-shadow: none !important; -webkit-text-stroke: 0 !important; }" });
  try {
    for (const t of texts) {
      const fg = parseColor(t.color);
      if (!fg) continue;
      const ownBg = parseColor(t.background);
      const large = t.size >= 24 || (t.size >= 18.66 && t.weight >= 700);
      const min = large ? config.minContrastLarge : config.minContrast;
      const fgL = relLuminance(fg);
      let bgL: number;
      if (ownBg && ownBg[3] >= 0.99) bgL = relLuminance(ownBg);
      else {
        const png = await page.screenshot({ clip: t.box });
        // Light text is threatened by the brightest background pixels, dark text by the darkest.
        const median = luminancePercentile(png, 50);
        bgL = luminancePercentile(png, fgL > median ? 90 : 10);
      }
      const ratio = contrastRatio(fgL, bgL);
      if (ratio < min) {
        add("fail", "contrast", at, `band #${band} "${t.text}": ${ratio.toFixed(2)}:1 < ${min}:1 at the worst 10% of pixels behind it (text-shadow not counted)`);
      }
    }
  } finally {
    await style.evaluate((el) => (el as Element).remove());
  }
}

async function auditReduced(browser: Browser, name: string, url: string, out: string, config: Config) {
  const where = `${browser.browserType().name()}/${name}/reduced-motion`;
  const ctx = await browser.newContext({ ...VIEWPORTS[name], reducedMotion: "reduce" });
  const page = await ctx.newPage();
  const bytes = { total: 0 };
  watchPage(page, where, config, bytes);
  await page.goto(url, { waitUntil: "load" });
  await page.waitForTimeout(500);
  const stages = await page.evaluate(() => Array.from(document.querySelectorAll<HTMLElement>("[data-tk-stage]")).map((s) => ({
    status: s.dataset.tkStatus, motion: s.dataset.tkMotion,
    pin: getComputedStyle(s.querySelector("[data-tk-pin]") ?? s).position,
    hidden: Array.from(s.querySelectorAll<HTMLElement>("[data-tk-band]")).filter((b) => Number(getComputedStyle(b).opacity) < 0.99 || !b.getClientRects().length).length,
  })));
  stages.forEach((s, i) => {
    if (s.motion !== "reduced" || s.status !== "reduced") add("fail", "reduced-motion", `${where} stage#${i}`, `engine did not switch (motion=${s.motion}, status=${s.status})`);
    if (s.pin === "sticky") add("fail", "reduced-motion", `${where} stage#${i}`, "stage is still pinned in reduced motion");
    if (s.hidden) add("fail", "reduced-motion", `${where} stage#${i}`, `${s.hidden} caption(s) not visible in reduced motion`);
  });
  await checkOverflow(page, where);
  await shoot(page, out, `${browser.browserType().name()}-${name}-reduced`, `${where} · full page`, true);
  await ctx.close();
}

async function auditNoJs(browser: Browser, url: string, out: string) {
  const where = `${browser.browserType().name()}/desktop/no-js`;
  const ctx = await browser.newContext({ ...VIEWPORTS.desktop, javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: "load" });
  const state = await page.evaluate(() => ({
    h1: document.querySelector("h1")?.textContent?.trim() ?? "",
    posters: Array.from(document.querySelectorAll<HTMLImageElement>("[data-tk-poster]")).map((i) => i.complete && i.naturalWidth > 0),
    stages: document.querySelectorAll("[data-tk-stage]").length,
  }));
  if (!state.h1) add("fail", "no-js", where, "no <h1> text without JavaScript (content must be real markup, not built by script)");
  if (state.stages && state.posters.length < state.stages) add("warn", "no-js", where, "a stage has no [data-tk-poster] fallback image");
  if (state.posters.some((ok) => !ok)) add("fail", "no-js", where, "a poster image failed to load");
  await shoot(page, out, `${browser.browserType().name()}-desktop-nojs`, `${where} · full page`, true);
  await ctx.close();
}

async function auditKeyboard(page: Page, where: string) {
  await page.evaluate(() => window.scrollTo(0, 0));
  for (let k = 0; k < 15; k++) {
    await page.keyboard.press("Tab");
    await page.waitForTimeout(600); // let a caption-focus scroll settle
    const f = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body) return null;
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      let opacity = 1;
      for (let n: HTMLElement | null = el; n; n = n.parentElement) opacity *= Number(getComputedStyle(n).opacity);
      return {
        label: (el.innerText || el.getAttribute("aria-label") || el.tagName).trim().slice(0, 40),
        inView: r.bottom > 0 && r.top < innerHeight && r.width > 0,
        opacity,
        indicator: (cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0) || cs.boxShadow !== "none",
      };
    });
    if (!f) break;
    if (!f.inView || f.opacity < 0.5) add("fail", "keyboard", where, `focused "${f.label}" is off-screen or invisible (opacity ${f.opacity.toFixed(2)})`);
    if (!f.indicator) add("warn", "keyboard", where, `focused "${f.label}" shows no outline or box-shadow`);
  }
}

// ------------------------------------------------------------------ main

async function launch(name: string): Promise<Browser | null> {
  try { return await (name === "webkit" ? webkit : chromium).launch(); }
  catch (e) {
    add("warn", "browser", name, `could not launch (${(e as Error).message.split("\n")[0]}). Run: npx playwright install ${name}`);
    return null;
  }
}

function runLighthouse(url: string, out: string) {
  const r = spawnSync("npx", ["--no-install", "lighthouse", url, "--quiet", "--output=json", `--output-path=${path.join(out, "lighthouse.json")}`, "--chrome-flags=--headless=new"], { encoding: "utf8" });
  if (r.status !== 0) { add("info", "lighthouse", url, "skipped: lighthouse not installed or failed (npm i -D lighthouse). Lighthouse measures performance/a11y/SEO, not design quality."); return; }
  const report = JSON.parse(fs.readFileSync(path.join(out, "lighthouse.json"), "utf8"));
  const scores = Object.entries(report.categories as Record<string, { score: number }>).map(([k, v]) => `${k} ${Math.round(v.score * 100)}`).join(", ");
  add("info", "lighthouse", url, scores);
}

function writeReports(out: string, meta: Record<string, unknown>) {
  const count = (s: Severity) => findings.filter((f) => f.severity === s).length;
  const summary = { fail: count("fail"), warn: count("warn"), info: count("info") };
  fs.writeFileSync(path.join(out, "report.json"), JSON.stringify({ ...meta, summary, findings, shots }, null, 2));

  const rows = findings.map((f) => `| ${f.severity} | ${f.check} | ${f.where} | ${f.message.replace(/\|/g, "\\|")} |`).join("\n");
  fs.writeFileSync(path.join(out, "report.md"), [
    `# QA audit · ${meta.url}`, "",
    `${new Date().toISOString()} · fail ${summary.fail} · warn ${summary.warn} · info ${summary.info}`, "",
    findings.length ? "| severity | check | where | finding |\n|---|---|---|---|\n" + rows : "No findings.", "",
    "## Not covered by this audit", "",
    "- Creative quality, story, feeling curve and the $10K checklist score (human review, references/08-qa.md).",
    "- Type synchronised with motion in the film (watch slow and fast scrolling yourself).",
    "- Physical devices. Emulated mobile is not an iPhone: decoder, Low Power Mode and touch inertia differ.",
    "- Live form delivery, email arrival, SEO indexing.", "",
  ].join("\n"));

  const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
  fs.writeFileSync(path.join(out, "contact.html"), `<!doctype html><meta charset="utf-8"><title>QA contact sheet</title>
<style>body{font:13px system-ui;background:#111;color:#ddd;margin:16px}div{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px}
figure{margin:0}img{width:100%;border:1px solid #333}figcaption{padding:4px 0}</style>
<h1>QA contact sheet</h1><p>fail ${summary.fail} · warn ${summary.warn}. Read every frame: the audit proves the page works, your eyes decide whether it is good.</p>
<div>${shots.map((s) => `<figure><img loading="lazy" src="${esc(s.file)}"><figcaption>${esc(s.label)}</figcaption></figure>`).join("")}</div>`);
  return summary;
}

async function main() {
  const { url, out, viewports, browsers, lighthouse, config } = parseArgs(process.argv.slice(2));
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(path.join(out, "shots"), { recursive: true });

  let launched = 0;
  for (const bName of browsers) {
    const browser = await launch(bName);
    if (!browser) continue;
    launched++;
    for (const vName of viewports) {
      if (!VIEWPORTS[vName]) { add("warn", "config", vName, "unknown viewport (use desktop or mobile)"); continue; }
      const where = `${bName}/${vName}`;
      const ctx: BrowserContext = await browser.newContext({ ...VIEWPORTS[vName], reducedMotion: "no-preference" });
      const page = await ctx.newPage();
      const bytes = { total: 0 };
      watchPage(page, where, config, bytes);
      await page.goto(url, { waitUntil: "load" });
      await checkOverflow(page, where);
      const count = await page.locator("[data-tk-stage]").count();
      if (!count) add("info", "stages", where, "no [data-tk-stage] on this page");
      for (let i = 0; i < count; i++) await auditStage(page, i, where, out, `${bName}-${vName}`, config);
      await auditKeyboard(page, where);
      await page.waitForTimeout(300);
      const mb = bytes.total / 1e6;
      const budget = config.budgetsMB[vName];
      if (budget && mb > budget) add("warn", "weight", where, `${mb.toFixed(1)} MB transferred, budget ${budget} MB`);
      else add("info", "weight", where, `${mb.toFixed(1)} MB transferred${budget ? ` (budget ${budget} MB)` : ""}`);
      await ctx.close();
      await auditReduced(browser, vName, url, out, config);
    }
    await auditNoJs(browser, url, out);
    await browser.close();
  }
  if (!launched) add("fail", "browser", browsers.join(","), "no browser could be launched, so nothing was audited");
  if (lighthouse) runLighthouse(url, out);

  const summary = writeReports(out, { url, viewports, browsers, config });
  for (const f of findings.filter((x) => x.severity !== "info")) console.log(`${f.severity.toUpperCase().padEnd(4)} ${f.check.padEnd(20)} ${f.where}  ${f.message}`);
  console.log(`\nfail ${summary.fail} · warn ${summary.warn} · info ${summary.info}\nreport: ${path.join(out, "report.md")}\ncontact sheet: ${path.join(out, "contact.html")}`);
  process.exit(summary.fail ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
