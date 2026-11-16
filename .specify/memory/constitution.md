# Playwright Framework Constitution

The non-negotiable rules for this repository. Every feature spec, plan,
and task list is checked against this document (see the Constitution
Check section of each plan). These rules describe how the framework
already works; Spec Kit features must fit them, not the other way
around.

## Core Principles

### I. Layered Architecture (drivers → tasks → tests)

Every test follows one direction: specs call tasks, tasks call drivers.

- **Drivers** hold selectors and routes only — no actions beyond raw
  interaction, no assertions, no business logic.
- **Tasks** perform business actions and return data. A task never
  decides pass or fail.
- **Specs** own every assertion. All pass/fail decisions live in the
  spec layer and nowhere else.

A change to the UI must be fixable in the drivers layer without
touching specs. A change to a business rule must be fixable in one
task.

### II. Hard Assertions Only

A check either passes or fails the test. Soft checks, warning-only
assertions, and "log and continue" verification are prohibited: a
suite that lets a broken build go green teaches the team to ignore it.
Expected failures (for example an expected 404) must be declared
explicitly and asserted as the expected outcome.

### III. Cross-Layer Parity Wherever Data Moves

When a feature creates or changes data that more than one layer can
see, the feature's tests must prove the layers agree: UI, REST API,
database (read directly, read-only), and any export of the same record.
Money is compared in integer cents or exact decimal values — never
with floating-point tolerance. A write rejected by the API must be
proven absent from the database.

### IV. Determinism and Isolation

Tests must produce the same result on a laptop and in CI. Suites that
share a mutable system use the system's reset hook and run serially
where shared state requires it, and say why in a comment. No test may
depend on another test's leftover state, on test order, or on an
external service the repository does not control, except the public
demo targets named in the README — and the core checks must not depend
on those.

### V. Configuration Fails Fast

All configuration is validated at startup against the Zod schema in
`config/env.ts`. A missing or invalid value stops the run immediately
with a clear message. New configuration goes through the schema, never
through ad-hoc environment reads scattered in specs. No secrets in the
repository; demo credentials are the public ones the demo sites
themselves publish.

### VI. Session-Based Authentication

UI suites log in once through the setup project and reuse the saved
storage state. Per-test UI logins are prohibited except in specs whose
subject is login itself. Systems under test that issue their own
session (the bundled demo store) are logged into per spec file, as the
existing same-system specs do.

## Technology and Style Constraints

- Playwright + TypeScript in strict mode; `npm run typecheck` must
  pass with no errors before any commit.
- Every spec title carries its tags (`@smoke` and/or `@regression`).
- Plain language in specs, docs, and commit messages — how working
  engineers write. No marketing phrasing.
- Test data comes from versioned fixtures in the repo, never from
  values copied out of a live system.
- The demo store (system under test) stays small and readable; it is a
  fixture, not a product. Features are added to it only when a spec
  needs them, and its data stays resettable via `/__test__/reset`.

## Quality Gates

- Typecheck clean, full suite green in CI — no feature merges on a red
  run.
- New tests for a feature are written from the feature's acceptance
  scenarios; each scenario maps to at least one test, and the mapping
  is visible in the spec file or the tasks list.
- Flaky behavior is data, not noise: retries exist so the flaky-test
  reporter can classify outcomes, never to hide a failure.

## Governance

This constitution supersedes ad-hoc practice in this repository.
Amendments are made by editing this file in its own commit, with the
reason stated in the commit message. Plans that need an exception must
record it in the plan's Complexity Tracking section with the simpler
alternative that was rejected and why.

**Version**: 1.0.0 | **Ratified**: 2026-11-16 | **Last Amended**: 2026-11-16
