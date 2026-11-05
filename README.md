# Playwright Portfolio Framework — TypeScript

A clean-room, runnable portfolio framework by **Shirsh Malviya** — Senior QA / SDET.
It demonstrates the architecture and patterns I use in enterprise test automation,
rebuilt from scratch against public demo applications so anyone can clone and run it.
No employer code, data, or credentials are included.

![Playwright Tests](https://github.com/ShipItShirsh/playwright-framework/actions/workflows/playwright.yml/badge.svg)

## Why I built this framework

Most Playwright portfolios on GitHub test SauceDemo for the UI and
JSONPlaceholder for the API. That is fine for showing the basics, but
those are two different applications. In my real work, I test one
application, and I need to check that the UI, the API, and the database
all show the same data. Two different demo sites cannot show that.

So I did it in two steps. First, the normal projects — SauceDemo and
JSONPlaceholder — to show the basics: how the framework is organized,
login once and reuse the session, config checks, and strict pass/fail
rules. Then I built a small store application inside this repo. It has
a UI, an API, and a SQLite database, all in one place. The same-system
tests place an order in the UI and then check the same order in the
API, in the database, and in the Excel export. Same order, same
prices, everywhere.

I also added a small flaky-test reporter. It keeps the history of past
runs, marks the tests that pass only on retry, and makes a quarantine
list. This is a real problem in every team — if a suite fails randomly,
people stop trusting it.

So the idea is simple: basics first, then all the layers of one
application checked together, then a way to keep the suite trustworthy.

## What this demonstrates

- **Three test layers in one config** — API, UI (Chromium), and **cross-layer parity** checks that prove the UI, the data layer, and an xlsx export agree with each other
- **Layered design, not page-object sprawl** — `spec assertions → tasks → drivers → browser`. Selectors live in one drivers file, reusable actions in tasks, specs own assertions
- **Storage-state auth lifecycle** — a setup project logs in once through the real UI and every other project reuses the saved state (the public stand-in for an enterprise SSO lifecycle: saved state + freshness + coordinated refresh, kept separate from data-layer auth)
- **Validated configuration** — Zod schema + dotenv per environment (`ENV=qa` default); a run fails fast on bad config instead of mid-test
- **Hard pass/fail assertion policy** — no `test.skip()` as a substitute for missing data, no soft-passes. Missing endpoints/data fail clearly; expected errors (e.g. a 404) must be declared explicitly
- **Data & export parity helpers** — a versioned catalog acts as the data-layer source of truth; an xlsx helper builds an order export and reads it back to compare totals with the checkout UI
- **Same-system parity** — a small demo store bundled as the system under test (`tests/sut/`) serves a UI, a REST API, and a SQLite database from one application, so the `same-system` project proves UI ↔ API ↔ SQL ↔ export agreement on the *same* data — the enterprise parity pattern, with no external dependency
- **Flaky-test reporter** — every run emits a JSON result; `scripts/flaky-report.ts` ingests runs into a local history and scores each test (clean pass / flaky retry-pass / fail), producing a stability report with a **quarantine list** under explicit, documented criteria — the release-gate hygiene a lead is expected to run
- **Reporting & CI** — built-in Playwright HTML report + a small custom application reporter (`playwright-report/app-report.html` / `.json`), traces/screenshots/video on failure, and a GitHub Actions workflow that typechecks and runs the full suite on every push

## Targets (public demo apps, no secrets)

| Layer | Target |
|---|---|
| UI | [saucedemo.com](https://www.saucedemo.com) — demo credentials are published on its login page |
| API | [jsonplaceholder.typicode.com](https://jsonplaceholder.typicode.com) |
| Data layer | Versioned catalog fixture (`tests/data/catalog.json`) |
| Same-system SUT | Bundled demo store (`tests/sut/store-server.ts`) — UI + REST API + SQLite, seeded from the catalog fixture, started in-process by its specs |

## Run it (under 3 minutes)

```bash
npm install
npm run install:browsers
npm test            # full suite: setup + api + ui + cross-layer + same-system
```

Useful subsets:

```bash
npm run test:smoke        # @smoke only
npm run test:regression   # @regression only
npm run test:api          # API project only
npm run test:ui           # UI project only
npm run test:cross        # cross-layer parity only
npm run test:same-system  # same-system parity only (UI <-> API <-> SQL <-> export, one app)
npm run test:unit         # unit tests (flaky aggregation rules; no browser)

# Flaky-test reporting: after any run, ingest its results, then report
npm run report:flaky -- --ingest test-results/results.json
npm run report:flaky      # writes playwright-report/flaky-report.md (+ .json)
npm run test:ui:headed    # watch the UI tests run
npm run typecheck         # strict TypeScript check
npm run report:open       # open the Playwright HTML report
```

Tags: `@smoke` / `@regression` on every spec title, selected with `--grep`.

## Layout

```text
config/env.ts                  Zod-validated, per-environment config
playwright.config.ts           api / ui / cross-layer projects + setup project
tests/
  auth/setup.ts                Login once -> saved storage state
  drivers/index.ts             Selectors and routes ONLY
  tasks/index.ts               Reusable UI actions
  tasks/api.ts                 HTTP wrappers (hard-fail on unexpected 404)
  tasks/test-data.ts           Data-layer lookups (catalog)
  tasks/xlsx-parity.ts         Export build + read-back comparison
  tasks/store.ts               SQL reads + export parsing for the same-system store
  sut/store-server.ts          Demo store SUT: UI + API + SQLite in one app
  api/  ui/  cross-layer/      Specs by layer
  same-system/                 Parity specs against the bundled store
scripts/app-reporter.ts        Custom summary reporter
scripts/flaky-report.ts        Flaky history ingest + stability report CLI
scripts/flaky/aggregate.ts     Pure aggregation/scoring engine (unit-tested)
tests/unit/                    Browser-free unit specs
.github/workflows/             CI: typecheck + full run + report artifact
docs/ARCHITECTURE.md           Design decisions and tradeoffs
```

## Design decisions worth asking me about

1. **Why parity testing?** A page can render and an API can return 200 while they quietly disagree. Comparing the same business facts across layers — after aligning scope, filters, and rounding — catches the bugs single-layer tests miss.
2. **Why drivers/tasks instead of classic POM?** Page objects tend to accumulate business logic and duplicate selectors. Separating raw selectors (drivers) from actions (tasks) keeps the change surface small when the UI moves.
3. **Why hard pass/fail?** A skipped test looks green. In a regression suite that protects a release, green must mean *verified* — or the test must fail loudly and say why.
4. **Why a setup project for auth?** Logging in inside every test is slow and flaky. Authenticating once and reusing storage state mirrors how enterprise SSO suites work and keeps credentials in exactly one place.
5. **Why bundle a system under test?** Public demo sites can't offer same-system parity — no public demo exposes its UI, API, and database together. The bundled store exists so the strongest checks in the suite (UI ↔ API ↔ SQL ↔ export on one dataset) run against a single system, deterministically, anywhere.
6. **Why a flaky reporter with a quarantine list?** A suite that cries wolf gets muted, and then it protects nothing. Tracking each test's history — clean pass vs retry-pass vs fail — turns "the build is flaky" grumbling into a scored list with explicit quarantine and re-admission rules, which is what a release gate needs to stay trusted.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the longer version.

## Author

Shirsh Malviya — QA Engineering Lead / Senior SDET, ~13 years in test automation
(Playwright/TypeScript and C#, Selenium, API + SQL validation, JMeter, CI/CD).
Healthcare and e-commerce domains. Based in Mt. Juliet, TN (Nashville metro).

## License

MIT — see [LICENSE](LICENSE).
