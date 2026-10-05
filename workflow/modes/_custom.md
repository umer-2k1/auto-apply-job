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
     touched, and we never auto-submit an application for you).

     Because this is a user-layer file, anything you write here
     survives `node update-system.mjs`. Put customizations HERE,
     not in CLAUDE.md / modes/_shared.md / other system files --
     those get overwritten on update.
     ============================================================ -->

## House Rules

**Apply flow = PREPARE → my approval → AGENT AUTO-SUBMITS.** I do NOT want to fill or submit forms myself, ever. In apply mode:

1. **Prepare the complete application** in the live form via the browser (or from the JD if no browser is connected): every field value, every free-text answer, all sensitive/legal/self-identification/eligibility answers, the ATS's "Autofill from resume" where available, and the files to upload (tailored CV, cover letter if any) with their paths.
2. **Present it to me as a review sheet and ask for feedback/approval** — this is the ONE checkpoint where I want to be asked. Batch every uncertain legal/eligibility question here so I answer them once, up front.
3. **On my approval, drive the browser and click Submit on my behalf.** Do not stop before Submit once I have approved. Apply any corrections I give, then submit.
4. **Confirm the submission** (success page, or ask me to check my email), then update the tracker to `Applied` and seed the follow-up automatically.

Gate: never submit an application I have not reviewed and approved. Approval is the only gate — after it, the agent owns the submission. If a site's captcha or anti-automation blocks the submit, tell me plainly and give me the single manual step that remains.

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

(none yet -- add yours above)

## Off-Limits

<!-- Things the agent must never do for you. Examples:
     - Never auto-fill or submit an application without showing me first.
     - Never edit a system file to customize my setup -- put it here. -->

(none yet -- add yours above)
