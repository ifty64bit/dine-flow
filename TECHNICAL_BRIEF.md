# DineFlow — Technical Brief

> Architecture, data flow, and runtime behavior of the DineFlow platform.
> Last updated: 2026-04-21

---

## 1. High-Level Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Portal    │     │    Menu     │     │   Overlord  │     │     KDS     │
│  (Owners)   │     │ (Customers) │     │(Superadmin) │     │   (Staff)   │
│   :5000     │     │   :5001     │     │   static    │     │   /kitchen  │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │                   │
       └───────────────────┴───────────────────┴───────────────────┘
                               │
                    ┌──────────┴──────────┐
                    │   API (Hono v4)     │
                    │    :3000 / Worker   │
                    └──────────┬──────────┘
                               │
                    ┌──────────┴──────────┐
                    │   PostgreSQL 16     │
                    │   (Drizzle ORM)     │
                    └─────────────────────┘
```

**One API serves all frontends.** The portal, menu app, and KDS all talk to the same Hono instance. The API is designed to deploy on **Cloudflare Workers** (stateless, uses Web Crypto API, no in-memory stores).

---

## 2. Multi-Tenancy Model

Every piece of data is scoped to an **organization** (a restaurant group).

```
Organization
├── Branches (each branch has its own tables, staff, menu overrides)
├── Users (global login accounts)
├── Organization Members (links user → org → role → branch)
├── Table Classes (VIP, Regular, etc. with price multipliers)
├── Menu (categories, items, modifiers)
└── Orders, Sessions, Reservations
```

**Role hierarchy:** `owner (4) > admin (3) > manager (2) > staff (1)`

- **Owner** — created on registration. Full access.
- **Admin** — manage staff, menu, branches, settings.
- **Manager** — manage tables, orders, reservations.
- **Staff** — scoped to one branch. Kitchen/waiter views.

Staff have a `staffType`: `waiter`, `kitchen`, or `cashier`. On login, kitchen staff are routed directly to `/kitchen`.

---

## 3. The Core Ordering Flow (End-to-End)

### Step 1: Table Setup (Owner/Admin)

1. Owner logs into **Portal** → **Branches** page.
2. A "Main Branch" was auto-created on registration. They can add more.
3. Owner goes to **Tables** → creates tables, assigns them to a branch and a **table class**.
4. Owner clicks the QR icon on a table → generates a QR code URL (`http://menu.local/table/{id}`).
5. QR code is printed and placed on the physical table.

### Step 2: Customer Arrives (Menu App)

1. Customer scans QR code → opens **Menu App** at `/table/:tableId`.
2. Menu app calls `GET /api/v1/customer/table/:tableId` — gets org name, branch name, table number, table class, and currency.
3. Customer enters their name → taps "View Menu".
4. `POST /api/v1/customer/session/start` creates a **session**:
   - Marks table status as `occupied`.
   - Returns `sessionId`.
5. Menu app calls `GET /api/v1/customer/menu/:branchId?table=:tableId`.

### Step 3: Menu Resolution (The Brain)

`getMenuForTable()` in `@dineflow/db` is the single source of truth:

1. Resolves the table's class and its `priceMultiplier` (e.g. VIP = 1.2×).
2. Fetches active categories + items for the branch.
3. Applies `visibilityMode` filtering per table class:
   - `all` — shown to every class.
   - `include` — only shown to classes with an explicit include rule.
   - `exclude` — hidden from classes with an exclude rule.
4. Resolves final price:
   - `basePrice × priceMultiplier` (default).
   - OR per-item override from `menu_item_class_rules`.

### Step 4: Customer Places Order

1. Customer adds items to cart (with modifiers, quantities, special instructions).
2. Taps "Place Order" → `POST /api/v1/customer/orders`.
3. Backend:
   - Atomically increments order counter for the branch.
   - Calculates subtotal, tax (hardcoded 0 currently), service charge (hardcoded 0).
   - Inserts `orders` row + `order_items` rows.
   - Modifiers are snapshotted as JSONB on each order item.
   - **Broadcasts** `order:new` event to `kitchen:{branchId}` and `waiter:{branchId}` channels.

### Step 5: Kitchen Receives Order (KDS)

1. Kitchen staff is on `/kitchen` in the **Portal**.
2. Page loads active orders via `GET /api/v1/kitchen/:branchId`.
3. **Long-poll loop** continuously hits `GET /api/v1/events?channel=kitchen:{branchId}&after={timestamp}`:
   - Holds connection open for up to 25 seconds.
   - Returns immediately when a new event arrives.
   - Reconnects instantly after each response.
4. When `order:new` event arrives:
   - Visual alert banner pops up.
   - Query cache invalidates → orders list refreshes.
5. Kitchen advances orders through columns:
   - **Placed** → Confirm → **Confirmed** → Start Cooking → **Preparing** → Mark Ready → disappears from KDS.
6. Individual items can also be tracked: `queued` → `preparing` → `ready` → `served`.
7. When all items are ready, the order auto-promotes to `ready` status.

---

## 4. Real-Time Event System (No WebSockets)

Because the API deploys to **Cloudflare Workers** (no persistent connections), WebSockets aren't used. Instead:

```
┌─────────────┐        ┌─────────────┐        ┌─────────────┐
│   KDS UI    │◄──────►│  In-memory  │◄──────►│   API Route │
│  (long poll)│  HTTP  │ event queue │        │  (broadcast)│
└─────────────┘        └─────────────┘        └─────────────┘
                              ▲
                              │
                         order:create
                         broadcasts to
                         kitchen:1
```

**Channels:**

| Channel | Consumers | Events |
|---------|-----------|--------|
| `kitchen:{branchId}` | KDS | `order:new`, `order:status_update`, `item:status_update` |
| `waiter:{branchId}` | Waiter app | Same as kitchen + `table:status_change` |
| `session:{sessionId}` | Customer app | `order:new`, `order:status_update` |
| `admin` | Portal (menu) | `item:availability` |

**Limitation:** The in-memory event queue lives in a single Worker instance. If Cloudflare spins up multiple instances, events won't cross instances. For true multi-instance real-time, CF Durable Objects would be needed later.

---

## 5. Authentication & Session Model

**Stateless session tokens** (HMAC-SHA256 signed JWT-like tokens):

- Payload: `{ userId, exp }`
- Signed with `BETTER_AUTH_SECRET`
- Delivered via HTTP-only cookie + `Authorization: Bearer` header
- **Cannot be server-side revoked** — logout just clears the cookie/client storage

**Auth middleware** (`requireAuth`):

1. Extracts token from header or cookie.
2. Verifies HMAC signature.
3. Looks up user + latest organization membership.
4. Injects `user` object into Hono context.

**Role guard** (`roleGuard('manager')`):

- Uses `hasPermission(user.role, required)` from `@dineflow/shared`
- Owner > Admin > Manager > Staff hierarchy

---

## 6. Database & Key Queries

**Drizzle ORM** with relational queries.

### Menu Resolver (`getMenuForTable`)

The most complex query. Conceptually:

```sql
SELECT items.*, classes.price_multiplier, rules.price_override
FROM menu_items items
JOIN menu_categories cats ON items.categoryId = cats.id
LEFT JOIN table_classes classes ON classes.id = :tableClassId
LEFT JOIN menu_item_class_rules rules
  ON rules.menuItemId = items.id AND rules.tableClassId = :tableClassId
WHERE items.branchId = :branchId OR items.branchId IS NULL
  AND items.visibilityMode != 'exclude' (unless excluded)
```

### Order Counter (`getNextOrderNumber`)

Atomic increment per branch:

```sql
UPDATE order_counters
SET lastNumber = lastNumber + 1
WHERE branchId = :branchId
RETURNING lastNumber
```

---

## 7. Frontend Architecture

### Portal (`apps/portal`)

- **React 19** + **TanStack Router** (file-based routing)
- **TanStack Query** for server state
- **Zustand** for auth state (persisted to localStorage)
- **Hono RPC client** — fully typed API calls with zero boilerplate
- **Tailwind CSS v4** for styling

### Menu App (`apps/menu`)

- Same stack as portal.
- Uses plain `fetch` for customer routes (not in the typed Hono chain).
- Route: `/table/$tableId.tsx` — the entire customer experience.

### Overlord (`apps/overlord`)

- Platform admin panel for managing orgs, plans, subscriptions.
- Same stack as portal.

---

## 8. Deployment Target

| Layer | Target |
|-------|--------|
| API | **Cloudflare Workers** (`wrangler deploy`) |
| Portal | **Cloudflare Pages** (static SPA) |
| Menu | **Cloudflare Pages** (static SPA) |
| Overlord | **Cloudflare Pages** (static SPA) |
| Database | **Neon PostgreSQL** (via `@neondatabase/serverless`) |

**Why Workers?** Stateless, edge-deployed, cheap. The API uses Web Crypto API instead of Node.js `crypto`, and avoids any in-memory state (no Map-based session stores).

---

## 9. Known Architectural Gaps

1. **No org scoping on list endpoints** — `GET /admin/tables`, `GET /admin/branches`, etc. return global data. Multi-tenancy relies on frontends filtering, which is a security risk.
2. **Tax & service charge hardcoded to 0** — should read from `organizations` table (`taxRate`, `serviceChargeRate`).
3. **Settings API is in-memory only** — not persisted to DB.
4. **No tests** — zero test coverage.
5. **Seed script is broken** — references phantom tables (`settings`, `floors`).
6. **Event system is single-instance** — won't work across multiple Worker instances in production under load.

---

## 10. File-to-Feature Map

| Feature | Key Files |
|---------|-----------|
| Auth & Registration | `apps/api/src/routes/auth.ts` |
| Menu Resolver | `packages/db/src/queries/menu-resolver.ts` |
| Customer Ordering | `apps/menu/src/routes/table.$tableId.tsx` |
| Kitchen Display | `apps/portal/src/routes/_auth/kitchen/index.tsx` |
| Table Management | `apps/portal/src/routes/_auth/tables/index.tsx` |
| Branch Management | `apps/portal/src/routes/_auth/branches/index.tsx` |
| Menu Management | `apps/portal/src/routes/_auth/menu/index.tsx` |
| Staff Management | `apps/portal/src/routes/_auth/staff/index.tsx` |
| Real-time Events | `apps/api/src/routes/events.ts`, `apps/api/src/ws/index.ts` |
| Order Creation | `apps/api/src/routes/customer/orders.ts` |
| Kitchen API | `apps/api/src/routes/kitchen/orders.ts` |
