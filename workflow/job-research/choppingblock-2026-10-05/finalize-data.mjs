#!/usr/bin/env node
// Finalize: fix apply links, merge company signals, filter to relevant, dedupe, score.
import { readFile, writeFile } from "node:fs/promises";

const UA = { headers: { "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36" } };
const strip = (s) => (s || "").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, " ").trim();
const slugify = (s) => (s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const jobs = JSON.parse(await readFile(new URL("./jobs-enriched.json", import.meta.url), "utf8"));
const companies = JSON.parse(await readFile(new URL("./companies.json", import.meta.url), "utf8"));
const compMap = new Map(companies.map((c) => [c.slug, c]));

// Vetted overrides for companies with no choppingblock profile (sizes are approximate; source flagged in output).
const SIZE_OVERRIDE = {
  kraken: "1,001–5,000", "grafana-labs": "1,001–5,000", tines: "201–500", "buzz-solutions": "11–50",
  mecka: "11–50", "tenex-ai": "51–200", meridianlink: "501–1,000", alphasense: "1,001–5,000",
  zoominfo: "1,001–5,000", nexaminds: "11–50", "gramian-consulting": "11–50", raydar: "11–50",
  "zone-co": "201–500", "redpanda-data": "201–500", life360: "201–500", "ignite-digital": "11–50",
  coderio: "51–200", tensorops: "11–50", gitlab: "1,001–5,000", upstart: "1,001–5,000",
  airwallex: "1,001–5,000", fieldai: "201–500", "placer-ai": "501–1,000", faculty: "1,001–5,000",
  harvey: "1,001–5,000", baseten: "201–500", coderabbit: "201–500", "hippocratic-ai": "201–500",
  ema: "201–500", "cur-ai": "51–200", webai: "51–200", "eloquent-ai": "11–50", amgen: "10,001+",
  abbott: "10,001+", reddit: "5,001–10,000", "general-motors": "10,001+", samsara: "5,001–10,000",
  openai: "10,001+", snowflake: "10,001+",
};
const WEBSITE_OVERRIDE = {
  kraken: "https://www.kraken.com", "grafana-labs": "https://grafana.com", tines: "https://www.tines.com",
  "buzz-solutions": "https://buzzsolutions.ai", mecka: "https://www.mecka.ai", "tenex-ai": "https://tenex.ai",
  meridianlink: "https://www.meridianlink.com", alphasense: "https://www.alpha-sense.com",
  zoominfo: "https://www.zoominfo.com", "zone-co": "https://www.zoneandco.com",
  "redpanda-data": "https://redpanda.com", life360: "https://www.life360.com",
  tensorops: "https://tensorops.ai", gitlab: "https://about.gitlab.com", upstart: "https://www.upstart.com",
  airwallex: "https://www.airwallex.com", fieldai: "https://fieldai.com", "placer-ai": "https://www.placer.ai",
  faculty: "https://faculty.ai", harvey: "https://www.harvey.ai", baseten: "https://www.baseten.co",
  coderabbit: "https://www.coderabbit.ai", "hippocratic-ai": "https://www.hippocraticai.com",
  ema: "https://www.ema.co", "cur-ai": "https://curai.com", webai: "https://www.webai.com",
  "eloquent-ai": "https://www.eloquentai.com", samsara: "https://www.samsara.com",
  snowflake: "https://www.snowflake.com", openai: "https://openai.com", reddit: "https://www.reddit.com",
  "general-motors": "https://www.gm.com", amgen: "https://www.amgen.com", abbott: "https://www.abbott.com",
  "ignite-digital": "https://ignitedigital.com", coderio: "https://coderio.co", nexaminds: "https://nexaminds.com",
};
const AINATIVE_OVERRIDE = ["cur-ai", "baseten", "coderabbit", "ema", "hippocratic-ai", "webai", "fieldai", "eloquent-ai", "harvey", "faculty", "placer-ai", "zone-co", "tensorops", "mecka", "tenex-ai", "buzz-solutions", "redpanda-data", "openai", "reddit", "upstart"];

// Additional overrides for companies surfaced by the 15-day window (sizes approximate).
Object.assign(SIZE_OVERRIDE, {
  openrouter: "51–200", writer: "501–1,000", anysphere: "201–500", cursor: "201–500", "hugging-face": "501–1,000", huggingface: "501–1,000",
  kalepa: "51–200", prenuvo: "201–500", dailypay: "501–1,000", typeform: "501–1,000", maintainx: "201–500", sardine: "201–500",
  anyscale: "501–1,000", runpod: "51–200", "defense-unicorns": "201–500", machinify: "201–500", sosafe: "201–500", "ryz-labs": "51–200", ryz: "51–200",
  flodesk: "51–200", datavisor: "201–500", fourkites: "501–1,000", "fourkites-inc": "501–1,000", "the-voleon-group": "201–500", voleon: "201–500",
  uforce: "51–200", aerovect: "51–200", github: "5,001–10,000", "guidepoint-security": "1,001–5,000", pfizer: "10,001+", apple: "10,001+", block: "10,001+",
  motive: "1,001–5,000", caseware: "501–1,000", huge: "1,001–5,000", workana: "51–200", nebius: "1,001–5,000", toloka: "501–1,000", centific: "1,001–5,000",
  natera: "5,001–10,000", clariti: "51–200", bridgeway: "201–500", "bridgeway-benefit-technologies": "201–500", "9th-way-insignia": "51–200",
  "infinity-constellation": "11–50", akasa: "201–500", bunch: "11–50", "edgerunner-ai": "11–50", neara: "201–500", n8n: "1,001–5,000",
  quantiphi: "5,001–10,000", replit: "501–1,000", vapi: "51–200", hightouch: "501–1,000", netomi: "201–500", "may-mobility": "201–500",
  podium: "501–1,000", "further-ai": "51–200", "so-safe": "201–500", "daily-pay": "501–1,000", "maintain-x": "201–500",
});
AINATIVE_OVERRIDE.push("replit", "vapi", "openrouter", "further-ai", "hightouch", "writer", "anysphere", "kalepa", "sardine", "sosafe", "defense-unicorns", "runpod", "machinify", "maintainx", "typeform", "datavisor", "neara", "n8n", "edgerunner-ai", "infinity-constellation", "akasa", "clariti", "hugging-face", "nebius");

// --- manual patches for detail pages whose JSON-LD was absent ---
const PATCH = {
  "/jobs/principal-applied-ai-engineer-entity-agents-at-zoominfo": { title: "Principal Applied AI Engineer - Entity Agents", org: "ZoomInfo", datePosted: "2026-10-02", employmentType: "FULL_TIME", remote: "TELECOMMUTE", locationReq: "United States", apply: "https://www.zoominfo.com/careers?gh_jid=8845484002", companyUrl: "https://www.choppingblock.ai/companies/zoominfo" },
  "/jobs/senior-software-engineer-full-stack-at-cur-ai": { title: "Senior Software Engineer, Full-Stack", org: "Cur AI", datePosted: "2026-09-30", employmentType: "FULL_TIME", remote: "TELECOMMUTE", locationReq: "United States", apply: "https://jobs.lever.co/curai/46e0dd2f-c1dd-4ca2-9095-5b45f477b656/apply", companyUrl: "https://www.choppingblock.ai/companies/cur-ai" },
};

async function nearestApply(url) {
  try {
    const html = await (await fetch(url, UA)).text();
    const i = html.indexOf("Apply now");
    if (i < 0) return null;
    const before = html.slice(Math.max(0, i - 800), i);
    const hrefs = [...before.matchAll(/href="([^"]+)"/g)].map((m) => m[1].replace(/&amp;/g, "&"));
    return hrefs[hrefs.length - 1] || null;
  } catch { return null; }
}

for (const j of jobs) {
  if (PATCH[j.slug]) Object.assign(j, PATCH[j.slug]);
  if (!j.apply) {
    const a = await nearestApply(j.url);
    if (a && !a.startsWith("/")) j.apply = a.replace(/\?ref=aichoppingblock/, "");
  }
}

// --- company signal ---
for (const j of jobs) {
  const cslug = j.companyUrl ? j.companyUrl.split("/companies/")[1] : slugify(j.org);
  j.companySlug = cslug;
  const c = compMap.get(cslug) || {};
  j.compSize = SIZE_OVERRIDE[cslug] || c.size || null;
  j.compHq = c.hq || null;
  j.compFunding = c.funding || null;
  j.aiNative = AINATIVE_OVERRIDE.includes(cslug) ? true : !!c.aiNative;
  j.yc = !!c.yc;
  j.ycBatch = c.batchName || c.batch || null;
  if (["meta", "runway", "clay"].includes(cslug)) { j.yc = false; j.ycBatch = null; } // name collision with a different YC company
  j.compWebsite = WEBSITE_OVERRIDE[cslug] || c.website || null;
  j.compIndustry = c.industry || null;
  const AGENCY = ["raydar", "gramian-consulting", "nexaminds", "ignite-digital", "coderio", "silver-dev"];
  const PLATFORM = ["mindrift"];
  j.companyType = PLATFORM.includes(cslug) ? "freelance platform" : AGENCY.includes(cslug) ? "agency / consultancy" : "employer";
}

// --- filtering ---
const EXCLUDE_TITLE = /intern|new grad|graduate|early career|apprentice|research|deep learning|embodied|computational|machine learning|\bml engineer|ai\/ml|ads creative|ads ml|grant writer|attorney|evaluator|quality specialist|mission operator|data operations|program operations|quality engineer|quality and release|test engineer|security engineer|simulation|mobile|firmware|system framework|datacenter|workload performance|secure execution|psychologist|scientist|science writer|writer|graphic designer|designer|qa tester|localization|abstractor|account management|operations|strategy/i;
const EXCLUDE_SENIORITY = /manager|director|vice president|\bvp\b|head of|chief |associate director/i;

const isRelevant = (j) => {
  const t = j.title || "";
  if (EXCLUDE_TITLE.test(t)) return false;
  if (EXCLUDE_SENIORITY.test(t)) return false;
  return true;
};

// --- dedupe (collapse regional duplicates: same company + normalized title) ---
const norm = (t) => (t || "").toLowerCase().replace(/\bsr\.?\b/g, "senior").replace(/\(.*?\)/g, "").split("|")[0].replace(/[^a-z0-9]+/g, " ").trim();
const LOC_PRIORITY = [/united states|\bus\b|usa/i, /poland/i, /australia/i, /united kingdom|\buk\b/i, /europe|\beu\b/i, /canada/i, /pakistan/i];
const locRank = (s) => { for (let i = 0; i < LOC_PRIORITY.length; i++) if (LOC_PRIORITY[i].test(s || "")) return i; return 99; };

const groups = new Map();
for (const j of jobs) {
  if (!j.title || !j.org) continue;
  if (!isRelevant(j)) continue;
  const key = j.companySlug + "::" + norm(j.title);
  if (!groups.has(key)) groups.set(key, { base: j, variants: [j] });
  else groups.get(key).variants.push(j);
}

const picked = [];
for (const { base, variants } of groups.values()) {
  const best = variants.slice().sort((a, b) => locRank(a.locationReq) - locRank(b.locationReq))[0];
  const locs = [...new Set(variants.map((v) => v.locationReq).filter(Boolean))];
  picked.push({ ...best, locations: locs.length ? locs : [best.locationReq].filter(Boolean), variantTags: [...new Set(variants.flatMap((v) => (v.tags || []).filter((t) => !/^AI(-native)?$|Rising|New$/.test(t))))], variantCount: variants.length });
}

// --- scoring ---
function score(j) {
  const t = (j.title || "").toLowerCase();
  let role = 1.6;
  if (/research|scientist|deep learning|embodied/i.test(t)) role = 0.4;
  else if (/machine learning|ml engineer/i.test(t)) role = 1.1;
  else if (/data engineer|platform engineer|infrastructure|front-?end|mobile|firmware/i.test(t)) role = 1.3;
  else if (/ai engineer|applied ai|agentic|\bllm\b|forward deployed|full-?stack|software engineer|backend|software engineering|developer/i.test(t)) role = 2.0;
  let loc = 0.6;
  const locStr = (j.locations || []).join(" ") + " " + (j.locationReq || "");
  if (/united states|usa|\bus\b|u\.s\.|poland|australia|united kingdom|\buk\b|europe|\beu\b|canada|pakistan|worldwide|global|emea|north america|spain|france|germany|ireland|netherlands|sweden|romania|italy|greece|portugal|denmark|finland|austria|belgium|czech|hungary|slovakia|bulgaria|croatia|estonia|latvia|lithuania|slovenia|cyprus|malta|luxembourg|norway|switzerland|iceland|new zealand/i.test(locStr)) loc = 1.0;
  else if (/india|argentina|brazil|mexico|colombia|korea|japan|china|singapore|uae|dubai|egypt|israel|nigeria|turkey|vietnam|bangladesh|indonesia|philippines|georgia|serbia|uruguay|saudi|qatar|kenya|morocco|kazakhstan|chile|peru/i.test(locStr)) loc = 0.4;
  const ty = (j.employmentType || "").toUpperCase();
  const type = /CONTRACTOR|CONTRACT|FULL_TIME|PART_TIME/.test(ty) ? 0.5 : 0.3;
  const size = (j.compSize || "").replace("–", "-");
  let st = 0.3;
  if (/^1-10$|^11-50$/.test(size)) st = 1.2;
  else if (/^51-200$/.test(size)) st = 1.0;
  else if (/^201-500$/.test(size)) st = 0.6;
  else if (/^501-1000$/.test(size)) st = 0.4;
  else if (/^1001-5000$/.test(size)) st = 0.25;
  else if (/^5001-10000$|^10001\+$/.test(size)) st = 0.1;
  if (j.aiNative) st += 0.15;
  if (j.yc) st += 0.4;
  if (/seed|pre-seed|series a\b|series b\b/i.test(j.compFunding || "")) st += 0.1;
  st = Math.min(st, 1.4);
  if (j.companyType !== "employer") st = Math.max(0, st - 0.3); // agency/recruiter re-posts a client role
  const desc = (j.description || "").toLowerCase();
  const kw = ["python", "langchain", "langgraph", "agent", "rag", "retrieval", "llm", "prompt", "openai", "aws", "postgres", "typescript", "node", "react", "next.js", "docker", "embedding", "vector", "evaluat", "observab", "full-stack", "fullstack", "api"];
  const hits = kw.filter((k) => desc.includes(k));
  const fit = Math.min(hits.length / 12, 0.5);
  const total = Math.min(5, Math.round((role + loc + type + st + fit) * 10) / 10);
  return { total, role, loc, type, st, fit, kwHits: hits };
}

for (const j of picked) { const s = score(j); j.score = s.total; j.scoreParts = s; }

// label by age relative to 2026-10-05 (week 1 = last 7 days, week 2 = days 8-15)
const TODAY = Date.parse("2026-10-05T00:00:00Z");
for (const j of picked) {
  let age = null;
  if (j.datePosted) age = Math.round((TODAY - Date.parse(j.datePosted + "T00:00:00Z")) / 86400000);
  else if (typeof j.days === "number") age = j.days;
  j.ageDays = age;
  j.week = age == null ? "?" : age <= 7 ? "1" : "2";
}
picked.sort((a, b) => b.score - a.score || (a.ageDays ?? 99) - (b.ageDays ?? 99) || (a.title || "").localeCompare(b.title || ""));

await writeFile(new URL("./jobs-final.json", import.meta.url), JSON.stringify(picked, null, 2));
console.log(`Final: ${picked.length} unique relevant roles (from ${jobs.length} raw).`);
for (const j of picked) console.log([j.score.toFixed(1), (j.title || "").slice(0, 52), j.org, j.yc ? "YC:" + j.ycBatch : "", (j.compSize || "?"), (j.locations || []).join("/").slice(0, 34), j.employmentType].join(" | "));
