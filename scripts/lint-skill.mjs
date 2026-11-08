#!/usr/bin/env node
// Lints the skill package itself: frontmatter, broken relative links, referral links,
// and status claims. Run in CI so the instructions an agent reads never rot.
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.argv[2] ?? ".");
const problems = [];
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
  if (["node_modules", ".git", "dist", "qa-report"].includes(e.name)) return [];
  const p = path.join(dir, e.name);
  return e.isDirectory() ? walk(p) : [p];
});
const md = walk(root).filter((f) => f.endsWith(".md"));

// 1. Frontmatter of SKILL.md
const skill = fs.readFileSync(path.join(root, "SKILL.md"), "utf8");
const fm = /^---\n([\s\S]*?)\n---/.exec(skill);
if (!fm) problems.push("SKILL.md: missing YAML frontmatter");
else {
  const name = /^name:\s*(.+)$/m.exec(fm[1])?.[1]?.trim();
  const desc = /^description:\s*([\s\S]+?)(?:\n\w+:|$)/m.exec(fm[1])?.[1]?.replace(/\s+/g, " ").trim();
  if (!name || !/^[a-z0-9-]{1,64}$/.test(name)) problems.push(`SKILL.md: name "${name}" must be kebab-case, max 64 chars`);
  if (!desc) problems.push("SKILL.md: missing description");
  else if (desc.length > 1024) problems.push(`SKILL.md: description is ${desc.length} chars (max 1024)`);
}
const skillLines = skill.split("\n").length;
if (skillLines > 500) problems.push(`SKILL.md: ${skillLines} lines; keep the entry file under 500 and move detail to references/`);

// 2. Relative links resolve; 3. no referral or partner links
const REFERRAL = /(ref=|referral|affiliate|partner link|\/s\/[a-z0-9-]+-yt-|utm_source)/i;
for (const file of md) {
  const text = fs.readFileSync(file, "utf8");
  for (const m of text.matchAll(/\]\(([^)\s]+)\)/g)) {
    const target = m[1].split("#")[0];
    if (!target || /^(https?:|mailto:)/.test(target)) {
      if (REFERRAL.test(m[1])) problems.push(`${path.relative(root, file)}: referral-style link ${m[1]}`);
      continue;
    }
    if (!fs.existsSync(path.resolve(path.dirname(file), target))) problems.push(`${path.relative(root, file)}: broken link ${m[1]}`);
  }
}

// 4. Every engine/script file named in the status table exists
const status = fs.readFileSync(path.join(root, "docs/IMPLEMENTATION_STATUS.md"), "utf8");
for (const m of status.matchAll(/^\| `([^`]+)` \| (implemented|tested)/gm)) {
  if (!fs.existsSync(path.join(root, m[1]))) problems.push(`IMPLEMENTATION_STATUS.md claims ${m[1]} is ${m[2]}, but the file does not exist`);
}

if (problems.length) { problems.forEach((p) => console.log(`lint: ${p}`)); process.exit(1); }
console.log(`lint: ok (${md.length} markdown files)`);
