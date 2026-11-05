# QA Leadership Pack

For directors, hiring managers, and QA leadership reviewers.

The code in this repository is a sample of *how my teams build automation*.
This pack is the other half of the job: **how I lead quality** — strategy,
release decisions, metrics, people, and AI governance. Everything here is
written generically from my own practice; no employer documents, data, or
internal metrics are reproduced.

**About me, in leadership terms:** ~13 years in QA/QE, currently a
player-coach lead. Largest team managed directly: **10 QA engineers/SDETs,
3 of whom I hired**, including performance reviews and hiring decisions,
within a **10–15-person organization including offshore engineers**.
I have not managed other managers — I lead engineers directly, stay hands-on
in architecture and code review, and own release quality sign-off.

## Start here

| Document | What it answers |
|---|---|
| [Quality Strategy](QUALITY_STRATEGY.md) | How I decide what quality means for a product, and where testing effort goes |
| [Release Gates & Sign-off](RELEASE_GATES.md) | Entry/exit criteria, the go/no-go call, and how I communicate risk |
| [Metrics That Matter](METRICS.md) | The small set of numbers I run a team by — and the vanity metrics I refuse |
| [Team Operating Model](TEAM_OPERATING_MODEL.md) | Hiring bar, reviews, mentoring, offshore coordination, player-coach model |
| [Automation Strategy & ROI](AUTOMATION_STRATEGY.md) | Automate-vs-manual decisions, flaky-test discipline, maintenance economics |
| [AI Adoption & Governance](AI_ADOPTION.md) | Where AI generates tests in my teams, where it never decides, human review rules |
| [Production Escape Playbook](ESCAPE_PLAYBOOK.md) | How an escaped defect becomes a system fix, not a blame exercise — with a real, anonymized example |
| [Sample Weekly Quality Report](SAMPLE_QUALITY_REPORT.md) | The one-page status format I give product/engineering leadership |

## Proof points I can walk through in an interview

- **Cycle time:** replaced a 4-person, ~2-week manual validation process with
  an automated UI/API/SQL validation workflow — release validation now takes
  ~3 days (a 92% reduction). The lesson I draw from it: question the process
  before scaling the effort on it.
- **Framework leadership:** defined the layered Playwright/TypeScript
  architecture (this repo is the public sample), code-review standards, and
  the hard pass/fail policy my team works to.
- **AI tooling:** built 10 custom AI agents/skills for testing workflows
  (test generation, data checks, result analysis) — always with human review
  of the output before it counts as evidence.
- **People:** built a team of 10 through hiring, mentoring, and performance
  management, distributed across onshore and offshore engineers.
