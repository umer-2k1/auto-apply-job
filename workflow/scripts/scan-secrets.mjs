#!/usr/bin/env node
// Scan git-TRACKED files for secret-looking strings. Exit 1 if any are found.
// Run this BEFORE every `git add`/`commit`/`push`. Usage: node scripts/scan-secrets.mjs
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

const PATTERNS = [
  ["One connection key", /live::[a-z0-9-]+::[a-z0-9-]+::[a-f0-9]{32}/],
  ["One / API key", /sk_(live|test)_[A-Za-z0-9_-]{16,}/],
  ["OpenAI-style key", /\bsk-[A-Za-z0-9]{20,}\b/],
  ["GitHub token", /\b(ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{20,}\b/],
  ["AWS access key", /\bAKIA[0-9A-Z]{16}\b/],
  ["Slack token", /\bxox[baprs]-[A-Za-z0-9-]{10,}/],
  ["Google API key", /\bAIza[0-9A-Za-z_-]{30,}\b/],
  ["Private key block", /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ["OAuth callback token URL", /localhost:\d+\/callback\?s=[A-Za-z0-9_-]{16,}/],
  ["Generic bearer token", /\bBearer\s+[A-Za-z0-9._-]{20,}\b/],
];

const IGNORE = /(^|\/)(node_modules|\.git|data\/cache|data\/parser-output)\//;

let files = [];
try { files = execSync("git ls-files -z", { encoding: "utf8" }).split("\0").filter(Boolean); }
catch { console.error("Not a git repo (run inside the repo)."); process.exit(2); }

let hits = 0;
for (const f of files) {
  if (IGNORE.test(f)) continue;
  let txt; try { txt = readFileSync(f, "utf8"); } catch { continue; }
  for (const [name, re] of PATTERNS) {
    const m = txt.match(re);
    if (m) { hits++; console.log(`❌ ${name} — ${f} — "${m[0].slice(0, 10)}…"`); }
  }
}
if (hits) { console.log(`\n⛔ ${hits} potential secret(s) in tracked files. DO NOT commit/push.`); process.exit(1); }
console.log("✅ No secrets found in tracked files.");
