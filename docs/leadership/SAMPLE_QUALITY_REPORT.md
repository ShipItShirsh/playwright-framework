# Sample Weekly Quality Report

The one-page format I give product and engineering leadership.
(Template — populated with clearly-marked sample entries in brackets.)

---

**Week of:** [date] · **Release:** [version] · **QA Lead:** Shirsh Malviya
**Recommendation:** SHIP / SHIP WITH RISKS / HOLD — [one sentence why]

## This week in three lines
- [Most important quality event: suite verdict, major defect, escape, milestone]
- [Second line]
- [Third line]

## Metrics (trend, not snapshot)
| Metric | This week | Trend | Note |
|---|---|---|---|
| Escaped defects (sev 1/2) | [n] | [↑↓→] | [class + playbook action] |
| Regression cycle time | [x days] | [↑↓→] | |
| Flaky-test rate | [x%] | [↑↓→] | [quarantines open] |
| Tier-1 journey coverage | [x%] | [↑↓→] | |
| Late-stage defect finds | [n] | [↑↓→] | [shift-left note] |

## Top risks
1. [Risk in business language — journey, users, impact — and mitigation/owner]
2. [Risk]
3. [Risk]

## Decisions I need
- [Decision — from whom — by when — default if no decision]

## What I am changing next week because of these numbers
- [Change tied to a metric or escape above]

---
*Rules behind this page: hard pass/fail evidence only (no skipped-as-green),
risks in business language, every number has an owner and a decision attached.*
