# AI Adoption & Governance

I use AI in testing daily and have **built 10 custom AI agents/skills for
testing workflows** — drafting tests, generating data checks, summarizing
failures, and assembling evidence. My position as a lead: AI is a fast,
confident junior engineer on the team. It drafts; humans decide.

## Where AI works in my teams

- **Drafting** test cases and automation code from stories/acceptance
  criteria — reviewed line-by-line before merge, same as any junior's PR
- **Failure triage assistance** — clustering failures, summarizing logs and
  traces, suggesting likely layer (UI/API/data) to investigate first
- **Test-data and SQL check generation** — queries and fixtures drafted by
  AI, validated against real schemas and run by a human before use
- **Documentation and reporting drafts** — status summaries, release-note
  checks, coverage inventories

## Where AI never decides

- **Pass/fail.** No AI output is test evidence. A result counts when the
  framework executed it deterministically (hard pass/fail policy).
- **Release sign-off.** My recommendation is a human, accountable decision.
- **Production data.** No real member/patient/customer data, credentials,
  or internal documents go into external AI tools. Synthetic and
  de-identified data only.
- **Defect severity and risk acceptance.** AI can summarize impact;
  severity and ship decisions stay with named humans.

## Review rules (non-negotiable)

1. AI-generated code goes through the same code review, layering, and
   assertion standards as human code — plus one extra question: *did the
   author run it and watch it fail for the right reason?*
2. AI-generated assertions are suspect by default: models happily assert
   that a page "contains text" instead of verifying the business fact.
   Review checks assertion strength first.
3. Anything AI drafted that touches data validation is verified against
   an independent source (API vs UI vs database) before it joins a suite.
4. We log where AI helped in case-study work, so its contribution — and
   its mistakes — can be reviewed in retrospectives.

## How I roll it out to a team

Start with drafting and triage (high value, low risk), publish the review
rules above before scaling use, and measure honestly: time saved on
drafting vs time spent correcting. AI adoption that isn't measured
becomes either hype or shadow usage — both are management failures.
