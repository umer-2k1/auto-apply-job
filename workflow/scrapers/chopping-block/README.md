# choppingblock.ai — scraping playbook

**Site:** AI Chopping Block — https://www.choppingblock.ai (aka `web.choppingblock.ai`)
**Type:** Aggregator of AI/engineering jobs, read daily from companies' own ATS boards (~30k open roles).
**Fetch method:** **Plain HTTP only** — no browser, no JS, no auth, no cookies.
**Difficulty:** Easy. Server-rendered (Next.js App Router) with structured data (JSON-LD) on job pages.

> Read this top-to-bottom before scraping. It captures everything learned from a full 15-day run (275 roles) so you can skip DOM exploration entirely.

---

## TL;DR — the 5 things that matter

1. **Listing pages are SSR and fetchable.** `GET https://www.choppingblock.ai/jobs?<filters>&page=N`. 25 cards per page, date-sorted newest-first.
2. **Filters are URL query params**, so you can build precise URLs instead of clicking the UI: `category`, `remote`, `type`, `seniority`, `q` (search), `company`, `page`.
3. **Job detail pages carry JSON-LD `JobPosting`** — the single most token-efficient source of truth (title, company, `datePosted`, `employmentType`, remote country, full JD text).
4. **Company pages carry profile facts** (`/companies/<slug>`): team size, HQ, industry, last funding, website, AI-native flag.
5. **Stop conditions matter.** Dates on listing pages are relative ("2 days ago"); stop paginating once a page crosses your cutoff. Use `datePosted` from the detail JSON-LD for exact dates.

---

## 1. How the site is built

- **Next.js App Router** with React Server Components (RSC). Static assets under `web.choppingblock.ai/_next/...`.
- **Pages are server-rendered**, so the **initial HTML already contains all 25 job cards** — you do **not** need a headless browser.
- Behind **Cloudflare** (a `cloudflareinsights` beacon loads), but **no challenge/CAPTCHA** was hit for plain HTTP GETs.
- **Analytics**: Meta pixel + Google Tag Manager load on the page. (Fun fact: the Meta pixel's `referrer` parameter exposed the *filtered* URL, which is how we first confirmed the query-param names.)
- **No API/JSON endpoint is required.** There is an `?_rsc=` RSC variant, but you don't need it — plain HTML is enough.

---

## 2. URL map

| URL | What it is |
|-----|------------|
| `/jobs` | Job listing (25/page). Supports query params below. |
| `/jobs?<params>&page=N` | Filtered/paginated listing. |
| `/jobs/<slug>` | Job detail page (SSR + JSON-LD). Slug = `{title-slug}-at-{company-slug}[-{numericId}]`. |
| `/companies` | Company directory. |
| `/companies/<slug>` | Company profile (size, HQ, industry, funding, website). |
| `/ai-jobs/job-category/<slug>` | SEO category landing page (e.g. `ai-software-engineer`). |
| `/ai-jobs/job-country/<country>` | SEO country landing page (e.g. `united-states`). |
| `/ai-jobs/job-skill/<skill>` | SEO skill landing page (e.g. `python`). |

### Listing query parameters (validated)

| Param | Values seen / used | Notes |
|-------|--------------------|-------|
| `category` | `ai-engineer`, `software-engineer`, `machine-learning-engineer`, `forward-deployed-engineer`, `data-engineer` | These are the valid role slugs. Other guesses (`full-stack-engineer`, `backend-engineer`, `frontend-engineer`, `devops-engineer`) return **zero** results. |
| `remote` | `remote`, `anywhere` | `remote` = location-scoped remote. `anywhere` = the site's "Anywhere" bucket (**stale** — see §11). `hybrid`/`onsite` exist as UI filters (unconfirmed as params). |
| `type` | `full-time`, `contractor`, `part-time` (also `intern`, `temporary`, `volunteer`, `other`) | `contract` returns nothing; use `contractor`. |
| `seniority` | `senior` (confirmed); UI also lists `intern, entry level, junior, mid level, staff, principal, lead, manager, director, vp, executive` | Param value for "Mid level" is unconfirmed (likely `mid` / `mid-level`). |
| `q` | free text | Searches **job title or company**. Noisy — e.g. `q=worldwide` matches Amazon's "Worldwide" org, not remote scope. |
| `company` | company slug, e.g. `amazon`, `nvidia` | Seen in the site's own footer links. |
| `page` | `1..N` | 25 results per page. |

> **Category shorthand is not exhaustive.** Full-stack / backend / frontend roles are **not** dedicated categories — find them with `q=full+stack`, `q=backend`, `q=frontend`, or they appear under `category=software-engineer`.

---

## 3. Enumerating jobs (listing pages)

**Request:** `GET /jobs?category=ai-engineer&remote=remote&page=1` with a desktop UA.
**Result:** 25 cards in the initial HTML, newest first.

### Reliable card selectors (validated)

Split the HTML on the card wrapper, then parse each card:

```js
// Split into cards — this exact class string is the reliable delimiter
const cards = html.split('<li class="group relative grid').slice(1);

for (const p of cards) {
  const slug  = (p.match(/href="(\/jobs\/[^"?#]+)"/) || [])[1];                 // detail path
  const title = strip((p.match(/<h3[^>]*>\s*<a[^>]*>([\s\S]*?)<\/a>/) || [])[1]);
  const comp  = strip((p.match(/<p class="mt-1[^"]*">([\s\S]*?)<\/p>/) || [])[1]); // company name
  const date  = strip((p.match(/<span class="text-xs text-tertiary">([\s\S]*?)<\/span>/) || [])[1]);
  const tags  = [...p.matchAll(/<button[^>]*>([\s\S]*?)<\/button>/g)].map(m => strip(m[1]));
  // title, company, date, tags => classify
}

const strip = s => (s || "")
  .replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&#x27;|&#39;/g, "'")
  .replace(/&quot;/g, '"').replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
```

**Field locations on a card**
- **Title + link:** `<h3 …><a href="/jobs/…">Title</a></h3>` (the `h3 > a` is the anchor of truth).
- **Company:** the first `<p class="mt-1 …">` after the heading.
- **Date:** `<span class="text-xs text-tertiary">…</span>` — *relative* text (`New`, `3 days ago`).
- **Tags/badges:** every `<button>` in the card (e.g. `AI-native`, `New`, `Rising`, `AI`, a location, an employment type).

### Date parsing (listing)
| Text | Meaning |
|------|---------|
| `New` / `just now` / `N hours ago` | today → age 0 |
| `N days ago` | age = N |
| `N weeks ago` | age = N×7 |
| `N months ago` | age = N×30 (treat as out-of-window) |

### Sorting + stop condition
- Filtered listing pages are **date-sorted newest→oldest** (verified: page1 2–5 days, page2 5–9, page3 9–11…).
- **Stop paginating when a page yields zero cards inside your window**, or when the page's newest card is already older than the cutoff. Cap pages (e.g. 8) as a guard.
- The **unfiltered** `/jobs` default order is a "Picked by hand" curation, **not** strictly by date — always constrain with a filter before trusting the order.

---

## 4. Job detail page — the efficient path

**Request:** `GET /jobs/<slug>` → the HTML contains a `<script type="application/ld+json">` with a schema.org **JobPosting**:

```js
const ld = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
// ld.title, ld.datePosted, ld.validThrough, ld.employmentType, ld.jobLocationType ("TELECOMMUTE"),
// ld.applicantLocationRequirements.name (country), ld.directApply, ld.hiringOrganization.name,
// ld.hiringOrganization.sameAs (company page URL), ld.description (full HTML JD), ld.identifier.value
```

**This is the highest-value request in the whole pipeline** — one fetch gives exact dates, employment type, remote country, company, and the entire JD text.

### Apply link (not in JSON-LD)
The real apply URL points at the employer's ATS. Extract the **nearest `href` before the text "Apply now"**:

```js
const i = html.indexOf("Apply now");
const before = html.slice(Math.max(0, i - 800), i);
const hrefs = [...before.matchAll(/href="([^"]+)"/g)].map(m => m[1].replace(/&amp;/g, "&"));
const apply = hrefs[hrefs.length - 1];   // e.g. greenhouse / ashbyhq / lever / workable / myworkdayjobs
// strip the "?ref=aichoppingblock" / "&ref=aichoppingblock" tracking suffix
```

ATS hosts seen on apply links: `job-boards.greenhouse.io`, `job-boards.eu.greenhouse.io`, `jobs.ashbyhq.com`, `jobs.lever.co`, `apply.workable.com`, `*.myworkdayjobs.com`, plus a few company-hosted `…/careers?gh_jid=…` URLs.

### Fallback when JSON-LD is missing
Some job pages have **no** JSON-LD. Then:
- Title: `<h1>…</h1>` (or `og:title`).
- Posted date: the text after `<p …>Posted on</p><p …>2 October 2026</p>`.
- Remote/location: the `<p class="mt-1 text-secondary">Remote</p>` block near the date.
- Apply: same "nearest `href` before `Apply now`" trick.

---

## 5. Company profile pages

**Request:** `GET /companies/<slug>` → facts live in a `<dt>/<dd>` list:

```js
const dt = label => { const m = html.match(new RegExp(label + "<\\/dt><dd[^>]*>([\\s\\S]*?)<\\/dd>")); return m ? strip(m[1]) : null; };
dt("Company size");   // "201–500"
dt("Headquarters");   // "Palo Alto, CA"
dt("Industry");       // "Hospitals and Health Care"
dt("Last funding");   // "$141M Series B"
// website:  <a href="https://…?ref=aichoppingblock">
// AI-native: /AI-native<\/button>/.test(html)
// open roles + work mix:  /([\d,]+)\s*open roles/  and  /Remote\s*(\d+)\s*Hybrid\s*(\d+)\s*On-site\s*(\d+)/
```

**Caveats:** not every company has a profile — many `/companies/<slug>` URLs **404** (they still appear linked from job pages). When 404, fall back to job-page data or a small vetted override map. Some profile values are itself inaccurate (e.g. odd HQ values) — treat as approximate.

---

## 6. Anti-scraping / rate limits

- **None hit.** Plain HTTP GET with a normal desktop User-Agent worked for hundreds of requests across listings, job pages and company pages.
- **Concurrency ≤ 8** was fine for detail fetches (parallel with a pool). Keep listing pages **sequential**.
- Behind **Cloudflare**, so a polite UA + low concurrency is the safe default. Do not spoof or rotate aggressively; there's no need.
- No login, cookies, or headers beyond `user-agent` are required. `accept-language: en-US,en;q=0.9` is a harmless addition.

---

## 7. What worked / what didn't

**Worked**
- `fetch()` on `/jobs?...&page=N` + regex card parsing.
- `fetch()` on `/jobs/<slug>` + JSON-LD (`JobPosting`) parsing.
- `fetch()` on `/companies/<slug>` + `<dt>/<dd>` parsing.
- Constructing filter URLs directly (the UI's filter clicks just set these params).
- Using the `referrer` in the Meta-pixel URL to reverse-engineer param names (nice trick, but you shouldn't need it now).

**Didn't work / avoid**
- **No date filter exists.** There is no `posted=`/`days=` param (ignored). Use the date-relative text + stop conditions instead.
- **`remote=anywhere` is a dead bucket** (newest role is ~12 days old; page 2 is "over a year ago"). Don't use it for fresh roles — use `remote=remote`.
- **`q` search is a title/company substring match**, not a semantic search — expect noise.
- **The browser is unnecessary** here; using it burns tokens for no gain (only reach for it for the actual apply flow).
- **Do not crawl the whole board** (30k roles). Always filter first.
- **Guessing category slugs fails silently** (returns nothing, not an error) — stick to the validated list in §2.

---

## 8. Most token-efficient recipe

For a new run, do **only this** (no DOM inspection, no browser):

1. Pick filters, e.g. `category=ai-engineer&remote=remote`, and **paginate**:
   `GET /jobs?category=ai-engineer&remote=remote&page=N` until a page has 0 cards inside your window.
2. Dedupe collected `/jobs/<slug>` links.
3. For each slug, **one** `GET /jobs/<slug>` → parse **JSON-LD** + apply link.
4. (Optional) For each unique company, **one** `GET /companies/<slug>` → size/HQ/funding.
5. Filter/dedupe/score locally; render the Markdown.

Total requests for a 15-day, 5-category run: **~35 listing pages + ~275 detail pages + ~60 company pages** — a few minutes, zero LLM tokens.

### Reusable implementation
Everything above is implemented (and battle-tested) in `../job-research/choppingblock-2026-10-05/`:

```
scrape.mjs        # 14 filter streams + detail enrichment  -> jobs-enriched.json   (choppingblock.ai)
companies.mjs     # /companies/<slug> profiles              -> companies.json       (choppingblock.ai)
yc.mjs            # (optional) YC check                     -> companies.json       (hits ycombinator.com — a separate source)
finalize-data.mjs # filter, dedupe, score, week-label       -> jobs-final.json
build-md.mjs      # render the Markdown deliverable
```

Re-run:
```bash
cd ../job-research/choppingblock-2026-10-05
node scrape.mjs && node companies.mjs && node yc.mjs && node finalize-data.mjs && node build-md.mjs
```
Adjust the window in `scrape.mjs` via `MAX_DAYS` / `MAX_PAGES`.

### Minimal curl checks
```bash
UA='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124 Safari/537.36'

# Does a category+remote filter return anything? (look for "1–25 of N")
curl -s -A "$UA" 'https://www.choppingblock.ai/jobs?category=ai-engineer&remote=remote' | grep -oE '[0-9,]+ of [0-9,]+|Nothing matches'

# Pull one job's JSON-LD
curl -s -A "$UA" 'https://www.choppingblock.ai/jobs/mid-senior-ai-engineer-at-tensorops' \
  | perl -0ne 'print $1 if /<script type="application\/ld\+json">(.*?)<\/script>/s'
```

---

## 9. Edge cases & pitfalls

- **Region-duplicated roles.** The same role is posted once per country/region (e.g. Mindrift = 24 near-identical postings; Grafana = one row per country; Gramian = one per country group). **Dedupe by company + normalized title**, keep the best apply link and collect all regions.
- **Agencies / consultancies.** `Raydar`, `Gramian Consulting`, `Nexaminds`, `Ignite Digital`, `Coderio`, `Silver.dev`, `Mindrift` re-post **client / platform** roles — the end employer is unnamed. Flag them; don't rank as "lean employer".
- **Badges ≠ data.** `Rising`, `New`, `AI-native`, `AI` are buttons; `New` is a *badge*, not the posting date (the date is the `text-xs text-tertiary` span).
- **Non-engineering noise in `software-engineer`.** Internships, new-grad, QA, localization, design, writing and data-ops roles appear; exclude by title regex.
- **Titles embed region.** e.g. `… | US | Remote`, `Senior Fullstack Engineer - UK` — strip suffixes when deduping; keep them for display.
- **`Sr.` vs `Senior`** breaks naive dedupe — normalize.
- **Some slugs carry a trailing numeric id** (`…-at-samsara-766281`) for genuinely distinct reqs at the same company/title → keep by **slug**, don't over-dedupe sibling reqs.
- **JSON-LD occasionally absent** → use the §4 fallback.
- **Company pages 404** for unprofiled companies → fall back or override.
- **`ref=aichoppingblock`** is appended to apply links; strip it.
- **Dates drift.** Recompute "last N days" from `datePosted` (detail JSON-LD) rather than trusting relative listing text at parse time.

---

## 10. Field cheat-sheet

| Field | Best source | Selector / key |
|-------|-------------|----------------|
| Title | detail page (or card) | JSON-LD `title` (card: `h3 > a` text) |
| Company | detail page | JSON-LD `hiringOrganization.name` |
| Posted date | detail page | JSON-LD `datePosted` (card: `span.text-xs.text-tertiary`) |
| Employment type | detail page | JSON-LD `employmentType` |
| Remote? | detail page | JSON-LD `jobLocationType` (`TELECOMMUTE`) |
| Country / region | detail page | JSON-LD `applicantLocationRequirements.name` |
| Full JD | detail page | JSON-LD `description` |
| Apply URL | detail page | nearest `href` before `Apply now` (**not** JSON-LD) |
| Company page | detail page | JSON-LD `hiringOrganization.sameAs` |
| Team size | `/companies/<slug>` | `<dt>Company size</dt><dd>` |
| HQ | `/companies/<slug>` | `<dt>Headquarters</dt><dd>` |
| Industry | `/companies/<slug>` | `<dt>Industry</dt><dd>` |
| Funding | `/companies/<slug>` | `<dt>Last funding</dt><dd>` |
| Website | `/companies/<slug>` | `<a href="…?ref=aichoppingblock">` |
| AI-native | `/companies/<slug>` | `/AI-native<\/button>/` |
| Open roles | `/companies/<slug>` | `/([\d,]+)\s*open roles/` |

---

## 11. Maintenance notes

- **Verify the two structural anchors each run** (they're the likeliest to change on a redesign):
  1. the card split token `<li class="group relative grid`;
  2. the JSON-LD block `<script type="application/ld+json">`.
  If either disappears, the site was rebuilt — re-inspect the card `<li>` and the `<h3>/<p>/<span>` chain.
- **Param names** (`category`, `remote`, `type`, `seniority`, `q`, `company`, `page`) are stable but worth a 1-request sanity check if counts look wrong.
- **Don't add new category slugs** without verifying they return results (invalid slugs return empty silently).
