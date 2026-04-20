# DineFlow — Implementation Status

> Generated: 2026-04-21  
> Purpose: Clear inventory of what is built, what is partial, and what is missing.

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ **Implemented** | Fully working with real logic |
| ⚠️ **Partial** | Exists but has gaps, stubs, or hardcoded values |
| ❌ **Missing** | Not built at all (may have schema or API, but no end-to-end feature) |
| 🗑️ **Dead Code** | Exists but is unused anywhere |

---

## 1. Database (`packages/db`)

| Table | Status | Notes |
|-------|--------|-------|
| `organizations` | ✅ Implemented | Heavily used across auth, admin, overlord |
| `subscription_plans` | ✅ Implemented | Used by auth (trial) and overlord (CRUD) |
| `subscriptions` | ✅ Implemented | Linked to orgs, managed by overlord |
| `overlord_admins` | ✅ Implemented | Overlord auth only |
| `branches` | ✅ Implemented | CRUD + relations |
| `users` | ✅ Implemented | Auth + staff management |
| `organization_members` | ✅ Implemented | RBAC linking table |
| `table_classes` | ✅ Implemented | Pricing rules + table grouping |
| `tables` | ✅ Implemented | Full CRUD + QR + status |
| `menu_categories` | ✅ Implemented | Menu grouping |
| `menu_items` | ✅ Implemented | Full menu CRUD |
| `menu_item_class_rules` | ✅ Implemented | Price overrides per table class |
| `modifier_groups` | ✅ Implemented | Full CRUD |
| `menu_item_modifier_groups` | ✅ Implemented | Junction table |
| `modifiers` | ✅ Implemented | Full CRUD |
| `sessions` | ✅ Implemented | Customer sessions + table occupancy |
| `order_counters` | ⚠️ Partial | Queried via raw SQL. **Seed is broken** (wrong PK column) |
| `orders` | ✅ Implemented | Full lifecycle |
| `order_items` | ✅ Implemented | With modifier JSONB snapshots |
| `reservations` | ✅ Implemented | DB + API complete, but **no frontend** |
| `payments` | ❌ Missing | Schema only. Marked `// FUTURE: not used in MVP` |
| `feedback` | ❌ Missing | Schema only. Future placeholder |
| `waiter_calls` | ❌ Missing | Schema only. Future placeholder |
| `audit_logs` | ❌ Missing | Schema only. Future placeholder |
| `settings` | ❌ Missing | **Phantom** — imported in seed but table doesn't exist. Admin route uses in-memory object instead |
| `floors` | ❌ Missing | **Phantom** — imported in seed but table doesn't exist. `floor_name` denormalized on `tables` instead |

### Schema Issues Found
- `seed.ts` imports `settings` and `floors` which don't exist → **will crash at runtime**
- `seed.ts` inserts `role`, `branchId`, `staffType` into `users` table, but those columns belong to `organization_members`
- `orderCounters` seed uses `id: 1` but PK is `branchId`

---

## 2. API (`apps/api`)

### Auth
| Endpoint | Status | Notes |
|----------|--------|-------|
| `POST /auth/register` | ✅ Implemented | Creates org + **Main Branch** + user + membership + trial sub |
| `POST /auth/login` | ✅ Implemented | Bcrypt + cookie |
| `POST /auth/logout` | ✅ Implemented | Clears cookie (stateless tokens can't be revoked server-side) |
| `GET /auth/me` | ✅ Implemented | Returns current user |

### Customer (Public)
| Endpoint | Status | Notes |
|----------|--------|-------|
| `GET /api/v1/customer/table/:tableId` | ✅ Implemented | Table + branch + org info |
| `POST /api/v1/customer/session/start` | ✅ Implemented | Creates session, marks table occupied |
| `GET /api/v1/customer/session/:id` | ✅ Implemented | Session detail |
| `GET /api/v1/customer/menu/:branchId` | ✅ Implemented | Uses `getMenuForTable` resolver |
| `GET /api/v1/customer/menu/:branchId/items/:id` | ✅ Implemented | Item with resolved price |
| `POST /api/v1/customer/orders` | ⚠️ Partial | Full logic, but **tax & service charge hardcoded to 0** |
| `GET /api/v1/customer/orders/session/:sessionId` | ✅ Implemented | Lists session orders |

### Admin (Portal)
| Endpoint | Status | Notes |
|----------|--------|-------|
| `GET /api/v1/admin/branches` | ⚠️ Partial | Returns **all** branches globally — **no org filter** |
| `POST /api/v1/admin/branches` | ✅ Implemented | Scoped to user's org |
| `GET/PUT/DELETE /api/v1/admin/branches/:id` | ✅ Implemented | |
| `GET /api/v1/admin/menu/categories` | ⚠️ Partial | No org filter |
| `POST/PUT/DELETE /api/v1/admin/menu/categories/*` | ✅ Implemented | |
| `GET /api/v1/admin/menu/items` | ⚠️ Partial | No org filter |
| `POST/GET/PUT/DELETE /api/v1/admin/menu/items/*` | ✅ Implemented | |
| `GET/POST/DELETE /api/v1/admin/menu/items/:id/class-rules` | ✅ Implemented | |
| `GET/POST/PUT/DELETE /api/v1/admin/menu/modifier-groups/*` | ✅ Implemented | |
| `POST/PUT/DELETE /api/v1/admin/menu/modifiers/*` | ✅ Implemented | |
| `POST/DELETE /api/v1/admin/menu/items/:id/modifier-groups/:groupId` | ✅ Implemented | Attach/detach |
| `GET /api/v1/admin/tables` | ⚠️ Partial | Returns **all** tables globally — **no org filter** |
| `GET /api/v1/admin/tables/classes` | ⚠️ Partial | Returns **all** table classes globally — **no org filter** |
| `POST/PUT/DELETE /api/v1/admin/tables/classes/*` | ✅ Implemented | |
| `POST/PUT/DELETE /api/v1/admin/tables/*` | ✅ Implemented | |
| `PUT /api/v1/admin/tables/:id/status` | ✅ Implemented | + broadcasts event |
| `POST /api/v1/admin/qr/generate/:tableId` | ✅ Implemented | Uses external qrserver.com |
| `GET/POST/GET/PUT/PATCH/DELETE /api/v1/admin/reservations/*` | ✅ Implemented | Full CRUD |
| `GET/PUT /api/v1/admin/settings` | ⚠️ Partial | **In-memory only** — not persisted |
| `GET /api/v1/admin/staff` | ✅ Implemented | Filtered by org |
| `POST/GET/PUT/DELETE /api/v1/admin/staff/*` | ✅ Implemented | |

### Kitchen (KDS)
| Endpoint | Status | Notes |
|----------|--------|-------|
| `GET /api/v1/kitchen/:branchId` | ⚠️ Partial | Loads **all** active orders then filters in JS — inefficient |
| `PUT /api/v1/kitchen/items/:orderItemId/status` | ✅ Implemented | Auto-promotes order to ready |
| `PUT /api/v1/kitchen/orders/:orderId/status` | ✅ Implemented | |
| `PUT /api/v1/kitchen/menu/:menuItemId/availability` | ✅ Implemented | 86 / un-86 item |

### Waiter
| Endpoint | Status | Notes |
|----------|--------|-------|
| `GET /api/v1/waiter/tables/:branchId` | ✅ Implemented | Tables + active sessions + last 3 orders |
| `POST /api/v1/waiter/orders` | ⚠️ Partial | Full logic, but **tax & service charge hardcoded to 0** |

### Overlord (Superadmin)
| Endpoint | Status | Notes |
|----------|--------|-------|
| `POST /api/overlord/auth/login` | ✅ Implemented | |
| `POST /api/overlord/auth/logout` | ✅ Implemented | |
| `GET /api/overlord/auth/me` | ✅ Implemented | |
| `GET /api/overlord/stats` | ✅ Implemented | Live platform stats |
| `GET /api/overlord/organizations` | ✅ Implemented | With counts |
| `GET/PATCH /api/overlord/organizations/:id/*` | ✅ Implemented | Detail, toggle active, change sub |
| `GET/POST/PUT/PATCH /api/overlord/plans/*` | ✅ Implemented | Full CRUD |
| `GET /api/overlord/users` | ✅ Implemented | List with memberships |

### Events (Real-time)
| Endpoint | Status | Notes |
|----------|--------|-------|
| `GET /api/v1/events` | ✅ Implemented | Long polling, 25s timeout, 50-event ring buffer |

---

## 3. Frontend

### `apps/portal` — Restaurant Dashboard

| Feature | Status | Notes |
|---------|--------|-------|
| Login | ✅ Implemented | Valibot validation, API wired |
| Register | ✅ Implemented | Org + user creation, trial badge |
| Auth Store | ✅ Implemented | Zustand + localStorage |
| Sidebar Layout | ✅ Implemented | Responsive, mobile overlay |
| **Dashboard** | ⚠️ Partial | UI shell with stat cards, **all values hardcoded to `"—"`** |
| **Menu Management** | ✅ Implemented | Categories + items CRUD, availability toggle |
| Menu — Modifier Groups | ❌ Missing | API exists, no UI |
| Menu — Table Class Pricing | ❌ Missing | API exists, no UI |
| Menu — Image Upload | ❌ Missing | `imageUrl` is plain text field |
| **Tables Grid** | ✅ Implemented | Full CRUD, status controls, QR generation & display |
| Tables — QR Display | ✅ Implemented | View + download QR per table |
| Tables — Floor Plan Editor | ❌ Missing | `positionX/Y` in DB, no drag-and-drop UI |
| **Orders List** | ⚠️ Partial | Read-only list from kitchen API. **Cannot update status** |
| **Staff List** | ✅ Implemented | Role badges, active/inactive styling |
| Staff — Invite/Add/Edit | ❌ Missing | API exists, portal is read-only |
| **Reservations** | ❌ Missing | No route or page. API is complete |
| **Settings** | ❌ Missing | No route or page. API is in-memory only |
| **Kitchen Display (KDS)** | ✅ Implemented | `/kitchen` page with long-poll, order & item status controls |
| **Waiter View** | ❌ Missing | No UI. API is complete |
| **Branches** | ✅ Implemented | Full CRUD page in portal |
| **Analytics** | ❌ Missing | No route or page |
| **Audit Log** | ❌ Missing | No route or page |

### `apps/menu` — Customer Ordering

| Feature | Status | Notes |
|---------|--------|-------|
| Landing Page | ✅ Implemented | "Scan QR" screen |
| Welcome Screen | ✅ Implemented | Guest name, table info, session start |
| Menu Browser | ✅ Implemented | Category tabs, scroll, item cards |
| Item Detail Modal | ✅ Implemented | Modifiers, quantity, instructions |
| Cart Drawer | ✅ Implemented | Slide-up, edit, remove, subtotal |
| Order Confirmation | ✅ Implemented | Order number display |
| Error/Loading States | ✅ Implemented | Spinners, error boundaries |
| Real-time Order Updates | ❌ Missing | Long poll API exists, not wired to UI |
| View Past Orders | ❌ Missing | Session orders API exists, icon button not wired |
| Waiter Call | ❌ Missing | No API, no UI |
| Dietary Filters | ❌ Missing | Tags displayed but not filterable |
| Multi-language (i18n) | ❌ Missing | No i18n setup |

### `apps/overlord` — Platform Admin

| Feature | Status | Notes |
|---------|--------|-------|
| Login | ✅ Implemented | Valibot validation |
| Auth Store | ✅ Implemented | Zustand + localStorage |
| Sidebar Layout | ✅ Implemented | Indigo branding |
| **Dashboard** | ✅ Implemented | Live stats (orgs, users, revenue, subs) |
| **Organizations List** | ✅ Implemented | Search, badges, counts |
| **Organization Detail** | ✅ Implemented | Toggle active, subscription panel, branches, members |
| Organization Edit/Create | ❌ Missing | Only status/subscription toggles exist |
| **Plans CRUD** | ✅ Implemented | Create, edit, toggle active, subscriber counts |
| **Users List** | ✅ Implemented | Search, expandable memberships |
| User Detail/Edit | ❌ Missing | Read-only list only |
| Billing / Invoices | ❌ Missing | No page |
| Audit Log | ❌ Missing | No page |
| Superadmin Settings | ❌ Missing | No page |

---

## 4. Shared Packages

| Package / Export | Status | Notes |
|------------------|--------|-------|
| `@dineflow/db` — schema | ✅ Implemented | 24 tables defined |
| `@dineflow/db` — `getMenuForTable()` | ✅ Implemented | Core business logic |
| `@dineflow/db` — `getNextOrderNumber()` | ✅ Implemented | Atomic counter |
| `@dineflow/db` — seed scripts | ⚠️ Partial | **Broken** — references phantom tables, wrong columns |
| `@dineflow/shared` — Zod schemas (~16) | ✅ Implemented | Used by API routes |
| `@dineflow/shared` — Zod schemas (~6) | 🗑️ Dead Code | `operatingHoursSchema`, `orderModifierInputSchema`, etc. |
| `@dineflow/shared` — `hasPermission()` | ✅ Implemented | Core RBAC |
| `@dineflow/shared` — `isAdmin`, `isManagerOrAbove`, `isStaffOrAbove` | 🗑️ Dead Code | Exported but never imported |
| `@dineflow/shared` — `ApiResponse`, `ApiError`, `PaginatedResponse` | 🗑️ Dead Code | Never used |
| `@dineflow/shared` — `WsEvent*` types | ✅ Implemented | Used by event system |
| `@dineflow/shared` — all constants | 🗑️ Dead Code | Frontends hardcode their own |
| `@dineflow/api-client` | 🗑️ Dead Code | Never imported by any app |

---

## 5. Infrastructure & DevOps

| Component | Status | Notes |
|-----------|--------|-------|
| Docker Compose (full) | ✅ Implemented | Postgres + Redis + API + mDNS |
| Docker Compose (dev) | ✅ Implemented | Postgres + Redis only |
| Dockerfile.api | ✅ Implemented | Multi-stage Bun → Node 20 Alpine |
| Cloudflare Workers (API) | ✅ Configured | `wrangler.toml` present |
| Cloudflare Pages (frontends) | ✅ Configured | `wrangler.toml` present |
| **Redis** | ❌ Missing | Service runs, but **zero app code uses it** |
| **mDNS** | ❌ Missing | Service runs, but **zero app code uses it** |
| **Tests** | ❌ Missing | Zero test files in entire repo |
| **Rate Limiting** | ❌ Missing | No middleware |
| **Input Sanitization** | ❌ Missing | Only Zod validation |
| **API Documentation** | ❌ Missing | No Scalar/Swagger/OpenAPI |

---

## 6. Feature Matrix (Cross-Cutting)

| Feature | DB Schema | API | Portal UI | Menu UI | Overlord UI |
|---------|-----------|-----|-----------|---------|-------------|
| Auth (Portal) | ✅ | ✅ | ✅ | N/A | N/A |
| Auth (Overlord) | ✅ | ✅ | N/A | N/A | ✅ |
| Customer Ordering | ✅ | ✅ | N/A | ✅ | N/A |
| Menu Management | ✅ | ✅ | ✅ | N/A | N/A |
| Modifier Groups | ✅ | ✅ | ❌ | N/A | N/A |
| Table Class Pricing | ✅ | ✅ | ❌ | N/A | N/A |
| Table Management | ✅ | ✅ | ✅ | N/A | N/A |
| QR Codes | ✅ | ✅ | ✅ | N/A | N/A |
| Floor Plan | ❌ | ❌ | ❌ | N/A | N/A |
| Staff Management | ✅ | ✅ | ⚠️ | N/A | N/A |
| Reservations | ✅ | ✅ | ❌ | N/A | N/A |
| Kitchen Display | ✅ | ✅ | ✅ | N/A | N/A |
| Waiter App | ✅ | ✅ | ❌ | N/A | N/A |
| Settings | ❌ | ⚠️ | ❌ | N/A | N/A |
| Real-time Events | ✅ | ✅ | ❌ | ❌ | N/A |
| Payments | ✅ | ❌ | ❌ | ❌ | N/A |
| Feedback | ✅ | ❌ | ❌ | ❌ | N/A |
| Waiter Calls | ✅ | ❌ | ❌ | ❌ | N/A |
| Audit Logs | ✅ | ❌ | ❌ | ❌ | ❌ |
| Analytics | ❌ | ❌ | ❌ | N/A | N/A |
| Platform Stats | ✅ | ✅ | N/A | N/A | ✅ |
| Subscription Plans | ✅ | ✅ | N/A | N/A | ✅ |
| Org Management | ✅ | ✅ | N/A | N/A | ✅ |

---

## 7. Critical Bugs / Blockers

1. **`seed.ts` will crash** — imports `settings` and `floors` tables that don't exist in schema
2. **`seed.ts` inserts wrong columns** into `users` table (`role`, `branchId`, `staffType` belong in `organization_members`)
3. **`orderCounters` seed uses wrong PK** (`id` instead of `branchId`)
4. **Admin list endpoints lack org scoping** — branches, tables, table classes, menu items/categories return global data
5. **Kitchen GET loads all orders into memory** then filters by branch in JS
6. **Tax & service charge hardcoded to 0** in both customer and waiter order creation
7. **Staff page is read-only** — API supports add/edit/delete, portal only lists

---

*End of Status Report*
