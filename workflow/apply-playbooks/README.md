# Application Playbooks

Reusable, per-platform how-to for **submitting applications** (the apply-side counterpart to `../scrapers/`). One file per recurring platform: `apply-playbooks/<platform>.md`.

## When to create one
Only for **recurring or well-known** platforms — ATS/boards we hit ~3+ times or major ones: **Greenhouse, Ashby, Lever, Workday, Wellfound, SmartRecruiters, Workable**, etc. A one-off company career page needs **no** playbook.

## Workflow (every apply run)
1. Identify the platform from the apply URL (e.g. `jobs.ashbyhq.com/...`, `job-boards.greenhouse.io/...`).
2. **Read the matching playbook first** (if it exists).
3. Reuse the known field map / upload flow / submit button.
4. Only investigate what changed or isn't covered.
5. **Update the playbook** with anything new you learned.

## What each playbook must cover
- How to reach and open the form (canonical URL pattern).
- Required vs optional fields, and where each value comes from (`config/profile.yml`, `cv.md`).
- **Resume upload** method + the tailored CV path to use.
- **Work-authorisation / sponsorship / location** questions — exact wording seen and the standard answers.
- Common/eeo/self-identification questions and how they're handled.
- Custom questions → how to draft an answer (source-backed).
- The exact **submit** control and the **success** signal (page, URL, or email).
- **Anti-bot / captcha / login** behaviour and the fallback.
- Known quirks (React value-setting, file-input timing, multi-step forms).

## Index
| Platform | Playbook | Status |
|---|---|---|
| Workable | [workable.md](./workable.md) | ✅ created (2026-10-07, first apply) |
| Ashby | [ashby.md](./ashby.md) | ✅ mapped (2026-10-07); no submit yet — roles blocked |
| Greenhouse | — | pending |
| Lever | — | pending |
