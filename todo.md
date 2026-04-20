# DineFlow — Sprint Roadmap

Legend: ✅ Done · 🔧 Partial · ⏳ Pending · ❌ Not started

---

## Sprint 1 — Foundation & Auth
**Goal:** Monorepo scaffold, database, multi-tenant registration, role-based auth

- ✅ Monorepo setup (Bun workspaces + Turborepo)
- ✅ Docker Compose for local Postgres + Redis
- ✅ Drizzle ORM schema — organizations, users, branches, members
- ✅ Subscription plans + subscriptions schema
- ✅ `POST /auth/register` — create org + owner + 30-day trial in one transaction
- ✅ `POST /auth/login` — bcrypt password check, session token (HMAC-SHA256 stateless)
- ✅ `POST /auth/logout` — cookie deletion
- ✅ `GET /auth/me` — return current user
- ✅ `requireAuth` middleware — Bearer token + cookie support
- ✅ `roleGuard` middleware — owner / admin / manager / staff hierarchy
- ✅ Portal login page
- ✅ Portal register page (org name, name, email, password strength indicator, 30-day trial badge)
- ✅ Zustand auth store (localStorage-persisted token)
- ✅ Hono RPC typed client for portal
- ✅ CF Workers compatible auth (Web Crypto API, no in-memory Map)

---

## Sprint 2 — Menu Management
**Goal:** Full menu CRUD — categories, items, modifiers, table-class pricing

- ✅ DB schema — menu_categories, menu_items, menu_item_class_rules
- ✅ DB schema — modifier_groups, modifiers, menu_item_modifier_groups
- ✅ DB schema — table_classes
- ✅ `GET/POST /api/v1/admin/menu/categories`
- ✅ `PUT/DELETE /api/v1/admin/menu/categories/:id`
- ✅ `GET/POST /api/v1/admin/menu/items`
- ✅ `GET/PUT/DELETE /api/v1/admin/menu/items/:id`
- ✅ `GET/POST/DELETE /api/v1/admin/menu/items/:id/class-rules`
- ✅ `GET/POST/PUT/DELETE /api/v1/admin/menu/modifier-groups`
- ✅ `POST/PUT/DELETE /api/v1/admin/menu/modifiers`
- ✅ `POST/DELETE /api/v1/admin/menu/items/:id/modifier-groups/:groupId`
- ✅ Menu resolver — `getMenuForTable()` (visibility mode filtering, price multiplier, per-item overrides)
- ✅ Portal menu page — category accordion, item cards, availability toggle, full CRUD modals
- ⏳ Portal menu page — modifier group management UI (create/edit/delete modifier groups inline)
- ⏳ Portal menu page — table class pricing rules UI (set per-item price overrides per class)
- ⏳ Menu item image upload (currently imageUrl is a free-text field, no upload)

---

## Sprint 3 — Tables, QR & Branches
**Goal:** Branch and table management, QR code generation, table classes

- ✅ DB schema — branches, tables, table_classes
- ✅ `GET/POST/PUT/DELETE /api/v1/admin/branches`
- ✅ Registration auto-creates "Main Branch" and assigns owner to it
- ✅ `GET/POST/PUT/DELETE /api/v1/admin/tables`
- ✅ `PUT /api/v1/admin/tables/:id/status` — mark occupied/vacant/reserved/inactive
- ✅ `GET/POST/PUT/DELETE /api/v1/admin/tables/classes`
- ✅ `POST /api/v1/admin/qr/generate/:tableId` — generate QR URL via qrserver.com
- ✅ Portal tables page — full CRUD, status controls, QR generation & display
- ⏳ Portal tables page — floor plan / drag-and-drop table layout editor (positionX/positionY columns exist in schema)
- ✅ Portal branches page — full CRUD for branches
- ⏳ QR code bulk download (generate ZIP of all table QRs for a branch)

---

## Sprint 4 — Customer Ordering Flow
**Goal:** End-to-end QR scan → browse menu → place order

- ✅ `GET /api/v1/customer/table/:tableId` — table context (org, branch, currency, class)
- ✅ `POST /api/v1/customer/session/start` — create session, mark table occupied
- ✅ `GET /api/v1/customer/session/:id`
- ✅ `GET /api/v1/customer/menu/:branchId` — resolved menu with class pricing
- ✅ `GET /api/v1/customer/menu/:branchId/items/:id` — item detail with modifiers
- ✅ `POST /api/v1/customer/orders` — create order, calculate price, save modifiers
- ✅ `GET /api/v1/customer/orders/session/:sessionId`
- ✅ Menu app scaffold (React 19, TanStack Router, Tailwind v4, port 5001)
- ✅ Menu app — welcome screen (enter name → view menu)
- ✅ Menu app — category tabs + item cards with price display
- ✅ Menu app — item modal with modifier group selection, qty control, special instructions
- ✅ Menu app — cart drawer with qty adjustment, subtotal, place order button
- ✅ Menu app — order confirmation screen
- ⏳ Menu app — real-time order status updates via long polling (`/api/v1/events`)
- ⏳ Menu app — waiter call button (request water / napkins / bill)
- ⏳ Menu app — view past orders in current session
- ⏳ Menu app — dietary tag filter / allergen display
- ⏳ Menu app — multi-language support

---

## Sprint 5 — Kitchen Display System (KDS)
**Goal:** Kitchen staff see and manage incoming orders in real time

- ✅ DB schema — orders, order_items, order_counters
- ✅ `GET /api/v1/kitchen/:branchId` — active orders grouped by status
- ✅ `PUT /api/v1/kitchen/items/:orderItemId/status` — update item status, auto-promote order
- ✅ `PUT /api/v1/kitchen/orders/:orderId/status`
- ✅ `PUT /api/v1/kitchen/menu/:menuItemId/availability` — 86 an item
- ✅ Long-poll event store — `broadcast()` + `waitForEvent()`
- ✅ `GET /api/v1/events?channel=kitchen:1&after=0` — long-poll endpoint
- ✅ Kitchen display UI — portal `/kitchen` page with long-poll events, order & item status controls
- 🔧 Auto-sound/notification on new order arrival in KDS — visual banner alert implemented, sound not wired
- ⏳ Station-based filtering (grill / fryer / salad / drinks / dessert)

---

## Sprint 6 — Waiter App
**Goal:** Waiter dashboard — table overview, order creation, status monitoring

- ✅ `GET /api/v1/waiter/tables/:branchId` — tables with active sessions + recent orders
- ✅ `POST /api/v1/waiter/orders` — create order on behalf of customer (with waiterId)
- ⏳ Waiter frontend UI (portal sub-view or separate app)
  - Table grid with session status
  - One-tap order creation for a table
  - Order list with status badges
  - Mark orders as delivered
- ⏳ `GET /api/v1/waiter/calls` — list pending waiter call requests
- ⏳ `PATCH /api/v1/waiter/calls/:id` — acknowledge a call
- ⏳ Long-poll integration for real-time table/order updates

---

## Sprint 7 — Staff Management & Settings
**Goal:** Invite and manage staff, per-org configuration

- ✅ `GET/POST/GET/PUT/DELETE /api/v1/admin/staff` — full CRUD with role + branch assignment
- ✅ Portal staff page — list with role badges, search
- ⏳ Portal staff page — invite via email (currently creates account directly with a temporary password)
- ⏳ Staff onboarding email (send credentials on account creation)
- ⏳ `GET/PUT /api/v1/admin/settings` — organization settings
- ⏳ Assign staff to branches (dropdown in staff form)
- 🔧 Settings route — currently in-memory store, not persisted to DB
  - Tax rate, service charge rate, tax-inclusive flag should be stored in `organizations` table (columns already exist: `taxRate`, `serviceChargeRate`, `taxInclusive`)
  - Currency, timezone also exist in the schema and should be editable here
- ⏳ Portal settings page — UI for org-level config (tax, currency, timezone, logo upload)
- ⏳ Portal dashboard — connect stat cards to live data (currently showing "—" placeholders)
  - Total menu items, active tables, live orders, staff count

---

## Sprint 8 — Reservations
**Goal:** Advance table booking with time slots

- ✅ DB schema — reservations (customerName, phone, partySize, date, timeSlot, durationMin, status, specialRequests)
- ✅ `GET /api/v1/admin/reservations` — list with branchId + date filters
- ✅ `POST /api/v1/admin/reservations`
- ✅ `GET/PUT/PATCH/DELETE /api/v1/admin/reservations/:id`
- ⏳ Portal reservations page — calendar/list view, create/edit modal, status management
- ⏳ Customer-facing reservation form (public, no auth)
- ⏳ Block table when reservation is active (auto-set table status to `reserved`)
- ⏳ SMS / email reminder to customer before reservation time

---

## Sprint 9 — Payments
**Goal:** Record payment against a session; support multiple methods

- ✅ DB schema — payments table (sessionId, method, gatewayRef, amount, tipAmount, status, paidAt)
- ✅ DB enums — `paymentMethod` (cash / card / bkash / nagad / wallet / complimentary)
- ✅ DB enums — `paymentStatus` (pending / completed / failed / refunded)
- ❌ `POST /api/v1/customer/orders/pay` or `POST /api/v1/waiter/payments`
- ❌ `GET /api/v1/admin/payments` — payment history
- ❌ Tax + service charge wired to org settings (currently hardcoded to 0 in orders route)
- ❌ Session close flow — calculate total, record payment, mark session ended, free table
- ❌ bKash / Nagad gateway integration
- ❌ Payment UI in customer app (request bill → pay)
- ❌ Receipt / bill view (subtotal, tax, service charge, tip, total)

---

## Sprint 10 — Waiter Calls & Feedback
**Goal:** In-session customer communication and post-meal feedback

- ✅ DB schema — waiter_calls (sessionId, reason, status, acknowledgedAt)
- ✅ DB schema — feedback (sessionId, rating 1-5, comment)
- ❌ `POST /api/v1/customer/calls` — customer presses call button
- ❌ `GET/PATCH /api/v1/waiter/calls` — list + acknowledge calls
- ❌ Call button UI in menu app (water / napkins / bill / other)
- ❌ Real-time call alert in waiter UI via long poll
- ❌ `POST /api/v1/customer/feedback` — submit rating + comment after session ends
- ❌ Feedback summary in portal (avg rating per branch)

---

## Sprint 11 — Analytics
**Goal:** Revenue and operational insights for restaurant owners

- ❌ DB schema — no dedicated analytics tables (use existing orders/order_items)
- ❌ `GET /api/v1/admin/analytics/revenue` — by day/week/month/year
- ❌ `GET /api/v1/admin/analytics/items` — top selling items
- ❌ `GET /api/v1/admin/analytics/peak-hours` — orders by hour of day
- ❌ `GET /api/v1/admin/analytics/tables` — revenue and turnover per table
- ❌ Portal analytics page — charts (revenue trend, top items, peak hours heatmap)

---

## Sprint 12 — Audit Log
**Goal:** Full change history for compliance and debugging

- ✅ DB schema — audit_logs (organizationId, branchId, userId, action, entityType, entityId, oldValue, newValue)
- ❌ Audit log middleware — auto-log on create/update/delete in admin routes
- ❌ `GET /api/v1/admin/audit` — paginated log with filters (user, entity, date range)
- ❌ Portal audit log page

---

## Sprint 13 — Public Landing Page
**Goal:** SEO-friendly restaurant page for each organization

- ❌ New app `apps/landing` (TanStack Start SSR or Astro)
- ❌ Route: `/:orgSlug` — restaurant landing with logo, about, social links
- ❌ Route: `/:orgSlug/menu` — public menu preview (no ordering, no session required)
- ❌ Route: `/:orgSlug/reserve` — advance reservation form
- ❌ SEO meta tags, Open Graph, structured data (JSON-LD Restaurant schema)

---

## Sprint 14 — Production Hardening
**Goal:** Security, observability, performance before public launch

- ✅ CF Workers deployment (`wrangler deploy`)
- ✅ CF Pages deployment for portal, menu, overlord
- ✅ `_redirects` file for SPA routing on CF Pages
- ✅ `VITE_API_URL` env var support in all frontends
- ⏳ Rate limiting on auth routes (prevent brute-force login)
- ⏳ Input sanitization audit (XSS, SQL injection review)
- ⏳ `BETTER_AUTH_SECRET` rotation strategy
- ⏳ Structured logging (replace `console.error` with a log library)
- ⏳ Health check endpoint improvements (DB connectivity check)
- ⏳ Error tracking integration (Sentry or similar)
- ⏳ Long-poll upgrade path — CF Durable Objects for multi-instance WS support
- ❌ End-to-end tests (Playwright) for critical paths (register → order → kitchen)
- ❌ Load testing (ordering flow under concurrent sessions)
- ❌ Inventory / stock tracking (schema + API + UI)
- ❌ Loyalty points system (schema + API + UI)
- ❌ Split bill (schema + API + UI)
- ❌ Thermal receipt printing integration

---

## Immediate Next Steps (suggested priority)

1. **Fix settings persistence** — wire `GET/PUT /api/v1/admin/settings` to the `organizations` table instead of in-memory store
2. **Portal dashboard live data** — connect stat cards to real counts (menu items, tables, orders, staff)
3. ~~**Kitchen display UI**~~ ✅ Done
4. ~~**Portal branches UI**~~ ✅ Done
5. ~~**Portal table management UI**~~ ✅ Done
6. **Waiter UI** — waiter API is complete; frontend is missing
7. **Modifier group UI in menu** — API is complete; portal UI doesn't expose modifier CRUD yet
8. **Staff add/edit UI** — API is complete; portal is read-only list only
