#!/usr/bin/env node
// scroll-web-skills CLI. Zero dependencies: runs straight from GitHub with
//   npx github:OWNER/scroll-web-skills <command>
//
//   install   [--agent claude|codex|cursor|gemini|opencode|all] [--global | --project] [--force] [--dry-run]
//   init      [dir] [--target static|react|lovable] [--force] [--dry-run]
//   uninstall [--agent ...] [--global | --project] [--dry-run]
//   doctor
//   where     [--agent ...] [--global | --project]
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const PKG_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SKILL_NAME = "scroll-web-skills";
const VERSION = JSON.parse(fs.readFileSync(path.join(PKG_ROOT, "package.json"), "utf8")).version;

// What an agent needs to read and run the skill. Tests, CI and evidence stay in the repo.
const SKILL_FILES = [
  "SKILL.md", "AGENTS.md", "CLAUDE.md", "README.md", "LICENSE",
  "references", "templates", "prompts", "engine", "scripts", "targets",
  "docs/DECISIONS.md", "docs/ATTRIBUTION.md", "docs/IMPLEMENTATION_STATUS.md",
  "dist/tk-stage.js", "dist/tk-stage.css",
  "examples/static-demo/index.html", "examples/react-demo/index.html", "examples/react-demo/main.tsx",
  "package.json", "tsconfig.json", "qa.config.example.json",
];

// Install directories, following the layout used by the open `skills` CLI (vercel-labs/skills docs/agents.md).
const AGENTS = {
  claude:   { project: ".claude/skills",  global: "~/.claude/skills" },
  codex:    { project: ".agents/skills",  global: "~/.agents/skills" },
  cursor:   { project: ".agents/skills",  global: "~/.cursor/skills" },
  gemini:   { project: ".agents/skills",  global: "~/.gemini/skills" },
  opencode: { project: ".agents/skills",  global: "~/.config/opencode/skills" },
};

// ------------------------------------------------------------------ args

const argv = process.argv.slice(2);
const command = argv[0] && !argv[0].startsWith("-") ? argv[0] : "help";
const flag = (name) => argv.includes(`--${name}`);
const opt = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : fallback;
};
const VALUED = new Set(["--agent", "--target"]);
const positional = argv.slice(1).filter((a, i, all) => !a.startsWith("--") && !VALUED.has(all[i - 1]));
const DRY = flag("dry-run");
const FORCE = flag("force");

const expand = (p) => (p.startsWith("~/") ? path.join(os.homedir(), p.slice(2)) : path.resolve(p));
const log = (msg) => console.log(msg);
const fail = (msg) => { console.error(`error: ${msg}`); process.exit(1); };

function agentList() {
  const raw = opt("agent", "claude");
  const names = raw === "all" ? Object.keys(AGENTS) : raw.split(",").map((s) => s.trim());
  for (const n of names) if (!AGENTS[n]) fail(`unknown agent "${n}". Use: ${Object.keys(AGENTS).join(", ")}, all`);
  return names;
}

function scope() {
  if (flag("global") && flag("project")) fail("choose --global or --project, not both");
  return flag("project") ? "project" : "global";
}

/** Distinct target directories (several agents share .agents/skills in project scope). */
function targets() {
  const s = scope();
  const seen = new Map();
  for (const a of agentList()) {
    const dir = path.join(expand(AGENTS[a][s]), SKILL_NAME);
    seen.set(dir, [...(seen.get(dir) ?? []), a]);
  }
  return [...seen].map(([dir, agents]) => ({ dir, agents }));
}

// ------------------------------------------------------------------ fs helpers

function copyEntry(rel, destRoot) {
  const src = path.join(PKG_ROOT, rel);
  if (!fs.existsSync(src)) return 0;
  const dest = path.join(destRoot, rel);
  if (DRY) return countFiles(src);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  // Filter relative to the source: when run through npx, the package itself lives inside a
  // node_modules folder, so testing the absolute path would exclude every file.
  fs.cpSync(src, dest, { recursive: true, filter: (p) => !path.relative(src, p).split(path.sep).includes("node_modules") });
  return countFiles(dest);
}

function countFiles(p) {
  const st = fs.statSync(p);
  if (!st.isDirectory()) return 1;
  return fs.readdirSync(p).reduce((n, e) => n + countFiles(path.join(p, e)), 0);
}

/** Copies one file into a project, never overwriting the user's work unless --force. */
function placeFile(srcRel, destAbs, created, skipped) {
  const src = path.join(PKG_ROOT, srcRel);
  if (fs.existsSync(destAbs) && !FORCE) { skipped.push(destAbs); return; }
  if (!DRY) {
    fs.mkdirSync(path.dirname(destAbs), { recursive: true });
    fs.cpSync(src, destAbs, { recursive: true });
  }
  created.push(destAbs);
}

// ------------------------------------------------------------------ commands

function install() {
  for (const { dir, agents } of targets()) {
    if (fs.existsSync(dir) && !FORCE) {
      const installed = readInstalledVersion(dir);
      fail(`${dir} already exists${installed ? ` (v${installed})` : ""}. Re-run with --force to replace it.`);
    }
    if (!DRY && fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
    let files = 0;
    for (const rel of SKILL_FILES) files += copyEntry(rel, dir);
    if (!DRY) {
      // Verify what landed, not what was meant to land.
      const missing = ["SKILL.md", "AGENTS.md", "references/00-intake.md", "engine/core/scroll-stage.ts", "scripts/qa-audit.ts"]
        .filter((f) => !fs.existsSync(path.join(dir, f)));
      if (missing.length) fail(`install incomplete in ${dir}; missing: ${missing.join(", ")}`);
      fs.writeFileSync(path.join(dir, ".installed.json"), JSON.stringify({ name: SKILL_NAME, version: VERSION, agents, files, at: new Date().toISOString() }, null, 2));
    }
    log(`${DRY ? "[dry-run] would install" : "installed"} ${SKILL_NAME} v${VERSION} (${files} files) for ${agents.join(", ")} → ${dir}`);
  }
  log("\nStart a new agent session so the skill is picked up.");
  log("Inside a website project, run:  npx github:<owner>/scroll-web-skills init");
}

function uninstall() {
  for (const { dir } of targets()) {
    if (!fs.existsSync(dir)) { log(`not installed: ${dir}`); continue; }
    if (!fs.existsSync(path.join(dir, ".installed.json")) && !FORCE) {
      fail(`${dir} was not created by this installer. Remove it by hand or pass --force.`);
    }
    if (!DRY) fs.rmSync(dir, { recursive: true, force: true });
    log(`${DRY ? "[dry-run] would remove" : "removed"} ${dir}`);
  }
}

function readInstalledVersion(dir) {
  try { return JSON.parse(fs.readFileSync(path.join(dir, ".installed.json"), "utf8")).version; } catch { return null; }
}

function init() {
  const root = path.resolve(positional[0] ?? ".");
  const target = opt("target", detectTarget(root));
  if (!["static", "react", "lovable"].includes(target)) fail(`--target must be static, react or lovable (got "${target}")`);
  const created = [];
  const skipped = [];

  // Agent contract and project config, at the project root where agents look for them.
  placeFile("AGENTS.md", path.join(root, "AGENTS.md"), created, skipped);
  const claudeMd = path.join(root, "CLAUDE.md");
  if (fs.existsSync(claudeMd) && !FORCE) skipped.push(claudeMd);
  else {
    const text = fs.readFileSync(path.join(PKG_ROOT, "CLAUDE.md"), "utf8")
      .replace(/^target: \w+/m, `target: ${target}`)
      .replace(/^backend: \w+/m, `backend: ${target === "lovable" ? "lovable-cloud" : "none"}`);
    if (!DRY) fs.writeFileSync(claudeMd, text);
    created.push(claudeMd);
  }

  // Working files: brief, story, plan, fingerprints. Tools and references live in .10k/.
  for (const t of ["BRIEF.md", "VISUAL_STORY.md", "plan.md"]) placeFile(`templates/${t}`, path.join(root, ".10k", t), created, skipped);
  placeFile("templates/FINGERPRINTS.md", path.join(root, ".10k", "FINGERPRINTS.md"), created, skipped);
  placeFile("scripts", path.join(root, ".10k", "tools"), created, skipped);
  placeFile("references", path.join(root, ".10k", "references"), created, skipped);
  placeFile("qa.config.example.json", path.join(root, "qa.config.json"), created, skipped);

  // Engine, read-only by contract (AGENTS.md §2).
  if (target === "static") {
    // Prebuilt bundle: no build step inside site/.
    placeFile("dist/tk-stage.js", path.join(root, "site", "tk-stage.js"), created, skipped);
    placeFile("dist/tk-stage.css", path.join(root, "site", "tk-stage.css"), created, skipped);
  } else {
    placeFile("engine/core", path.join(root, "src", "lib", "tk-stage", "core"), created, skipped);
    placeFile("engine/react", path.join(root, "src", "lib", "tk-stage", "react"), created, skipped);
    placeFile("engine/css/stage.css", path.join(root, "src", "lib", "tk-stage", "stage.css"), created, skipped);
  }
  if (target === "lovable") {
    placeFile("targets/lovable/supabase/migrations/20261108000000_leads.sql", path.join(root, "supabase", "migrations", "20261108000000_leads.sql"), created, skipped);
    placeFile("targets/lovable/supabase/functions/submit-lead", path.join(root, "supabase", "functions", "submit-lead"), created, skipped);
  }

  appendLines(path.join(root, ".gitignore"), [".10k/tools/node_modules/", "qa-report/", "media/masters/", "media/rejected/", "review/", ".env", ".env.*", "!.env.example"], created);
  appendLines(path.join(root, ".gitattributes"), ["*.mp4 filter=lfs diff=lfs merge=lfs -text", "media/** filter=lfs diff=lfs merge=lfs -text"], created);

  const rel = (p) => path.relative(process.cwd(), p) || ".";
  log(`${DRY ? "[dry-run] " : ""}init ${SKILL_NAME} v${VERSION} · target=${target} · ${rel(root)}`);
  created.forEach((p) => log(`  + ${rel(p)}`));
  skipped.forEach((p) => log(`  = ${rel(p)} (exists, kept; --force to replace)`));
  log("\nNext:");
  log("  node .10k/tools/doctor.mjs");
  if (target === "static") log("  site/ has tk-stage.js and tk-stage.css; the markup contract is in .10k/references/04-engine.md");
  else log("  import \"./lib/tk-stage/stage.css\" once in your root layout");
  if (target === "lovable") log("  Lovable: read .10k/references/07-targets.md before pushing to main. Migrations and edge functions need approved Lovable prompts.");
  log("  Ask your agent: \"use a scroll-web-skills e comece pelo intake\"");
}

function detectTarget(root) {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    if (fs.existsSync(path.join(root, "supabase")) && deps.react) return "lovable";
    if (deps.react) return "react";
  } catch { /* no package.json: plain site */ }
  return "static";
}

function appendLines(file, lines, created) {
  const current = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
  const missing = lines.filter((l) => !current.split("\n").includes(l));
  if (!missing.length) return;
  if (!DRY) fs.writeFileSync(file, `${current}${current && !current.endsWith("\n") ? "\n" : ""}# scroll-web-skills\n${missing.join("\n")}\n`);
  created.push(`${file} (+${missing.length} lines)`);
}

function doctor() {
  const local = path.resolve(".10k/tools/doctor.mjs");
  const script = fs.existsSync(local) ? local : path.join(PKG_ROOT, "scripts", "doctor.mjs");
  const r = spawnSync(process.execPath, [script], { stdio: "inherit" });
  process.exit(r.status ?? 1);
}

function where() {
  for (const { dir, agents } of targets()) {
    const v = readInstalledVersion(dir);
    const ok = fs.existsSync(path.join(dir, "SKILL.md"));
    const state = !fs.existsSync(dir) ? "(not installed)" : !ok ? "(BROKEN: no SKILL.md; reinstall with --force)" : v ? `v${v}` : "(present, not from this installer)";
    log(`${agents.join(", ").padEnd(28)} ${dir}  ${state}`);
  }
}

function help() {
  log(`${SKILL_NAME} v${VERSION}

Usage: npx github:<owner>/${SKILL_NAME} <command> [options]

Commands
  install     copy the skill where your agent reads skills (default: Claude Code, global)
  init [dir]  set up a website project: AGENTS.md, CLAUDE.md, .10k/ working files, engine
  uninstall   remove an installation made by this CLI
  where       show install paths and installed versions
  doctor      check node, ffmpeg, playwright and browsers

Options
  --agent <list>   claude, codex, cursor, gemini, opencode, all (comma-separated)
  --global         user-wide install (default)
  --project        install into ./.claude/skills or ./.agents/skills
  --target <t>     init only: static | react | lovable (auto-detected from package.json)
  --force          replace existing files
  --dry-run        show what would happen, change nothing

Examples
  npx github:<owner>/${SKILL_NAME} install
  npx github:<owner>/${SKILL_NAME} install --agent all
  npx github:<owner>/${SKILL_NAME} install --agent claude,codex --project
  npx github:<owner>/${SKILL_NAME} init --target lovable`);
}

const [major] = process.versions.node.split(".").map(Number);
if (major < 18) fail(`Node ${process.versions.node} is too old for this installer (need 18+; the skill's scripts need 22.18+).`);

({ install, init, uninstall, doctor, where, help }[command] ?? (() => { help(); process.exit(command === "help" ? 0 : 2); }))();
