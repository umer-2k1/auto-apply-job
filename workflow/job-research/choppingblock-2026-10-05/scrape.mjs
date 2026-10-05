#!/usr/bin/env node
// Scrape AI Chopping Block job listings (last 7 days) for Muhammad Umer's search.
// Zero-token: pure HTTP against the server-rendered site.
import { writeFile } from "node:fs/promises";

const BASE = "https://www.choppingblock.ai";
const UA = { headers: { "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36" } };
const MAX_PAGES = 8;
const MAX_DAYS = 15;

// Streams: role categories + title searches + employment-type sweeps (remote only).
const STREAMS = [
  "category=ai-engineer&remote=remote",
  "category=software-engineer&remote=remote",
  "category=machine-learning-engineer&remote=remote",
  "category=forward-deployed-engineer&remote=remote",
  "category=data-engineer&remote=remote",
  "remote=remote&q=full+stack",
  "remote=remote&q=fullstack",
  "remote=remote&q=backend",
  "remote=remote&q=frontend",
  "remote=remote&q=applied+ai",
  "remote=remote&q=agentic",
  "remote=remote&q=llm",
  "remote=remote&type=contractor",
  "remote=remote&type=part-time",
];

const strip = (s) =>
  (s || "")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ")
    .replace(/&mdash;/g, "—")
    .replace(/\s+/g, " ")
    .trim();

function parseList(html) {
  const parts = html.split('<li class="group relative grid').slice(1);
  const jobs = [];
  for (const p of parts) {
    const slug = (p.match(/href="(\/jobs\/[^"?#]+)"/) || [])[1];
    if (!slug) continue;
    const title = strip((p.match(/<h3[^>]*>\s*<a[^>]*>([\s\S]*?)<\/a>/) || [])[1]);
    const company = strip((p.match(/<p class="mt-1[^"]*">([\s\S]*?)<\/p>/) || [])[1]);
    const dateText = strip((p.match(/<span class="text-xs text-tertiary">([\s\S]*?)<\/span>/) || [])[1]);
    const tags = [...p.matchAll(/<button[^>]*>([\s\S]*?)<\/button>/g)].map((m) => strip(m[1])).filter(Boolean);
    let days = null;
    const d = dateText.match(/(\d+)\s*days?\s*ago/i);
    const h = dateText.match(/(\d+)\s*hours?\s*ago/i);
    const w = dateText.match(/(\d+)\s*weeks?\s*ago/i);
    if (d) days = +d[1];
    else if (h) days = 0;
    else if (w) days = +w[1] * 7;
    else if (/^new$|just now/i.test(dateText)) days = 0;
    jobs.push({ slug, title, company, dateText, days, tags });
  }
  return jobs;
}

async function get(url) {
  const r = await fetch(url, UA);
  if (!r.ok) throw new Error("HTTP " + r.status + " " + url);
  return r.text();
}

async function scrapeStream(qs) {
  const found = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const url = `${BASE}/jobs?${qs}&page=${page}`;
    let html;
    try { html = await get(url); } catch (e) { break; }
    const jobs = parseList(html);
    if (!jobs.length) break;
    const kept = jobs.filter((j) => j.days !== null && j.days <= MAX_DAYS);
    found.push(...kept);
    if (kept.length === 0) break;
  }
  return found;
}

function jsonld(html) {
  const m = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  if (!m) return null;
  try { return JSON.parse(m[1]); } catch { return null; }
}

async function enrich(slug) {
  const url = BASE + slug;
  let html;
  try { html = await get(url); } catch (e) { return { slug, error: String(e.message || e) }; }
  const ld = jsonld(html) || {};
  const apply =
    (html.match(/href="(https:\/\/[^"]*(?:apply|greenhouse\.io|lever\.co|ashbyhq\.com|workable\.com|myworkdayjobs\.com|icims\.com|smartrecruiters\.com)[^"]*)"/i) || [])[1] || null;
  const companyUrl = (html.match(/href="(\/companies\/[^"]+)"/) || [])[1] || null;
  const locReq = ld.applicantLocationRequirements
    ? Array.isArray(ld.applicantLocationRequirements)
      ? ld.applicantLocationRequirements.map((x) => x.name).join("; ")
      : ld.applicantLocationRequirements.name
    : null;
  return {
    slug,
    url,
    title: ld.title || null,
    org: (ld.hiringOrganization && ld.hiringOrganization.name) || null,
    datePosted: ld.datePosted || null,
    validThrough: ld.validThrough || null,
    employmentType: ld.employmentType || null,
    remote: ld.jobLocationType || null,
    locationReq: locReq,
    directApply: !!ld.directApply,
    apply: apply ? apply.replace(/\?ref=aichoppingblock/, "") : null,
    companyUrl: companyUrl ? BASE + companyUrl : null,
    description: ld.description ? strip(ld.description) : null,
  };
}

async function pool(items, limit, fn) {
  const out = new Array(items.length);
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx], idx);
    }
  });
  await Promise.all(workers);
  return out;
}

const t0 = Date.now();
const seen = new Map();
for (const s of STREAMS) {
  const jobs = await scrapeStream(s);
  for (const j of jobs) if (!seen.has(j.slug)) seen.set(j.slug, { ...j, streams: [s] });
  console.log(`[stream] ${s} -> ${jobs.length} kept (total unique ${seen.size})`);
}
const raw = [...seen.values()];
console.log(`Enumerated ${raw.length} unique roles <= ${MAX_DAYS} days. Fetching details...`);
const enriched = await pool(raw, 8, async (j) => ({ ...j, ...(await enrich(j.slug)) }));
await writeFile(new URL("./jobs-enriched.json", import.meta.url), JSON.stringify(enriched, null, 2));
console.log(`Wrote jobs-enriched.json (${enriched.length} roles) in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
