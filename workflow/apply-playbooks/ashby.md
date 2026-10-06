# Application Playbook — Ashby

**Platform:** `jobs.ashbyhq.com/<org>/<jobId>/application`
**Status:** form mapped 2026-10-07; **no Ashby submission yet** — the Ashby roles in our lists were all blocked (hybrid / security-clearance / US-resident-only). See `../data/apply-blockers.md`.

## 1. Check liveness FIRST (cheap, no browser)
Ashby exposes a public posting API — use it to confirm a job is still open and to enumerate an org's live roles:
```
GET https://api.ashbyhq.com/posting-api/job-board/<org>?includeCompensation=true
→ { jobs: [ { id, title, location, employmentType, ... } ] }
```
`<org>` is the slug in the URL (e.g. `baseten`, `redpanda-data`, `kraken.com`, `heidihealth.com.au`). If the job `id` isn't in `jobs[]`, it's **expired** — skip (we found `ema`'s role already gone).

## 2. Open the form
`https://jobs.ashbyhq.com/<org>/<jobId>/application` → wait for the "Name" field. A dead job shows **"Job not found"**.

## 3. Form structure
- **Autofill from resume** (optional upload).
- **Name**, **Email**, **Phone Number**, **Resume*** (`Upload File` button), sometimes **LinkedIn Profile** / **Current Company**.
- Custom questions as **Yes/No** and multi-option groups.
- **U.S. EEO** section (gender / race / veteran, sometimes **age range**) — voluntary.
- **Submit Application**.

## 4. Field map + answers
| Field | Value |
|---|---|
| Name | Muhammad Umer |
| Email | mumer.2k1@gmail.com |
| Phone | +92-3153271442 |
| Resume | tailored `output/cv-muhammad-umer-<company>-<date>.pdf` |
| Sponsorship (US) | **No** (`config/profile.yml`) |
| Legally authorized (US) | **Yes** (per `profile.yml` — flag residency separately) |

## 5. Quirks (learned 2026-10-07)
- **Radios are NOT `[radio]` — they render as `[button] "Yes"` / `[button] "No"`.** Ref labels are just "Yes"/"No", so match them **by order** against the question list (collect `[StaticText] "…?"` labels, map the Nth Yes/No pair).
- **Refs change on every snapshot** — take one snapshot and act immediately; don't reuse stale refs across calls.
- **Resume upload** targets the `Upload File` button nested under the `Resume*` label.
- Some forms include **`What is your current age?`** (range radios) with **no "decline" option**, and **"where did you hear about us?"** (combobox) — these need personal data we may not have on file → treat as a **data gap** (bucket it), don't guess.
- Company selects/comboboxes ("Start typing…") need a real option; type to trigger the list.

## 6. Efficient flow
1. Liveness via the posting API.
2. Open `/application`; wait for "Name".
3. One snapshot → map refs (text fields, `Upload File`, ordered Yes/No buttons).
4. Fill text, click the correct Yes/No by order, fill the spotted questions, upload resume.
5. Verify a `:checked` list + file name.
6. **Submit Application** → confirm the success page.
7. Track in `data/applications.md` + `data/applications-detail.md`.
