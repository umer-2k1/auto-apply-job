#!/usr/bin/env node
// Detect which companies are YC-funded via the YC directory, and capture batch + team size.
import { readFile, writeFile } from "node:fs/promises";
const UA = { headers: { "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36" } };
const strip = (s) => (s || "").replace(/<[^>]+>/g, " ").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();

const companies = JSON.parse(await readFile(new URL("./companies.json", import.meta.url), "utf8"));

function candidates(slug, org) {
  const base = new Set([slug, slug.replace(/-/g, ""), org ? org.toLowerCase().replace(/[^a-z0-9]+/g, "") : "", org ? org.toLowerCase().replace(/[^a-z0-9]+/g, "-") : ""]);
  const extra = {
    "cur-ai": ["curai"],
    "zone-co": ["zone", "zoneandco"],
    "redpanda-data": ["redpanda"],
    "tenex-ai": ["tenex"],
    "buzz-solutions": ["buzzsolutions"],
    "hippocratic-ai": ["hippocraticai"],
    "placer-ai": ["placer", "placerai"],
    "silver-dev": ["silverdev"],
    "fieldai": ["field-ai"],
    "webai": ["web-ai"],
    "heidi-health": ["heidi"],
    "42dot": ["42dot", "fortytwo"],
    "lawnstarter": ["lawnstarter"],
  };
  return [...new Set([...(extra[slug] || []), ...base])].filter(Boolean);
}

async function checkYC(slug, org) {
  for (const cand of candidates(slug, org)) {
    let r;
    try { r = await fetch("https://www.ycombinator.com/companies/" + cand, UA); } catch { continue; }
    if (r.status !== 200) continue;
    let h = await r.text();
    h = h.replace(/&quot;/g, '"').replace(/&amp;/g, "&");
    const name = (h.match(/"name":"([^"]+)"/) || [])[1];
    const probe = (org || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    const nm = (name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    const strong = nm && probe && (nm === probe || (nm.length > 4 && probe.length > 4 && (nm.includes(probe) || probe.includes(nm))));
    if (!strong) continue;
    const batch = (h.match(/"batch":"([^"]+)"/) || [])[1] || null;
    const batchName = (h.match(/"batch_name":"([^"]+)"/) || [])[1] || null;
    const team = (h.match(/Team Size:<\/span><span>([^<]+)</) || [])[1] || null;
    const status = (h.match(/>(Active|Inactive|Acquired|Public)<\/div>/) || [])[1] || null;
    const industry = (h.match(/\/companies\/industry\/([^"]+)"/) || [])[1] || null;
    const oneLiner = (h.match(/"one_liner":"([^"]*)"/) || [])[1] || null;
    return { yc: true, ycSlug: cand, ycName: name, batch, batchName, ycTeam: team, ycStatus: status, ycIndustry: industry, oneLiner };
  }
  return { yc: false };
}

async function pool(items, limit, fn) { const out = []; let i = 0; await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => { while (i < items.length) { const idx = i++; out[idx] = await fn(items[idx]); } })); return out; }

const enriched = await pool(companies, 6, async (c) => ({ ...c, ...(await checkYC(c.slug, c.org)) }));
await writeFile(new URL("./companies.json", import.meta.url), JSON.stringify(enriched, null, 2));
const yc = enriched.filter((c) => c.yc);
console.log(`YC companies detected: ${yc.length}`);
for (const c of yc) console.log([c.org, c.batch, c.batchName, "team=" + c.ycTeam, c.ycStatus, c.ycIndustry, c.oneLiner].join(" | "));
