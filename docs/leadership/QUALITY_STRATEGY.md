# Quality Strategy

## Principle

Quality is a risk decision, not a test count. My strategy work starts from
three questions, in this order:

1. **What breaks the business if it fails?** Revenue paths, patient/member
   safety and data integrity in healthcare, contractual obligations.
2. **What changes most often?** Change frequency × blast radius sets the
   regression surface — not feature count.
3. **Where has production already taught us a lesson?** Every escape feeds
   the strategy (see the Escape Playbook).

## How effort is allocated

- **Risk-based tiers.** Tier 1 (critical journeys, data integrity): automated
  at UI + API + data layers, runs block the release. Tier 2 (important,
  stable): automated regression, runs nightly/on merge. Tier 3 (volatile,
  cosmetic, one-off): exploratory/manual until the behavior settles.
- **Shift left, concretely.** QA in story refinement with acceptance criteria
  reviewed for testability; API contract checks before UI exists; test data
  planned with the story, not discovered during execution.
- **Layered verification.** Fast API/schema checks carry most of the volume;
  browser tests cover real user journeys only; cross-layer parity checks
  prove the layers agree on the same business facts — the class of bug
  single-layer testing structurally misses.
- **Environments and data are strategy, not logistics.** A team without
  trustworthy data has no strategy, only activity. Dedicated QA data,
  synthetic/de-identified records, and seeded fixtures are planned work with
  owners, not favors.

## What I present to leadership

A one-page quality position per release: scope by risk tier, what was
automated vs explored, open risks stated in business terms, and my
recommendation. Executives should never have to read a test report to learn
whether I think we can ship (see Release Gates and the sample report).

## Anti-patterns I actively remove

- Automating everything ("100% automation" is a cost, not a goal)
- Pass-rate theater — green dashboards built on skips and retries
- QA as a phase at the end instead of a property of the pipeline
- Metrics reported because they are easy to count (see Metrics)
