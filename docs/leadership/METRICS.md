# Metrics That Matter

A small set, reviewed weekly, each with an owner and a decision it drives.
If a metric doesn't change a decision, we stop reporting it.

## The set I run a team by

| Metric | Definition | Decision it drives |
|---|---|---|
| **Escaped defects** | Production defects by severity, tagged by root-cause class (missed case, data variant, environment, requirement gap) | Where strategy and regression coverage change next |
| **Regression cycle time** | Wall-clock time from "build ready" to a trustworthy regression verdict | Automation investment; this is the metric behind my 2-weeks → ~3-days validation improvement |
| **Flaky-test rate** | % of test runs failing without a product defect, per suite | Quarantine/fix priority; a flaky suite destroys trust in every other number |
| **Coverage by risk tier** | Tier 1/2 journeys with automated verification (not line coverage) | Where the next automation sprint goes |
| **Defect discovery curve** | When in the lifecycle defects are found (refinement, dev, QA, staging, prod) | Shift-left health — late discovery is the expensive kind |
| **Mean time to verify a fix** | Defect fixed → retested and closed | Environment/data/process bottlenecks |

## Metrics I refuse to headline

- **Raw test-case counts** — they reward writing tests, not finding risk
- **Pass percentage alone** — meaningless under skip/retry policies; mine is
  reported only alongside the hard pass/fail rules in Release Gates
- **Line coverage as a quality claim** — execution is not verification
- **Individual tester defect counts** — they punish collaboration and
  exploratory honesty, and I will not run a team on them

## How I report

One page, weekly (template: Sample Weekly Quality Report): release
recommendation first, the six metrics above as trend not snapshots, top
three risks in business language, and what I am changing next because of
the numbers. Metrics are a management tool, not a performance costume.
