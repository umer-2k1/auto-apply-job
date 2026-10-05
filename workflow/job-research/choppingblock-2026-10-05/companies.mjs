#!/usr/bin/env node
// Enrich each company: profile facts from choppingblock company page + YC detection via DuckDuckGo HTML.
import { readFile, writeFile } from "node:fs/promises";

const UA = { headers: { "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36" } };
const strip = (s) =>
  (s || "").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&nbsp;/g, " ").replace(/&mdash;/g, "—").replace(/\s+/g, " ").trim();
const get = async (url) => (await fetch(url, UA)).text();

const jobs = JSON.parse(await readFile(new URL("./jobs-enriched.json", import.meta.url), "utf8"));
const bySlug = new Map();
for (const j of jobs) {
  const cu = j.companyUrl || null;
  const slug = cu ? cu.split("/companies/")[1] : null;
  const key = slug || (j.org || "").toLowerCase().replace(/[^a-z0-9]+/g, "-");
  if (!key) continue;
  if (!bySlug.has(key)) bySlug.set(key, { slug: key, org: j.org || null });
  if (!bySlug.get(key).org && j.org) bySlug.get(key).org = j.org;
}
// manual additions for jobs whose company page link was missing
bySlug.set("zoominfo", { slug: "zoominfo", org: "ZoomInfo" });
if (!bySlug.has("cur-ai")) bySlug.set("cur-ai", { slug: "cur-ai", org: "Cur AI" });

async function profile(slug) {
  let html;
  try { html = await get("https://www.choppingblock.ai/companies/" + slug); } catch (e) { return { error: String(e.message || e) }; }
  const dt = (label) => {
    const m = html.match(new RegExp(label + "<\\/dt><dd[^>]*>([\\s\\S]*?)<\\/dd>"));
    return m ? strip(m[1]) : null;
  };
  const web = (html.match(/href="(https?:\/\/(?!(?:www\.)?choppingblock\.ai)[^"]+)\?ref=aichoppingblock"/) || [])[1] || null;
  const body = strip(html);
  const roles = (body.match(/([\d,]+)\s*open roles/) || [])[1] || null;
  const work = body.match(/Remote\s*(\d+)\s*Hybrid\s*(\d+)\s*On-site\s*(\d+)/);
  return {
    name: (html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || [])[1] ? strip(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)[1]).split("—")[0] : null,
    aiNative: /AI-native<\/button>/.test(html),
    size: dt("Company size"),
    hq: dt("Headquarters"),
    industry: dt("Industry"),
    funding: dt("Last funding"),
    website: web,
    openRoles: roles,
    remote: work ? +work[1] : null,
    hybrid: work ? +work[2] : null,
    onsite: work ? +work[3] : null,
    tagline: (html.match(/<h1[^>]*>[\s\S]*?<\/h1><p[^>]*>([\s\S]*?)<\/p>/) || [])[1] ? strip(html.match(/<h1[^>]*>[\s\S]*?<\/h1><p[^>]*>([\s\S]*?)<\/p>/)[1]) : null,
  };
}

async function ycSearch(org) {
  if (!org) return { yc: false };
  const q = encodeURIComponent(`"${org}" Y Combinator companies`);
  let html = "";
  try { html = await get("https://duckduckgo.com/html/?q=" + q); } catch { return { yc: null }; }
  const links = [...html.matchAll(/uddg=([^&"]+)&rut/g)].map((m) => decodeURIComponent(m[1]));
  const yc = links.find((u) => /^https?:\/\/(www\.)?ycombinator\.com\/companies\//.test(u));
  let batch = null;
  if (yc) {
    const text = strip(html);
    const b = text.match(/\b(Winter|Summer|Spring|Fall)\s+(20\d{2})\b/) || text.match(/\b([WS]|W|S|F)(\d{2})\b/);
    if (b) batch = b[0];
  }
  return { yc: !!yc, ycUrl: yc || null, batch, snippets: strip((html.match(/<a[^>]*result__a[^>]*>[\s\S]*?<\/a>/) || [])[0] || "").slice(0, 160) };
}

async function pool(items, limit, fn) {
  const out = [];
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) { const idx = i++; out[idx] = await fn(items[idx]); }
  });
  await Promise.all(workers);
  return out;
}

const entries = [...bySlug.values()];
const results = await pool(entries, 5, async (e) => {
  const p = await profile(e.slug);
  const yc = await ycSearch(e.org || p.name);
  return { slug: e.slug, org: e.org || p.name, ...p, ...yc };
});
await writeFile(new URL("./companies.json", import.meta.url), JSON.stringify(results, null, 2));
console.log(`Wrote companies.json (${results.length} companies)`);
for (const r of results) console.log([r.slug, r.org, r.size, r.hq, r.funding, r.aiNative ? "AI-native" : "", r.yc ? "YC " + (r.batch || "?") : ""].join(" | "));
