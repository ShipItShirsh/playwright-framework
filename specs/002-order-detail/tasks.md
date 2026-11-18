# Tasks: Order Detail for the Demo Store

**Input**: [spec.md](./spec.md), [plan.md](./plan.md)
**Prerequisites**: constitution (`.specify/memory/constitution.md`) — all gates pass, no exceptions recorded.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an unfinished task)
- **[Story]**: the user story from spec.md the task serves (US1/US2/US3)

## Phase 1: Foundational (store + drivers)

- [x] T001 [P] Add the `orderDetail` route builder and detail selectors (`orderDetailLink`, `orderDetail`, `orderLine`, `lineTotal`, `orderNotFound`) to `tests/drivers/index.ts`
- [x] T002 In `tests/sut/store-server.ts`: `orderDetailPage()` + the `/order.html` route — own order renders lines and totals; any other id (another customer's, nonexistent, malformed) returns the shared 404 "Order not found" page

## Phase 2: User Story 1 - Open one order and see its line items (Priority: P1) 🎯 MVP

- [x] T003 [US1] In `tests/sut/store-server.ts`: history rows link to the detail page (`data-test="order-detail-link"`)
- [x] T004 [US1] Test in `tests/same-system/order-detail.spec.ts`: UI checkout (two items) → history → detail shows lines and totals → single-order API, database, and xlsx export all agree exactly (@smoke @regression)
- [x] T005 [US1] Test in `tests/same-system/order-detail.spec.ts`: an API order with qty 2 of one product shows quantity and the doubled line total on its detail page (@regression)

## Phase 3: User Story 2 - Other people's orders stay private (Priority: P2)

- [x] T006 [US2] Test in `tests/same-system/order-detail.spec.ts`: another customer's order id returns 404 "Order not found" and none of its data (@regression)
- [x] T007 [US2] Test in `tests/same-system/order-detail.spec.ts`: a nonexistent order id returns the identical 404 response (@regression)

## Phase 4: User Story 3 - Signed-out access (Priority: P3)

- [x] T008 [US3] Test in `tests/same-system/order-detail.spec.ts`: opening a detail URL with no session redirects to the login page (@regression)

## Phase 5: Polish

- [x] T009 [P] README: Spec Kit section names 002 alongside 001
- [x] T010 `npm run typecheck` clean; same-system + unit projects green locally; full suite green in CI after push

## Dependencies

- T002 needs nothing but pairs with T001. T003 needs T002's page to link to. T004–T008 need T001–T003. T010 is last.

## Notes

- Test count goes from 31 to 36 (5 new tests). This spec file sets its own `STORE_DB_FILE` (`store-order-detail.db`) per the 001 lesson on parallel workers.
- The xlsx export endpoint already exists per order; the four-way parity test reuses `parseOrderExport` unchanged.
