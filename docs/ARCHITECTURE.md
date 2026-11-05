# Architecture — decisions and tradeoffs

This is the short design record for the portfolio framework. The patterns are
deliberately the ones I use at enterprise scale, reduced to a repo that runs
anywhere with no private infrastructure.

## Layers

| Project | What it proves | Speed |
|---|---|---|
| `api` | Contracts, status codes, schema (Zod), create/read behavior, explicit error cases | Seconds |
| `ui` | Real user journeys in Chromium: login, catalog, cart, checkout math | Tens of seconds |
| `cross-layer` | The layers **agree**: UI inventory vs data-layer catalog; xlsx export totals vs checkout UI totals | Tens of seconds |
| `setup` | One real login → storage state reused by UI/cross-layer | Once per run |

## Layering inside a test

```text
spec (assertions) -> tasks (actions) -> drivers (selectors/routes) -> browser
                  -> tasks/api.ts (HTTP wrappers + evidence attachments)
                  -> tasks/test-data.ts (data-layer lookups)
```

Rules:
- Drivers contain no logic. A UI redesign touches drivers first, ideally only drivers.
- Tasks contain no assertions about business outcomes. Specs decide what "correct" means.
- API wrappers attach request/response evidence to the report and hard-fail on an
  unexpected 404. An expected 404 is written `allow404: true` in the test — visible, not hidden.

## Assertion policy

Hard pass or hard fail. No conditional skips for missing data, no warning-and-return.
An empty-state test asserts the empty state itself. This keeps a green run meaningful
in CI — the property a release gate actually needs.

## Auth

One setup project performs a real login and saves Playwright storage state to
`.auth/qa.json` (git-ignored). Dependent projects start authenticated.
In an enterprise suite this slot holds the full SSO lifecycle — saved state,
token expiry checks, a silent refresh path, and a file lock so parallel workers
do not refresh over each other — and it stays separate from database auth,
which uses its own identity. The demo login here is the publishable stand-in.

## Data layer

`tests/data/catalog.json` is the source of truth for product names/prices, read
through `tasks/test-data.ts` — the same call shape as a SQL/API lookup helper.
Parity specs align scope first (same set, same rounding), then compare exactly.
A product present in the data layer but missing in the UI is a hard failure with
the product named in the message.

## Tradeoffs made on purpose

- **Public demo targets over realism:** the repo must run for a reviewer in
  minutes with zero secrets. The cost is no private DB — so SQL validation is
  represented by the data-layer pattern, and the README says so plainly.
- **Retries = 1 in CI only:** enough to surface flakiness without hiding it;
  traces/video are retained on failure for diagnosis.
- **One custom reporter, kept tiny:** it demonstrates the reporter API and
  produces a summary a non-Playwright reader can open. It is not a dashboard.
- **Strict TypeScript everywhere, including tests:** test code is production
  code for a quality team; `npm run typecheck` runs in CI before the tests.
