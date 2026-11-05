# Automation Strategy & ROI

Automation is an investment portfolio. I manage it like one: buy coverage
where return is highest, maintain what we own, and sell (delete) what no
longer pays.

## Automate when — the decision rule

Automate a check when **all** of these hold:

1. The behavior is stable or stabilizing (automating a moving target buys maintenance, not safety)
2. The failure cost is high or the path is exercised every release
3. The check is deterministic enough to trust — a test the team ignores is worse than no test
4. The data it needs can be created or found reliably

Keep manual/exploratory when: the area is new and we are still learning
what "correct" looks like, the value is in human judgment (usability,
layout sense), or it runs once.

## Where the return showed up in my work

The clearest example: a recurring release-validation process that consumed
**4 people for ~2 weeks** per release, mostly manual data checking. We
rebuilt it as automated UI/API/SQL validation — same business assertions,
run by the pipeline. Release validation dropped to **~3 days (92%)**, and
the people moved to exploratory and risk work the automation couldn't do.
ROI arguments I make to leadership are always in this currency: cycle
time and risk covered, never test counts.

## Portfolio hygiene

- **Flaky discipline:** flaky rate is a headline metric (see Metrics).
  Quarantine openly with an owner and a date; fix or delete within the
  sprint cycle. Retries exist to *detect* flakiness, never to hide it.
- **Layer economics:** push checks to the cheapest layer that can verify
  them — API/schema before browser. Browser tests are the most expensive
  asset class and are reserved for real journeys.
- **Parity where it pays:** cross-layer checks are costly to build, so
  they guard only data-critical flows — where a silent UI/API/DB
  disagreement is a business defect, not a cosmetic one.
- **Deletion is maintenance.** Obsolete tests are reviewed in regression
  planning and removed. A suite nobody dares to clean eventually verifies
  a product that no longer exists.
- **CI gates follow trust:** a suite gates merges/releases only while its
  signal is trusted. The moment a gate is routinely bypassed, the correct
  management action is fixing the signal, not enforcing the gate harder.
