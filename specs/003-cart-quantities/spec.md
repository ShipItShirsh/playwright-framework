# Feature Specification: Cart Quantities for the Demo Store

**Feature Branch**: `003-cart-quantities`
**Created**: 2026-11-17
**Status**: Draft (clarified same day — see Clarifications)
**Input**: "A shopper should be able to buy more than one of an item: adding the same product twice counts up, and the cart page should let them set a quantity directly."

Builds on the existing cart/checkout flow and the orders work in
[001](../001-order-history/spec.md) / [002](../002-order-detail/spec.md):
orders already store quantities (the API accepts them); the cart is
the one place that still assumes one of everything.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Adding the same product twice counts up (Priority: P1)

A shopper who adds the same product twice sees one cart row with
quantity 2 — not two rows — and the checkout math prices both units.

**Why this priority**: This is the core behavior change; everything
else is editing the quantity the add flow creates.

**Independent Test**: Add the same product twice from the inventory
page, check the cart shows one row at quantity 2, complete checkout,
and confirm the placed order (API and database) carries qty 2 with
doubled totals.

**Acceptance Scenarios**:

1. **Given** an empty cart, **When** the shopper adds the same
   product twice, **Then** the cart page shows a single row for it
   with quantity 2 and a line total of 2 × unit price.
2. **Given** that cart, **When** the shopper completes checkout,
   **Then** the checkout overview and the placed order show qty 2
   and the doubled subtotal, tax, and total.

---

### User Story 2 - Set a quantity on the cart page (Priority: P2)

On the cart page, the shopper can change an item's quantity and see
the line total update; setting a quantity of 0 removes the item.

**Why this priority**: Adding repeatedly is a workaround; direct
editing is the actual cart behavior shoppers expect.

**Independent Test**: Add two different products, set the first
item's quantity to 3 on the cart page, check its line total, then
set the second item's quantity to 0 and check it is gone.

**Acceptance Scenarios**:

1. **Given** a cart with two products, **When** the shopper sets one
   item's quantity to 3 and updates, **Then** the cart shows qty 3
   and a line total of 3 × unit price, and checkout prices 3 units.
2. **Given** a cart item, **When** the shopper sets its quantity to
   0 and updates, **Then** the item is removed from the cart.

---

### User Story 3 - Invalid quantities are rejected (Priority: P3)

A quantity outside the allowed range (negative, above the maximum,
or not a whole number) is rejected with an error and the cart is
left unchanged — bad input never silently becomes an order.

**Why this priority**: The orders API already rejects bad input with
a 400 (see the parity suite); the cart endpoint must hold the same
line.

**Independent Test**: Post an out-of-range quantity for a cart item
directly to the cart endpoint and check for a 400 and an unchanged
cart.

**Acceptance Scenarios**:

1. **Given** a cart with one item at qty 1, **When** a quantity of
   100 (above the maximum) is submitted, **Then** the response is a
   400 error and the cart still shows qty 1.
2. **Given** the same cart, **When** a negative quantity is
   submitted, **Then** the response is a 400 error and the cart is
   unchanged.

---

### Edge Cases

- The cart badge shows the total quantity across items (two of one
  product reads "2"), not the number of distinct rows.
- Quantities set on the cart page survive navigation away and back
  (they live in the session cart, like the items themselves).
- Checkout with a quantity in the cart produces an order whose items
  and totals match the cart exactly — the orders API and database
  already store qty; no order-side change is needed.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Adding a product already in the cart MUST increment
  its quantity by 1 instead of adding a second row.
- **FR-002**: The cart page MUST show, per item: the quantity in an
  editable field, an update control, and the line total
  (qty × unit price).
- **FR-003**: Setting a quantity MUST accept whole numbers from 0 to
  99; 0 removes the item. Any other value (negative, above 99,
  non-integer, non-numeric) MUST be rejected with HTTP 400 and the
  cart MUST be left unchanged.
- **FR-004**: Setting a quantity for a product that is not in the
  cart MUST be rejected with HTTP 400.
- **FR-005**: The cart badge MUST show the total quantity of all
  items.
- **FR-006**: Checkout MUST carry the cart's quantities into the
  placed order, and the checkout overview MUST show each item's
  quantity and line total.
- **FR-007**: Existing single-quantity behavior MUST be unchanged:
  adding distinct products once each behaves exactly as before, and
  the pre-feature suite (36 tests) still passes.

### Key Entities

- **Cart item** (changed): previously just a product slug in a list;
  now a slug with a quantity (1–99). One row per product, ever.
- **Order** (unchanged): already stores per-item qty; the cart now
  finally feeds it real values from the UI path.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every acceptance scenario above is covered by an
  automated test in the same-system project, and the full suite
  passes in CI.
- **SC-002**: For a checked-out multi-quantity order, the cart page,
  checkout overview, single-order API, and database agree exactly on
  quantities and totals.
- **SC-003**: The pre-feature suite (36 tests) passes unchanged
  alongside the new tests (39 total).

## Clarifications

### Session 2026-11-17

- Q: What happens on adding a product already in the cart? → A: The
  quantity increments by 1; there is never a duplicate row.
- Q: Quantity bounds? → A: 0–99. 0 removes the item. Anything
  outside, or not a whole number, is a 400 with the cart unchanged.
- Q: Does the badge count rows or units? → A: Units — the total
  quantity, matching what checkout will charge for.
- Q: Does the orders API change? → A: No. It already accepts and
  stores quantities; this feature is cart-side only.
- Q: How is a quantity submitted? → A: A per-row quantity field and
  update button on the cart page, posting to a cart endpoint —
  consistent with the store's other form posts.

## Assumptions

- The cart remains session state (per signed-in user), as today; no
  persistence across sessions is introduced.
- Money math is unchanged: totals are computed from qty × unit price
  in integer cents, as the order path already does.
