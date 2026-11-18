# Tasks: Cart Quantities for the Demo Store

**Input**: [spec.md](./spec.md), [plan.md](./plan.md)
**Prerequisites**: constitution (`.specify/memory/constitution.md`) — all gates pass, no exceptions recorded.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an unfinished task)
- **[Story]**: the user story from spec.md the task serves (US1/US2/US3)

## Phase 1: Foundational (store model + drivers/tasks)

- [ ] T001 In `tests/sut/store-server.ts`: change `Session.cart` to `{ slug, qty }[]`; `/cart/add` increments an existing row (cap 99); badge shows total quantity
- [ ] T002 [P] Add cart selectors to `tests/drivers/index.ts` (`cartItemRow(slug)`, `cartQty`, `updateQtyButton`, `cartLineTotal`) and `setCartQuantity()` to `tests/tasks/store.ts`

## Phase 2: User Story 1 - Adding the same product twice counts up (Priority: P1) 🎯 MVP

- [ ] T003 [US1] In `tests/sut/store-server.ts`: cart page renders one row per product with qty field, update button, and line total; checkout overview shows qty + line total; `/checkout/place` carries cart quantities into the order
- [ ] T004 [US1] Test in `tests/same-system/cart-quantities.spec.ts`: add the same product twice → one row at qty 2 → checkout → placed order in API and database carries qty 2 and doubled totals (@smoke @regression)

## Phase 3: User Story 2 - Set a quantity on the cart page (Priority: P2)

- [ ] T005 [US2] In `tests/sut/store-server.ts`: `POST /cart/set-qty` — validate fully (in cart, whole number 0–99), then apply; 0 removes the row
- [ ] T006 [US2] Test in `tests/same-system/cart-quantities.spec.ts`: set qty 3 on the cart page → line total and checkout totals follow; set another item to 0 → it is removed (@regression)

## Phase 4: User Story 3 - Invalid quantities are rejected (Priority: P3)

- [ ] T007 [US3] Test in `tests/same-system/cart-quantities.spec.ts`: qty 100 and qty −1 posted directly to `/cart/set-qty` each return 400 and the cart is unchanged (@regression)

## Phase 5: Polish

- [ ] T008 [P] README: Spec Kit section names 003 alongside 001 and 002
- [ ] T009 `npm run typecheck` clean; same-system + unit projects green locally; full suite green in CI after push

## Dependencies

- T003 needs T001's model. T004 needs T002 + T003. T006 needs T005. T007 needs T005. T009 is last.

## Notes

- Test count goes from 36 to 39 (3 new tests — US1, US2, US3; the badge count is asserted inside the US1 and US2 tests). This spec file sets its own `STORE_DB_FILE` (`store-cart-quantities.db`) per the 001 lesson on parallel workers.
- FR-007 is a real gate: the existing parity/history/detail specs add distinct products once each, so they must pass against the new cart model untouched.
