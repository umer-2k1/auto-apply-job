# Custom Instructions -- career-ops

<!-- ============================================================
     THIS FILE IS YOURS. It will NEVER be auto-updated.

     Put your own house rules, custom workflows, and automations
     here -- anything you want the agent to ALWAYS do (or never do).

     This is for PROCEDURAL rules ("HOW I want things done").
     For WHO you are (archetypes, narrative, comp, negotiation),
     use modes/_profile.md instead. Keeping the two separate keeps
     each one readable.

     The agent reads this file alongside the system instructions;
     your rules here take precedence over the defaults, as long as
     they don't break the Data Contract (your files are never
     touched). Applications are submitted ONLY through the
     Job-Search Workflow below (my explicit "apply" command).

     Because this is a user-layer file, anything you write here
     survives `node update-system.mjs`. Put customizations HERE,
     not in CLAUDE.md / modes/_shared.md / other system files --
     those get overwritten on update.
     ============================================================ -->

## House Rules

### Job-Search Workflow (DEFAULT — never wait to be reminded)

Standing workflow for ANY job-search task. `AGENTS.md` points here. Two modes, two triggers.

**Mode 1 — FIND / SCRAPE.** Trigger: "scrape <site>", "find me <role> jobs", "grab jobs from <site>", or a pasted JD/link. Do ALL of the following, then **STOP** (do NOT apply):
1. Scrape the relevant jobs within the task's scope from the given site/board/search/role.
2. Filter to my profile (target roles, experience, skills, location/remote, work authorisation).
3. Research the company behind EVERY relevant job (signals below).
4. Rank / categorise the opportunities by how promising they are.
5. Generate a tailored, source-backed resume per job (`cv.md`) into `output/`.
6. Write the tracker rows and produce the networking shortlist.
Present the list(s) for my review, then stop.

**No fixed numbers.** "20 jobs" / "5 networking targets" are EXAMPLES ONLY — the real count is whatever the task and the pool of relevant roles produce.

**Mode 2 — APPLY.** Trigger: "apply to these jobs" / "apply to all". 
- Apply to every relevant scraped job that has a generated resume.
- **Do NOT ask for approval.** The review already happened at the FIND stage; my "apply" command IS the approval.
- Work through them in batches or one-by-one.
- **Blockers do not stall the run.** If a job needs a login/credential/captcha or is otherwise blocked: skip it, record it in the BLOCKED bucket (`data/apply-blockers.md`), continue with the rest, and we clear blockers afterwards.
- Update the trackers immediately after EACH submission.

### Company research signals (per relevant job)
Size · lean/small team · international employees · remote employees · hires internationally · contractors / remote contractors · employees from India / Pakistan / other countries · recent funding · recent hiring/growth · recent news · startup stage · founders/background · signs of active expansion · any signal that they may be receptive to international/remote talent.
Purpose: **not** to reject a relevant job (a relevant job still gets applied to) — it decides which companies are worth **networking** with afterwards.

### Networking shortlist
After research, produce a **separate ranked file** (`data/networking.md`): **Highest / High / Medium** potential, each with a short "why" and the signals behind the ranking. I do the outreach; you identify + prioritise.

### Tracking
- Canonical applications: `data/applications.md` — **do not restructure it** (career-ops scripts depend on its schema).
- Rich per-application detail: `data/applications-detail.md`.
- Networking: `data/networking.md`. Blockers: `data/apply-blockers.md`.
- Update immediately after every application; never re-apply to a job already recorded.

### Playbooks
- **Scraping playbooks:** `scrapers/<site>/README.md`. Create/refresh ONLY for recurring or well-known platforms (seen ~3+ times, or major ATS/boards: Greenhouse, Ashby, Lever, Workday, Wellfound, choppingblock). A one-off company career page needs NO playbook.
- **Application playbooks:** `apply-playbooks/<platform>.md`. Same rule.
- ALWAYS check the existing playbook first; reuse it; only re-investigate what changed; update it when you learn something new.

When Muhammad explicitly asks to apply to a role despite its score or recommendation, proceed with application preparation without debating the recommendation. State factual blockers or unresolved eligibility only once, then prepare the strongest source-backed materials.

<!-- Rules the agent should always follow. Examples:
     - Always write evaluation summaries in British English.
     - Never include a photo in my CV (US / ATS-first market).
     - Cap each batch run at 20 listings unless I say otherwise.
     - If a report scores below 6, skip the cover letter. -->

(none yet -- add yours above)

## Custom Workflows

<!-- Multi-step routines you run often, given a short name. Examples:
     - "weekly review": scan my saved portals, evaluate the new roles,
       then give me a one-paragraph summary of the top 3.
     - "prep <company>": pull the JD, generate STAR stories from
       article-digest.md, and draft 5 likely interview questions. -->

(none yet -- add yours above)

## Output Preferences

<!-- How you like results formatted. Examples:
     - Reports: lead with the score and the one-line verdict.
     - Show the per-step token breakdown after a batch run.
     - Save PDFs date-first: YYYY-MM-DD-company.pdf -->

CV rules:
- Section order: **Professional Summary → Skills → Work Experience → Projects → Education** (also enforced machine-side via `config/profile.yml` → `cv.sections`).
- **Omit the "Core Competencies" section.** Keep a single "Skills" section and fold any unique competency terms into it — a separate competencies block is redundant next to Skills and is not required by ATS.

## Third-Party Integrations — One CLI (`one`)

The One CLI is installed and authenticated on this machine (account: mumer.2k1@gmail.com; config `~/.one/config.json`). It gives me access to **750+ platforms** (Gmail, Slack, Stripe, Notion, GitHub, HubSpot, etc.). **Whenever I need to interact with a 3rd-party platform or external service, use the One CLI** — it is the primary tool for integrations.

**Always use `--agent`** (right after `one`) for structured JSON:
- `one --agent list` — connected platforms + connection keys
- `one --agent actions find <platform> "<intent>" [<platform> "<intent>" ...] [--task "<job>"]` — find every action a task needs, **with docs** (read them before executing)
- `one --agent actions load <actionId> --section <name> | --full` — more of an action's doc
- `one --agent actions execute <platform> <actionId> <connectionKey> -d '{...}'` — execute
- `one --agent flow create` — multi-step workflows · `one --agent relay create` — webhook relay
- `one --agent guide` — full docs · `one add <platform>` — connect a new platform (interactive)

**Rules:** read the action's docs *before* executing; never guess parameters; **confirm with me before anything that sends, modifies, or deletes** external data; always use the connection key from `one --agent list`.

**Job-search use:** read **Gmail** to auto-fetch email verification/security codes and sign-in links during applications (self-unblocking), and to classify recruiter replies.

### ⚠️ Use the CLI, NOT the MCP
The `one` **MCP** tools in this harness resolve to a *different One environment* — Gmail exec there fails with *"this connection belongs to a different environment"*. **Ignore the MCP; always use the `one` CLI**, which is authenticated and sees the Gmail connection.

**Connection key (Gmail):** `live::gmail::default::3e1ab628917349c4af987d5a4ddb6f80`

**Read a verification/security code (verified working):**
```bash
one --agent actions execute gmail \
  "conn_mod_def::GGSNOTZxFUU::ZWXBuJboTpS3Q_U06pF8gA" \
  "live::gmail::default::3e1ab628917349c4af987d5a4ddb6f80" \
  -d '{"connectionKey":"live::gmail::default::3e1ab628917349c4af987d5a4ddb6f80","numberOfEmails":5,"query":"subject:(security code) newer_than:2d","format":"full"}'
```
The actionId `conn_mod_def::GGSNOTZxFUU::ZWXBuJboTpS3Q_U06pF8gA` = Gmail "Get Emails" (search/list, `format:"full"|"metadata"`). Helper: `scripts/one-gmail-code.sh`. Env: if `one` is not on PATH, use `~/.nvm/versions/node/v22.23.1/bin/one`.

## Off-Limits

- **NEVER scrape LinkedIn** (profile-ban risk), and never use or request LinkedIn sessions/cookies. Use the public web, news, X (Twitter) and company career pages only. If nothing is found, that is acceptable.
- Never restructure `data/applications.md` — career-ops scripts parse its schema.
- Never add unverifiable claims to a CV or application (no fabrication).
- Never treat example numbers ("20 jobs", "5 networking targets") as fixed requirements.
