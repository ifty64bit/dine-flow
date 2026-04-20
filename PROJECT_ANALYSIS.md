# DineFlow — Project Analysis & Reference

> Generated: 2026-04-20  
> Purpose: Comprehensive technical reference for developers working on the DineFlow codebase.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture](#2-architecture)
3. [Technology Stack](#3-technology-stack)
4. [Monorepo Structure](#4-monorepo-structure)
5. [Apps](#5-apps)
6. [Packages](#6-packages)
7. [Database](#7-database)
8. [API Design](#8-api-design)
9. [Frontend Patterns](#9-frontend-patterns)
10. [Authentication & Authorization](#10-authentication--authorization)
11. [Real-Time Events](#11-real-time-events)
12. [Deployment](#12-deployment)
13. [Development Workflow](#13-development-workflow)
14. [Known Gaps & Future Work](#14-known-gaps--future-work)

---

## 1. Project Overview

**DineFlow** is a multi-tenant restaurant SaaS platform. Restaurant owners register their business, configure menus and tables, and customers scan QR codes at their table to browse the menu and place orders from their phones. The platform supports multiple branches per organization, role-based staff access, table-class-based pricing, and real-time order broadcasting to kitchen and waiter dashboards.

### Key Features
- QR-code-based customer ordering (no app download required)
- Multi-branch organization support
- Role-based staff access (Owner > Admin > Manager > Staff)
- Table-class pricing (Regular, VIP, etc. with multipliers/overrides)
- Kitchen Display System (KDS) with item-level status tracking
- Waiter dashboard for table management and order placement
- Platform admin panel (Overlord) for SaaS operations
- Real-time order updates via long polling

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Monorepo (Bun + Turborepo)               │
│                                                             │
│  apps/                                                      │
│    api        ── Hono REST API                :3000         │
│    portal     ── Restaurant owner dashboard   :5000         │
│    menu       ── Customer QR ordering app     :5001         │
│    overlord   ── Platform superadmin panel    :4000         │
│                                                             │
│  packages/                                                  │
│    db         ── Drizzle ORM schema + queries               │
│    shared     ── Zod schemas, role helpers, types           │
│    api-client ── Re-exported typed Hono client              │
└─────────────────────────────────────────────────────────────┘
```

### Design Principles
- **One API serves all frontends** — Single Hono backend with route prefixes per audience
- **Type-safe everywhere** — Hono RPC gives fully typed API clients to frontends
- **Dual runtime support** — Same code runs on Cloudflare Workers (production) and Node.js (local dev)
- **Database-first** — Schema is source of truth; Drizzle handles migrations and queries

---

## 3. Technology Stack

| Layer | Technology | Version Notes |
|-------|-----------|---------------|
| Runtime / Package Manager | **Bun** | >= 1.3.10 |
| Monorepo Orchestration | **Turborepo** | Task graph with caching |
| API Framework | **Hono v4** | Zod validation, RPC client |
| Database | **PostgreSQL 16** | Via Drizzle ORM |
| DB Drivers | **Neon HTTP** (prod) / **postgres-js** (dev) | Dual driver pattern |
| API Validation | **Zod** | `@hono/zod-validator` |
| Frontend Framework | **React 19** | Vite-based builds |
| Client Routing | **TanStack Router** | File-based routing |
| Data Fetching | **TanStack Query** | Server state caching |
| Form Validation | **Valibot** | Frontend only |
| Styling | **Tailwind CSS v4** | `@tailwindcss/vite` plugin |
| Icons | **Lucide React** | |
| Global State | **Zustand** | Persisted to `localStorage` |
| Real-Time | **Long Polling** | In-memory event queues (25s timeout) |
| Deployment | **Cloudflare** | Workers (API) + Pages (frontends) |

---

## 4. Monorepo Structure

```
dineflow/
├── apps/
│   ├── api/           # Backend API
│   ├── menu/          # Customer ordering app
│   ├── overlord/      # Platform admin panel
│   └── portal/        # Restaurant staff dashboard
├── packages/
│   ├── api-client/    # Typed Hono client wrapper
│   ├── db/            # Drizzle schema, queries, migrations
│   └── shared/        # Zod schemas, types, role logic
├── docker/
│   ├── Dockerfile.api
│   ├── docker-compose.dev.yml
│   └── docker-compose.yml
├── turbo.json         # Task graph & caching rules
├── tsconfig.json      # Root TypeScript config (NodeNext)
└── package.json       # Workspace definitions
```

### Workspace Dependencies
All internal packages use `"workspace:*"` in their `package.json` dependencies.

---

## 5. Apps

### `apps/api` — `@dineflow/api`

The core backend. Hono v4 app with **two runtime entry points**:

| Entry | Purpose | Driver |
|-------|---------|--------|
| `src/index.ts` | Cloudflare Workers production | Neon HTTP |
| `src/index.node.ts` | Local Node.js development | `postgres-js` TCP |

**Route Structure:**

| Prefix | Audience | Routes |
|--------|----------|--------|
| `/auth` | All | Register, login, logout, `/me` |
| `/api/v1/customer/*` | Public (no auth) | Table lookup, menu, sessions, orders |
| `/api/v1/admin/*` | Portal staff | Menu, tables, staff, reservations, settings, QR |
| `/api/v1/kitchen/*` | Kitchen staff | Orders, item status, availability |
| `/api/v1/waiter/*` | Waiters | Tables, place orders |
| `/api/overlord/*` | Superadmins | Stats, orgs, plans, users |
| `/api/v1/events` | All | Long-polling event stream |

**Key Files:**
- `src/db.ts` — Lazy DB initialization via Proxy pattern
- `src/restaurant-app.ts` — **Type-only** Hono app for frontend RPC types
- `src/overlord-app.ts` — **Type-only** Hono app for overlord RPC types
- `src/middleware/auth.ts` — Session validation, `requireAuth`, `roleGuard`
- `src/middleware/errors.ts` — `AppError` hierarchy + global error handler

---

### `apps/portal` — `@dineflow/portal`

Restaurant owner/staff dashboard (port 5000).

**Tech:** Vite + React 19 + TanStack Router + TanStack Query + Tailwind v4 + Zustand + Valibot

**Features:**
- Authentication (login/register)
- Sidebar navigation for authenticated routes
- Dashboard, Menu Management, Tables, Orders, Staff
- QR code generation for tables
- Settings page

**Patterns:**
- Typed Hono client: `hc<RestaurantAppType>(BASE)`
- Auto-logout on 401 responses
- Zustand auth store persisted to `localStorage`
- Vite proxy: `/api` and `/auth` → `localhost:3000`

---

### `apps/menu` — `@dineflow/menu`

Customer QR ordering app (port 5001).

**Tech:** Vite + React 19 + TanStack Router + TanStack Query + Tailwind v4

**Features:**
- Landing page: "Scan QR to order"
- Table-specific ordering flow:
  1. Welcome screen (guest name, table info)
  2. Menu browser with category tabs
  3. Item detail modal with modifier groups
  4. Cart drawer
  5. Order confirmation

**Design:** Dark mobile-first UI (`#09090b` background, orange accents)

**Patterns:**
- Hybrid client: typed Hono client for some routes, plain `fetch` wrappers for customer routes
- No authentication — customers are anonymous
- Local state for cart and session

---

### `apps/overlord` — `@dineflow/overlord`

Platform superadmin panel (port 4000).

**Tech:** Same stack as Portal, but with **indigo** branding instead of orange.

**Features:**
- Separate superadmin authentication
- Dashboard with platform stats
- Organization management (list, detail, toggle active, subscription status)
- Subscription plan management
- User listing

**Patterns:**
- Separate Zustand auth store (`overlord-auth`)
- Typed Hono client: `hc<OverlordAppType>(BASE)`

---

## 6. Packages

### `packages/db` — `@dineflow/db`

The database layer.

**Responsibilities:**
- Drizzle ORM schema definitions (`pg-core`)
- Dual DB client factories: `createDb()` (Neon) / `createDbNode()` (postgres-js)
- Migrations via `drizzle-kit`
- Complex queries: `menu-resolver.ts`, `order-number.ts`
- Seed scripts for demo data

**Key Files:**
- `src/client.ts` — DB factories
- `src/schema/` — One file per table
- `src/schema/relations.ts` — Centralized Drizzle relations
- `src/queries/menu-resolver.ts` — `getMenuForTable()`
- `src/queries/order-number.ts` — Atomic per-branch counter

---

### `packages/shared` — `@dineflow/shared`

Shared validation and business logic.

**Exports:**
- `schemas.ts` — Zod schemas for all API inputs (~200+ lines)
- `roles.ts` — `ROLE_HIERARCHY`, `hasPermission()`, `isManagerOrAbove()`
- `types.ts` — `ApiResponse<T>`, `PaginatedResponse<T>`, WebSocket event types
- `constants.ts` — `as const` enums + color maps

---

### `packages/api-client` — `@dineflow/api-client`

Thin wrapper around `hono/client`.

- Exports `createApiClient()` with lazy `AppType = any`
- Actual types injected at build time from `@dineflow/api`
- **Note:** In practice, apps often import `hc` directly from `hono/client`

---

## 7. Database

### ORM: Drizzle ORM
- Schema defined with `drizzle-orm/pg-core`
- Enum types via `pgEnum()`
- Relations via `relations()` helper
- Query API preferred: `db.query.*.findFirst`, `db.query.*.findMany`

### Schema Overview (18+ tables)

| Domain | Tables |
|--------|--------|
| **Tenant & Billing** | `organizations`, `subscription_plans`, `subscriptions` |
| **Identity** | `users`, `organization_members`, `overlord_admins` |
| **Location** | `branches` |
| **Table Config** | `table_classes`, `tables` |
| **Menu** | `menu_categories`, `menu_items`, `menu_item_class_rules`, `modifier_groups`, `menu_item_modifier_groups`, `modifiers` |
| **Operations** | `sessions`, `order_counters`, `orders`, `order_items` |
| **Reservations** | `reservations` |
| **Future** | `payments`, `feedback`, `waiter_calls`, `audit_logs` |

### Key Design Decisions
1. **Denormalized `branchId`** on `sessions` and `orders` — avoids joins on hot kitchen/waiter queries
2. **Order number generator** — per-branch `order_counters` table with atomic `UPDATE ... RETURNING`
3. **Price resolution at order time** — `base_price × table_class.multiplier` or `price_override` from `menu_item_class_rules`
4. **Modifier snapshots** — `order_items.modifiers` stored as JSONB to preserve historical state
5. **Partial unique index** on `subscriptions` — enforces one active/trialing subscription per org

---

## 8. API Design

### Validation
- **Zod** for all request bodies and params
- Schemas centralized in `@dineflow/shared`
- `@hono/zod-validator` middleware on routes

### Error Handling
- Custom `AppError` hierarchy:
  - `NotFoundError` (404)
  - `UnauthorizedError` (401)
  - `ForbiddenError` (403)
  - `ValidationError` (400)
  - `ConflictError` (409)
- Global `app.onError` catches `AppError` → structured JSON
- Unhandled → generic 500 `{ error: 'INTERNAL_ERROR' }`

### Response Format
```json
{
  "data": { ... },
  "error": null
}
```
or on error:
```json
{
  "data": null,
  "error": {
    "code": "NOT_FOUND",
    "message": "..."
  }
}
```

---

## 9. Frontend Patterns

### Routing: TanStack Router (File-Based)
- `__root.tsx` — Root layout with ErrorBoundary + Suspense
- `_auth.tsx` — Layout route with sidebar; `beforeLoad` checks auth store
- Route files auto-generated into `routeTree.gen.ts`

### State Management
- **Server state:** TanStack Query (`useQuery`, `useMutation`)
- **Client global state:** Zustand + `persist` middleware
  - Portal: `apps/portal/src/store/auth.ts`
  - Overlord: `apps/overlord/src/store/auth.ts`
- **Local state:** React `useState` / `useReducer`

### Data Fetching
- Portal: `useQuery` + `useMutation` with manual `queryClient.invalidateQueries()`
- Menu app: Similar pattern; some routes use plain `fetch` wrappers in `lib/client.ts`

### Styling
- Tailwind CSS v4 with `@tailwindcss/vite`
- Dark theme dominant (`bg-[#09090b]`, `text-zinc-100`)
- Orange accent (Portal/Menu), Indigo accent (Overlord)
- Lucide React icons

---

## 10. Authentication & Authorization

### Session Tokens
- Custom HMAC-SHA256 signed JWT-like tokens (`payload.signature`)
- Stateless — no server-side session store
- 7-day TTL
- Delivered via:
  - HTTP-only cookie (`dineflow_session`)
  - `Authorization: Bearer <token>` header

### Authorization
- `requireAuth` middleware resolves token → user + membership
- `roleGuard('manager')` checks `hasPermission(user.role, required)`
- Role hierarchy: `owner(4) > admin(3) > manager(2) > staff(1)`
- Branch scoping: `branchId` on membership restricts queries for manager/staff

### Overlord Auth
- Separate in-memory token map for superadmins
- Independent middleware (`overlord-auth.ts`)

---

## 11. Real-Time Events

### Transport: Long Polling
- `GET /api/v1/events?channel=&after=` — 25-second timeout
- In-memory ring buffer per channel (last 50 events)
- Channels: `session:<id>`, `kitchen:<branchId>`, `waiter:<branchId>`

### Why Not WebSockets?
- Better fit for serverless/edge runtimes where persistent connections are expensive
- Long polling is the production real-time transport

### Event Types
- `order:new` — New order placed
- `order:status_update` — Item or order status changed
- `session:started` / `session:ended` — Table session lifecycle
- `menu:availability` — Item 86'd or restored

---

## 12. Deployment

### Cloudflare (Primary)
| App | Target | Config |
|-----|--------|--------|
| API | Cloudflare Workers | `wrangler.toml` with `main = "src/index.ts"` |
| Portal | Cloudflare Pages | `wrangler.toml` with `pages_build_output_dir = "dist"` |
| Menu | Cloudflare Pages | Same |
| Overlord | Cloudflare Pages | Same |

### Docker (Alternative)
- `docker/Dockerfile.api` — Multi-stage Bun build → Node 20 Alpine runner
- `docker-compose.yml` — Full stack (Postgres 16, Redis 7, API, mDNS)
- `docker-compose.dev.yml` — Postgres + Redis only

### Environment Variables
```
DATABASE_URL=postgresql://dineflow:dineflow_local@localhost:5432/dineflow
REDIS_URL=redis://localhost:6379
BETTER_AUTH_SECRET=change-me-to-a-long-random-string
PORT=3000
NODE_ENV=development
```

---

## 13. Development Workflow

### Common Commands
```bash
# Start all apps in dev mode
bun run dev

# Start individual apps
bun run dev --filter=api
bun run dev --filter=portal
bun run dev --filter=menu
bun run dev --filter=overlord

# Database operations
bun run db:generate    # Generate migrations
bun run db:migrate     # Run migrations
bun run db:seed        # Seed demo data
bun run db:studio      # Drizzle Studio

# Build
bun run build

# Deploy
bun run deploy
```

### Port Mapping
| App | Port |
|-----|------|
| API | 3000 |
| Overlord | 4000 |
| Portal | 5000 |
| Menu | 5001 |

### Module Resolution
- Root `tsconfig.json`: `module: NodeNext`, `target: ES2022`
- Imports use `.js` extensions even for `.ts` files
- Path alias `@/` → `./src/*` in each app

---

## 14. Known Gaps & Future Work

### Current Limitations
1. **No tests** — No test files exist in `apps/` or `packages/`
2. **In-memory settings** — `admin/settings.ts` uses a hardcoded object instead of DB persistence
4. **In-memory event queues** — Real-time events are stored in memory; won't work across multiple API instances
5. **No rate limiting** — API routes lack rate limiting middleware
6. **No input sanitization** — Beyond Zod validation, no XSS/NoSQL injection hardening
7. **Hardcoded QR service** — Uses `api.qrserver.com` for QR generation

### Future Tables (Schema placeholders)
- `payments`
- `feedback`
- `waiter_calls`
- `audit_logs`

### Scaling Considerations
- Move in-memory event queues to Redis pub/sub
- Add caching layer (Redis) for menu resolution
- Implement rate limiting
- Add comprehensive test suite (unit + integration + e2e)
- Consider WebSockets for real-time if moving off serverless

---

*End of Analysis*
