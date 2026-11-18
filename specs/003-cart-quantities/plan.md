# Implementation Plan: Cart Quantities for the Demo Store

**Branch**: `003-cart-quantities` | **Date**: 2026-11-17 | **Spec**: [spec.md](./spec.md)

## Summary

Make the session cart quantity-aware: `Session.cart` changes from
`string[]` (one slug per unit, duplicates possible) to
`{ slug, qty }[]` (one row per product). `/cart/add` increments,
a new `POST /cart/set-qty` validates and sets (0 removes), the cart
page gains a per-row quantity field + update button + line total,
the badge counts units, and checkout carries quantities into the
order it already knows how to store. No schema change, no orders-API
change, no new dependencies.

## Technical Context

**Language/Version**: TypeScript (strict), Node 20+, Playwright test runner
**Primary Dependencies**: existing only
**Storage**: session state only for the cart; orders unchanged in SQLite
**Testing**: Playwright, `same-system` project (serial, in-process store, reset per test, own DB file per spec file — the 001 lesson)
**Target Platform**: local + GitHub Actions CI, same as the existing suite
**Project Type**: test framework with a bundled demo system under test
**Constraints**: invalid input never mutates the cart (validate fully, then apply); money stays integer-cents via the existing order path

## Constitution Check

*GATE: must pass before implementation; re-checked after.*

- **I. Layered architecture** — new selectors in
  `tests/drivers/index.ts` (row-by-slug, quantity field, update
  button, line total); a `setCartQuantity` helper in
  `tests/tasks/store.ts` (tasks layer, next to the other store
  helpers); assertions stay in the new spec. ✔
- **II. Hard assertions only** — quantities and totals asserted
  exactly, including the 400-and-unchanged cases. ✔
- **III. Cross-layer parity** — the main test follows quantities from
  cart page → checkout overview → placed order in API and database.
  ✔
- **IV. Determinism** — same pattern as 001/002: in-process store,
  reset per test, serial mode, own `STORE_DB_FILE`
  (`store-cart-quantities.db`). ✔
- **V. Config fails fast** — no new configuration. ✔
- **VI. Session auth** — the cart endpoints sit behind the store's
  existing session gate, like every other cart/checkout route. ✔
- **Style gates** — spec titles carry `@smoke`/`@regression`; strict
  typecheck must pass; FR-007 requires the existing 36 tests to pass
  unchanged. ✔

No violations and no exceptions.

## Project Structure

### Documentation (this feature)

```text
specs/003-cart-quantities/
├── spec.md
├── plan.md
└── tasks.md
```

### Source Code (repository root)

```text
tests/
├── drivers/index.ts            # + cart row-by-slug, qty field, update button, line total selectors
├── tasks/store.ts              # + setCartQuantity(page, slug, qty) via page.request (shares the session cookie)
├── sut/store-server.ts         # cart model {slug, qty}[], /cart/set-qty, cart page + badge + overview updates
└── same-system/
    └── cart-quantities.spec.ts # new spec: scenarios from spec.md
README.md                       # Spec Kit section names all three features
```

**Structure Decision**: the cart model change is contained in
`store-server.ts` — the only places that touch `session.cart` are
the inventory badge, the cart page, `/cart/add`, and
`/checkout/place`, all in that file. `/cart/set-qty` validates the
whole request (slug known, item in cart, qty a whole number 0–99)
before mutating anything, so a rejected request provably leaves the
cart untouched (FR-003). The invalid-input test drives the endpoint
through `page.request`, which shares the signed-in browser session —
no test-only back door is added to the store.

## Contracts

- `POST /cart/add` `{ slug }` (existing route, new behavior): first
  add creates the row at qty 1; adding again increments to 2, 3, …
  (still capped by FR-003's maximum when set explicitly; repeated
  adds stop incrementing at 99).
- `POST /cart/set-qty` `{ slug, qty }` (session required):
  - qty a whole number 0–99 and slug in cart → `200 { ok: true }`;
    qty 0 removes the row.
  - qty out of range / non-integer / non-numeric, or slug not in
    cart → `400 { error }`, cart unchanged.
- Cart page rows: `<div class="cart_item" data-test="cart-item"
  data-slug="<slug>">` containing the name, `<input
  data-test="cart-qty" type="number" min="0" max="99">`, a
  `<button data-test="update-qty">Update</button>` that posts the
  field's value, and `[data-test="cart-line-total"]` with
  `$<qty × unit price>`.
- Badge: `.shopping_cart_badge` shows the sum of quantities.
- Checkout overview lines show `<name> x<qty>` and the line total;
  subtotal/tax/total elements are unchanged in shape.

## Complexity Tracking

No constitution exceptions. One scoped decision: repeated adds cap
at 99 silently (the add button simply stops increasing the count)
rather than erroring — the add path is a shopper clicking a button,
not an API contract; the strict 400 behavior applies to the explicit
set-quantity endpoint, where the caller supplied a number that can
be judged.
