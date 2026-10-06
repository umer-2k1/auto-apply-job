# Application Playbook — Workable

**Platform:** `apply.workable.com/<company>/j/<JOBID>/apply`
**First applied:** 2026-10-07 (Gramian Consulting — Senior SWE, AI Code Evaluation) ✅
**Verdict:** Easy, reliable to automate. Renders server-side; standard fields; clean success URL.

## URL pattern
- Job: `/j/<JOBID>/` · Application form: `/j/<JOBID>/apply` → on success the URL becomes `/apply?success` and shows *"Thank you! Your application has been submitted successfully."*

## Form structure (top → bottom)
1. **Autofill / Import resume** — optional (`Import resume from` select). We fill manually.
2. **Personal information** — First name*, Last name*, Email*, Phone* (country selector defaults by IP/prior; Pakistan +92), Address (optional).
3. **Profile** — Summary (optional textarea).
4. **Resume*** — `Choose file` (PDF/DOC/DOCX/ODT/RTF).
5. **Details** — custom questions (LinkedIn URL* + role-specific), then **Submit application**.

## Field map + answers we use
| Field | Value |
|---|---|
| First name / Last name | Muhammad / Umer |
| Email | mumer.2k1@gmail.com |
| Phone | `3153271442` (country +92 preselected) |
| Address | `Karachi, Sindh, Pakistan` |
| LinkedIn | `https://www.linkedin.com/in/mumer2001/` (required; must be real) |
| Summary | short source-backed summary |
| Resume | tailored `output/cv-muhammad-umer-<company>-<date>.pdf` |

## Quirks & gotchas (learned 2026-10-07)
- **Autocomplete double-fills the Address box** — `browser.fill` *appended* ("Karachi, PakistaKarachi, Sindh, Pakistan"). Fix: set via JS native setter + `input`/`change` events, or clear first. **Always verify the Address value.**
- **`browser.check` fails on the checkbox groups** (React-controlled). Fix: click the input via JS: `input.click()` where the label text matches.
- **Radios** (Boolean YES/NO and option groups) responded fine to `browser.click` on the ref; verify with a `:checked` count.
- **Submit may not fire on the first `browser.click`** — the button click often needs a second attempt / a JS `btn.click()`. Confirm via URL `?success` + "Thank you!" text.
- Required-answer questions vary per job (languages, experience, expected rate). Answer honestly from `config/profile.yml` / `cv.md`.
- Cookie banner appears — click **Accept all** / **Decline all** first so it can't overlay the submit.

## Efficient flow
1. Open `/apply`, wait for "First name".
2. Dismiss cookies.
3. Fill in ONE pass (snapshot refs → `fill_form` for text → JS-click checkboxes → click radios → upload resume).
4. **Verify** every field (esp. Address) + a `:checked` list.
5. Click **Submit application** (retry via JS if the URL doesn't change) → check for `?success`.
6. Record in `data/applications.md` + `data/applications-detail.md`.
