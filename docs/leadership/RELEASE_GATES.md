# Release Gates & Sign-off

I own a clear, written recommendation on every release: **ship, ship with
named risks, or hold** — with the evidence behind it. "QA is still testing"
is not a status.

## Entry criteria (testing can start meaningfully when)

- Acceptance criteria are reviewed and testable; ambiguities resolved or logged as risks
- Build is deployed to QA with release notes and known-issue list
- Test data for critical journeys is ready (including edge-case variants — see Escape Playbook)
- API contracts for changed services are published and checkable

## Exit criteria (sign-off requires)

- Tier 1 automated suite green with **hard pass/fail** — no skipped-as-green,
  no retry-until-pass. A flaky test is quarantined openly, never silently
- All severity-1/2 defects closed or formally deferred with product sign-off
- Cross-layer parity checks pass for data-critical features
- Exploratory charters for the release's riskiest changes are complete and reported
- Rollback path confirmed for data-affecting changes

## The go / no-go conversation

- Risks are stated in business language: which journey, which users, what
  happens if it fails — never as raw defect counts.
- If I recommend **hold**, I bring: the specific failing evidence, the
  blast radius, what fixes it, and the fastest re-verification plan.
- If leadership ships against my recommendation, the risk acceptance is
  documented by name and date. My job is a clear record and a clear
  recommendation, not a veto war.
- A **conditional ship** lists the accepted risks, the monitoring owner,
  and the rollback trigger — before deploy, not after the incident.

## Sign-off template

```text
Release: <version>   Date: <date>   QA Lead: <name>
Recommendation: SHIP / SHIP WITH RISKS / HOLD
Scope verified: <risk tiers, journeys, parity checks>
Evidence: <suite results, exploratory charters, defect status>
Accepted risks (if any): <risk — owner — rollback trigger>
Open defects deferred: <id — severity — product sign-off>
```
