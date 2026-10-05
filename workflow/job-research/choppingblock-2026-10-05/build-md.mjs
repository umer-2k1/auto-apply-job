#!/usr/bin/env node
// Build the 15-day Markdown research deliverable (week 1 = last 7 days, week 2 = days 8-15).
import { readFile, writeFile } from "node:fs/promises";
const jobs = JSON.parse(await readFile(new URL("./jobs-final.json", import.meta.url), "utf8"));
const raw = JSON.parse(await readFile(new URL("./jobs-enriched.json", import.meta.url), "utf8"));

const T = (s) => (s == null ? "—" : String(s).replace(/\|/g, "\\|").trim() || "—");
const L = (u, label) => (u ? `[${label}](${u})` : "—");
const AP = (j) => { const u = j.apply || j.url; return u ? u.replace(/[?&]ref=aichoppingblock/, "") : null; };
const prettyType = (t) => ({ FULL_TIME: "Full-time", PART_TIME: "Part-time", CONTRACTOR: "Contractor", INTERN: "Intern", CONTRACT: "Contract" }[t] || t || "—");

function locFlag(j) {
  const s = (j.locations || []).join(" ").toLowerCase();
  const many = (j.locations || []).length >= 4;
  if (many) return "🌍 worldwide-ish";
  if (/united states|\bus\b|usa/.test(s) && !/europe|poland|united kingdom/.test(s)) return "🇺🇸 US-remote*";
  if (/poland/.test(s)) return "🇵🇱 Poland-remote";
  if (/australia/.test(s)) return "🇦🇺 Australia-remote";
  if (/united kingdom/.test(s)) return "🇬🇧 UK-remote";
  if (/europe|\beu\b|spain|france|germany|ireland|netherlands|sweden|romania|italy|greece|portugal|denmark|finland|austria|belgium|czech|hungary|estonia|latvia|lithuania|slovenia|cyprus|malta|luxembourg/i.test(s)) return "🇪🇺 EU-remote";
  if (/canada/.test(s)) return "🇨🇦 Canada-remote";
  if (/pakistan/.test(s)) return "🇵🇰 Pakistan-remote";
  const rawLoc = (j.locations || []).join(" / ") || j.locationReq || "";
  return rawLoc ? `remote (${T(rawLoc).slice(0, 40)})` : "remote";
}

const CURATED = {
  // ---- week 1 (last 7 days) ----
  "/jobs/forward-deployed-engineer-p2p-networking-at-webai": { why: "webAI is a lean, AI-native startup building private, distributed AI at the edge — you'd deliver their platform to customers while staying close to the model runtime.", fit: "Python + LLM/RAG + APIs and end-to-end shipping — mirrors your Sybrid/Kodexolabs delivery and your production-agent build.", watch: "US-remote scope (residency may apply); FDE implies some customer/travel time." },
  "/jobs/forward-deployed-implementation-engineer-emea-at-tenex-ai": { why: "TENEX.AI is an AI-native MDR (security) startup; the FDE role deploys AI-driven security automation for customers — small team, agentic product.", fit: "Client-facing AI delivery, integrations and Python/APIs — close to your forward-deployed-style work.", watch: "Security-domain context; UK/EMEA work-authorisation likely required." },
  "/jobs/senior-forward-deployed-engineer-at-buzz-solutions": { why: "Buzz Solutions is a ~small, AI-native company doing visual AI for the power grid — real industrial ML product with a lean team.", fit: "Strong: Python, agents, RAG, retrieval, LLM, prompting and evaluation all appear in the posting — that is your exact stack.", watch: "US-remote scope; domain is utilities/infrastructure." },
  "/jobs/senior-full-stack-software-developer-at-mecka": { why: "Mecka AI is a small, AI-native team building the data layer for robotics/embodied AI (frontier labs as customers) — lean and early-stage.", fit: "Modeled on your profile: Python, LLM/prompt, AWS, Postgres, TypeScript/Node full-stack across the stack.", watch: "Canada-remote scope (work-authorisation check)." },
  "/jobs/senior-software-engineer-agentic-ai-at-cur-ai": { why: "Curai is a US healthcare-AI company (Series B) where AI systems touch every step of care — the most direct match to your clinical decision-support agent experience.", fit: "Agentic AI + retrieval + prompting + evaluation + full-stack — a near-verbatim match to your Sybrid clinical agent and AI Virtual Trainer work.", watch: "US-remote scope; healthcare-compliance context." },
  "/jobs/forward-deployed-engineer-mid-senior-remote-w-travel-at-hippocratic-ai": { why: "Hippocratic AI (health-system AI, $141M raised) deploys production conversational AI agents with clinicians — a direct echo of your medical-chatbot/guardrails work.", fit: "LangChain, agents, RAG, retrieval, LLM, prompting — plus your clinical-decision-support domain knowledge is a rare differentiator.", watch: "US-remote + travel; likely US work authorisation/residency." },
  "/jobs/lang-chain-deployment-ai-engineer-at-nexaminds-587769": { why: "A staffing/consultancy posting for a LangChain-deployment AI engineering role in the US — worth a look, but the end client isn't named.", fit: "Python + LangChain/LangGraph + agents + RAG — literally your stack.", watch: "Agency/consultancy (client role); confirm the employer and US eligibility before investing time." },
  "/jobs/mid-senior-ai-engineer-at-tensorops": { why: "TensorOps is a boutique (≈small) AI consultancy shipping production AI — agentic, LLM fine-tuning and RAG — for enterprises and unicorns.", fit: "Python, LangChain, agents, RAG, embeddings, AWS — a strong applied-AI match; consultancy suits your fast-delivery style.", watch: "Spain/Europe scope; consultancy means varied client work." },
  "/jobs/senior-ai-engineer-agentic-ai-aws-remote-eu-at-gramian-consulting": { why: "Contractor role (Oct 2026–Jul 2027) building autonomous agents/multi-agent systems for a Big-4 client — agent orchestration, tool-calling, structured outputs, AWS, evals.", fit: "The JD reads like your stack: Python, LangChain/agent orchestration, tool calling, structured output, AWS, monitoring/evaluation.", watch: "Agency/consultancy; EU work authorisation required; 5–10 yrs expected." },
  "/jobs/senior-software-engineer-at-raydar-667820": { why: "Agency posting for a small, senior team building production conversational-AI voice agents for customer service — broad, hands-on, end-to-end.", fit: "Full-stack + real-time/LLM features + shipping end-to-end — aligned with your product-building track record.", watch: "Agency (client unnamed); US-remote — confirm employer and eligibility." },
  "/jobs/senior-software-engineer-ai-code-evaluation-at-gramian-consulting-740423": { why: "Contractor AI-code-evaluation work (LLM training/eval) — and it's one of the few postings that explicitly lists **Pakistan** as an eligible location.", fit: "Python, LLMs, evaluation, API work; your engineering judgment on code quality is directly relevant.", watch: "Contractor; code-evaluation is narrower than product engineering; 7+ yrs requested." },
  "/jobs/senior-software-engineer-full-stack-at-cur-ai": { why: "A second Curai opening — full-stack on a healthcare-AI product where AI is central to the patient journey.", fit: "Full-stack product engineering with Python/TypeScript and LLM features; matches your end-to-end product experience.", watch: "US-remote scope." },
  "/jobs/software-engineer-enterprise-engineering-at-coderabbit": { why: "CodeRabbit is a fast-growing (Series C) AI code-review platform used by 17k+ customers — AI-native dev-tools at scale.", fit: "Software engineering across the stack in an AI product; your LLM + API + data background ports well.", watch: "US-remote; Series C → larger team than a seed-stage startup." },
  "/jobs/senior-forward-deployed-engineer-public-sector-at-tines": { why: "Tines is an established intelligent-workflow/automation platform (Dublin + Boston); the FDE owns customer-facing automation delivery.", fit: "Automation/orchestration + integrations + shipping to customers — adjacent to your agentic n8n/workflow work.", watch: "Public-sector context; US-remote; security clearance may be needed." },
  "/jobs/software-engineer-partner-platform-at-baseten": { why: "Baseten powers production inference for frontier AI companies (Cursor, Notion, Abridge…) and recently raised a $1.5B Series F — deep AI-infra exposure.", fit: "Platform/partner engineering with APIs and integrations; your backend + LLM deployment experience fits, though it's more infra than agent-building.", watch: "US-remote; 201–500 team; infra-heavy." },
  "/jobs/software-engineer-front-end-europe-at-eloquent-ai": { why: "**YC Spring 2025**, ~11–50 people, building multimodal autonomous \"AI Operators\" for regulated finance — exactly the lean, early-stage profile you favour.", fit: "Front-end/full-stack on an agentic product; your Next.js/React + LLM-UI (streaming renderer) experience is a strong fit.", watch: "Title says Europe — confirm the actual country/work-authorisation for the EU posting." },
  // ---- week 2 (days 8-15) ----
  "/jobs/crdt-software-engineer-at-webai": { why: "A second webAI opening (the same work as their peer-to-peer engineer) on their distributed/edge inference stack — lean, AI-native team.", fit: "Systems/backend engineering with Python and real-time data flow; adjacent to your backend + inference work.", watch: "US-remote; systems-heavy (CRDT/distributed state)." },
  "/jobs/senior-applied-ai-engineer-agent-quality-evaluations-at-flodesk": { why: "Flodesk (Inc 5000 email-marketing SaaS) is hiring an applied-AI engineer focused on **agent quality and evaluations** — a lean team doing exactly the eval/guardrail work you already do.", fit: "Direct match: LLM evaluation, agent quality, guardrails, prompting — your Sybrid output-guardrail and evaluation experience.", watch: "US-remote scope." },
  "/jobs/senior-forward-deployed-engineer-labrynth-at-infinity-constellation": { why: "Labrynth (via Infinity Constellation) builds AI platforms for regulatory complexity; **11–50 people, Poland-remote** — a lean, early-stage European team.", fit: "Forward-deployed AI delivery with Python/LLM; matches your client-facing AI building.", watch: "Poland/EU scope; regulatory domain." },
  "/jobs/senior-software-developer-applied-ai-at-clariti": { why: "Clariti builds AI for government permitting (Canada, ~51–200) — applied-AI on a real product with a small team.", fit: "Python + LLM + full-stack applied-AI engineering; ports directly from your product-building background.", watch: "Canada-remote scope." },
  "/jobs/software-engineer-trust-safety-at-openrouter": { why: "OpenRouter is the leading LLM routing/infrastructure layer (~51–200, AI-native) — a chance to work at the centre of the model ecosystem.", fit: "Backend/API + LLM-infrastructure work; your REST/GraphQL + LLM-integration experience fits.", watch: "US-remote; infra-heavy, safety/governance focus." },
  "/jobs/senior-staff-software-engineer-autonomy-at-uforce": { why: "UFORCE is a UK defence-tech startup (~51–200) building autonomy/robotics software — lean, high-ownership engineering.", fit: "Senior full-stack/systems engineering; your end-to-end ownership maps, though the domain is defence robotics.", watch: "UK-remote; defence domain may require clearance." },
  "/jobs/software-engineer-applied-ai-at-akasa": { why: "AKASA builds generative-AI for healthcare revenue cycle (~201–500) — applied AI on a real clinical-adjacent product.", fit: "Applied-AI engineering with LLMs; adjacent to your clinical/healthcare AI experience.", watch: "US-remote scope." },
  "/jobs/staff-software-engineer-agentic-ads-at-replit": { why: "**Replit (YC W18)** — the agentic software-creation platform with millions of users; a chance to build agentic systems at real scale.", fit: "Agentic/LLM product engineering; your agent + full-stack background fits, though Staff level implies seniority depth.", watch: "US-remote; Staff-level bar; large-ish team (~501–1,000)." },
  "/jobs/member-of-technical-staff-frontend-at-vapi": { why: "**Vapi (YC W21)**, ~50 people, is the voice-AI infrastructure powering 1B+ calls for Amazon Ring, Intuit, ServiceTitan — lean and fast-moving.", fit: "Frontend/full-stack on a real-time voice-AI product; your streaming-LLM UI work (token streaming, incremental rendering) is unusually relevant.", watch: "US-remote; real-time audio/web domain." },
  "/jobs/forward-deployed-engineer-at-hightouch": { why: "**Hightouch (YC S19)**, ~501–1,000, an Agentic Marketing Platform — established product, AI-forward, customer-facing delivery.", fit: "FDE/forward-deployed engineering with data + AI; your client-facing AI delivery and data-layer work fits.", watch: "US-remote; larger team than a seed startup." },
  "/jobs/senior-ai-platform-developer-at-maintainx": { why: "MaintainX (13k+ customers, ~201–500) builds a mobile-first industrial work platform with a growing AI platform team.", fit: "AI platform/full-stack engineering; your platform + LLM experience ports well.", watch: "Canada-remote scope." },
  "/jobs/tech-lead-software-engineering-at-datavisor": { why: "DataVisor is an AI-powered fraud/risk platform (~201–500); a tech-lead role with strong ownership.", fit: "Senior/lead full-stack engineering with AI; your ownership and mentoring track record fits.", watch: "Ireland-remote scope; lead-level expectations." },
};

function why(j) {
  const c = CURATED[j.slug];
  if (c) return c;
  const t = (j.title || "").toLowerCase();
  const kw = (j.scoreParts && j.scoreParts.kwHits) || [];
  let lead;
  if (/agentic|agent|\bllm\b|ai engineer|applied ai|lang ?chain/.test(t)) lead = "Applied-AI / agentic fit";
  else if (/forward deployed/.test(t)) lead = "Forward-deployed (client-facing AI delivery) fit";
  else if (/full-?stack|front-?end|backend|software engineer|developer/.test(t)) lead = "Full-stack / product-engineering fit";
  else if (/data engineer|platform engineer|infrastructure|data platform/.test(t)) lead = "Adjacent data/platform engineering fit";
  else lead = "Transferable engineering fit";
  const k = kw.slice(0, 8);
  return { why: `${lead} at ${j.org}.`, fit: `Matched stack signals in the posting: ${k.length ? k.join(", ") : "general software engineering"}.`, watch: "" };
}

function signals(j) {
  const s = [];
  if (j.yc) s.push(`YC ${j.ycBatch || ""}`.trim());
  if (j.aiNative) s.push("AI-native");
  if (j.companyType && j.companyType !== "employer") s.push(j.companyType);
  if (j.compSize) s.push(`team ${j.compSize}`);
  if (j.compFunding) s.push(j.compFunding);
  if (/^(11–50|1–10|51–200)$/.test(j.compSize || "")) s.push("small / lean");
  return s.join(" · ") || "—";
}

const w1 = jobs.filter((j) => j.week === "1");
const w2 = jobs.filter((j) => j.week === "2");
const table = (arr) => arr.map((j, i) => `| ${i + 1} | ${j.score.toFixed(1)} | ${T(j.title)} | ${T(j.org)} | ${j.yc ? "✅ " + T(j.ycBatch) : "—"} | ${T(j.compSize)} | ${locFlag(j)} | ${prettyType(j.employmentType)} | ${T(j.datePosted)} | ${L(AP(j), "Apply")} |`).join("\n");
const HEAD = "| # | Score | Role | Company | YC | Team | Remote scope | Type | Posted | Apply |\n|---|-------|------|---------|----|----|--------------|------|--------|-------|";

const detail = jobs.slice(0, 22).map((j, i) => {
  const c = why(j);
  return `### ${i + 1}. ${T(j.title)} — ${T(j.org)}  \n**Score ${j.score.toFixed(1)}/5 · ${signals(j)} · ${locFlag(j)} · ${j.week === "1" ? "🆕 this week" : "📅 prior week"}**\n\n`
    + `- **Apply:** ${L(AP(j), AP(j))}  \n`
    + `- **Company:** ${L(j.compWebsite, j.org)}${j.compHq ? " · " + T(j.compHq) : ""}${j.compIndustry ? " · " + T(j.compIndustry) : ""}${j.compFunding ? " · " + T(j.compFunding) : ""}  \n`
    + `- **Employment type / posted:** ${prettyType(j.employmentType)} · ${T(j.datePosted)}  \n`
    + `- **Why it's interesting:** ${c.why}  \n`
    + `- **Why it fits you:** ${c.fit}  \n`
    + (c.watch ? `- **Watch-outs:** ${c.watch}\n` : "");
}).join("\n");

const compSeen = new Map();
for (const j of jobs) if (!compSeen.has(j.org)) compSeen.set(j.org, j);
const compRows = [...compSeen.values()].map((j) => `| ${T(j.org)} | ${j.yc ? "✅ " + T(j.ycBatch) : "—"} | ${T(j.compSize)} | ${T(j.compHq)} | ${T(j.compIndustry)} | ${T(j.compFunding)} | ${j.aiNative ? "✅" : "—"} |`).join("\n");
const ycList = [...compSeen.values()].filter((j) => j.yc).map((j) => `${j.org} (${j.ycBatch})`).join(", ");
const trackerRows = jobs.map((j, i) => `| ${i + 1} | ${j.week === "1" ? "🆕" : "📅"} | ${T(j.title)} | ${T(j.org)} | ${L(AP(j), "Apply")} | ⬜ todo | |`).join("\n");

const md = `# AI Chopping Block — 15-Day AI & Software Engineering Roles

**Generated:** 2026-10-05 · **Source:** [choppingblock.ai/jobs](https://www.choppingblock.ai/jobs) · **Candidate:** Muhammad Umer — AI / Applied AI / Full-Stack Engineer
**Window:** posted 2026-09-21 → 2026-10-05 · **Filter:** remote-eligible only · **New this week:** 🆕 (last 7 days) · **Prior week:** 📅 (days 8–15)

> Curated, not a dump. **${raw.length}** remote roles were pulled across the 15 days; after removing non-engineering, research/pure-ML, internship and people-management roles — and collapsing region-duplicated postings — **${jobs.length} relevant engineering roles** remain (**${w1.length} new this week**, **${w2.length} from the prior week**), ranked for your profile.

## Scoring

| Factor | Weight | Notes |
|---|---|---|
| Role relevance (AI / applied AI / full-stack / SWE) | 0–2.0 | core engineering relevance to your stack |
| Remote + location compatibility | 0–1.0 | US / Poland / Australia / EU / UK / Canada / worldwide |
| Employment type | 0–0.5 | contractor, freelance, full-time, part-time |
| Startup / lean-team signal | 0–1.4 | small team + AI-native + YC + early funding |
| Likelihood your background is a strong fit | 0–0.5 | stack overlap in the posting |

**Excluded on purpose:** research / pure- & heavy-ML roles, internships & new-grad, manager/director/VP, non-engineering (legal, writing, QA/support, design, data-ops), stale postings.

## ✅ Start here — best fit for your goals

1. **Cur AI — Senior Software Engineer, Agentic AI** (5.0) — agentic AI + retrieval + evals on a healthcare product; closest match to your clinical decision-support agent.
2. **Buzz Solutions — Senior Forward Deployed Engineer** (5.0) — ~11–50 person AI-native team; posting names agents, RAG, retrieval, prompting and evaluation — your exact stack.
3. **webAI — Forward Deployed Engineer** (5.0) — lean AI-native startup, private/distributed AI at the edge; Python + LLM/RAG + APIs.
4. **Mecka — Senior Full Stack Developer** (5.0) — small AI-native team building the data layer for robotics/embodied AI; full-stack + LLM.
5. **Flodesk — Senior Applied AI Engineer, Agent Quality & Evaluations** (5.0) 🆕 — the single best *title-matches-your-skills* posting in the batch (LLM evals + agents + guardrails).
6. **Gramian Consulting — Senior AI Engineer (Agentic AI / AWS), EU** (4.9) — **contractor**, agent orchestration + tool-calling + structured outputs + AWS + evals; Poland/EU.
7. **Hippocratic AI — Forward Deployed Engineer** (4.9) — production clinical AI agents; your medical-chatbot/guardrails work is a rare differentiator.
8. **Eloquent AI — Front-End Engineer, Europe** (4.6) — **YC (Spring 2025)**, ~11–50 people, multimodal agentic AI; lean and early-stage.

> New in the prior week worth a look: **OpenRouter**, **Clariti**, **Infinity Constellation (Labrynth, Poland)**, **AKASA**, **Vapi (YC W21)**, **FurtherAI (YC W24)**, **Replit (YC W18)**. Contract/freelance: **Gramian** (Agentic AI EU; AI Code Evaluation, open to **Pakistan**).

## 🆕 New this week (last 7 days)

${HEAD}
${table(w1)}

## 📅 Prior week (days 8–15)

${HEAD}
${table(w2)}

\\* **US-remote** = role is scoped to the United States. Your profile records US work authorisation, but *residency* is sometimes required too — confirm before applying.

## Why these are interesting (top 22, detailed)

${detail}

## Company signals (YC / size / funding)

**YC-backed in this set (${[...compSeen.values()].filter((j) => j.yc).length}):** ${ycList}. Everything else was checked against ycombinator.com and is not YC (or shares a name with a different YC company — e.g. Meta/Runway/Clay were excluded as name collisions). Size/funding for agencies and unprofiled companies is approximate.

| Company | YC / batch | Team size | HQ | Industry | Funding | AI-native |
|---|---|---|---|---|---|---|
${compRows}

## 📝 Application tracker (fill as we go)

| # | Week | Role | Company | Apply | Status | Notes |
|---|------|------|---------|-------|--------|-------|
${trackerRows}

Statuses: ⬜ todo · 🟡 drafting CV · 📨 applied · 💬 replied · 🗓️ interview · ❌ passed

## Source files

- \`jobs-enriched.json\` — all ${raw.length} remote roles ≤15 days, with full JD text + structured data (JSON-LD).
- \`jobs-final.json\` — the ${jobs.length} filtered, scored roles (with week + age).
- \`companies.json\` — company profiles (size, HQ, funding) + YC checks.
- \`scrape.mjs\` → \`companies.mjs\` → \`yc.mjs\` → \`finalize-data.mjs\` → \`build-md.mjs\` — reproducible, zero-token pipeline.

## Caveats

- **Location eligibility:** most roles are remote but scoped to a country/region (see the *Remote scope* column). US/EU/Poland/UK/Canada/Australia scopes are included per your instruction — confirm residency/work-authorisation before applying.
- **Agencies & consultancies** (Raydar, Gramian, Nexaminds, Ignite Digital, Coderio, Silver.dev, Mindrift) re-post *client/client-platform* roles; the end employer and eligibility should be confirmed first.
- Company sizes/funding for unprofiled companies are approximate.
`;

await writeFile(new URL("./choppingblock-jobs-15day-2026-10-05.md", import.meta.url), md);
console.log(`Wrote choppingblock-jobs-15day-2026-10-05.md (${md.length} chars) — week1:${w1.length} week2:${w2.length}`);
