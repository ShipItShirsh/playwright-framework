# Production Escape Playbook

An escaped defect is tuition the business already paid. My job is to make
sure we learn the lesson once, systemically — and that the process ends
with a stronger system, not a blamed engineer.

## The 5 steps I run

1. **Contain & record.** Severity, affected journeys/users, detection
   path (customer? monitoring? luck?). Facts first, while they're fresh.
2. **Classify the root cause honestly.** One of: missed test case,
   data-variant gap, environment gap, requirement ambiguity, release
   process gap. "Human error" is not a class — it's where analysis stops
   too early.
3. **Fix the system, not just the bug.** Each class has a standing remedy:
   missed case → add to the risk-tier regression set; data variant →
   variant joins test data *and* entry criteria; ambiguity → acceptance
   criteria review changes; environment → parity check between envs.
4. **Add the regression where it will actually run.** A test added to a
   suite that doesn't gate anything is a memorial, not a control.
5. **Close the loop in metrics.** The escape is tagged by class in the
   escaped-defect metric, so the next quarter's strategy visibly targets
   the classes that actually hurt us.

## A real example (anonymized, from my own team)

**Escape:** a data-validation defect reached production on an edge-case
*layout variant* of a document/data view our regression data didn't
include. The standard layouts were thoroughly covered — and all passing,
which made the miss invisible until production data exercised the variant.

**Classification:** data-variant gap, not a missed assertion.

**System fix:**
- Production layout variants were added to the automated Playwright/SQL
  regression pack, so parity checks run against the variants real data uses
- Edge-case data coverage became an explicit **entry criterion** for
  release sign-off (see Release Gates) — a release cannot start testing
  on happy-path data alone anymore

**What changed in my management:** I stopped accepting "the tests passed"
as a complete statement. The question since then is always *"passed
against which data, which variants, which scope?"* — the same alignment
discipline built into this repository's parity checks.
