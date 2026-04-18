# DineFlow

A multi-tenant restaurant SaaS platform. Restaurant owners register, set up their menu and tables, and customers scan QR codes at their table to browse the menu and place orders from their phones.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Apps & Packages](#apps--packages)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Database](#database)
- [Running in Development](#running-in-development)
- [How the QR Ordering Flow Works](#how-the-qr-ordering-flow-works)
- [Multi-tenancy & Roles](#multi-tenancy--roles)
- [Key Concepts](#key-concepts)
- [Project Structure](#project-structure)
- [Common Tasks](#common-tasks)
- [WebSocket Channels](#websocket-channels)
- [Tech Stack](#tech-stack)
- [Roadmap](#roadmap)

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────┐
│                  Monorepo (Bun + Turborepo)              │
│                                                          │
│  apps/                                                   │
│    api       ── Hono REST API              :3000         │
│    portal    ── Restaurant owner dashboard :5000         │
│    menu      ── Customer QR ordering app  :5001         │
│    overlord  ── Platform superadmin panel               │
│                                                          │
│  packages/                                               │
│    db        ── Drizzle ORM schema + queries             │
│    shared    ── Zod schemas, role helpers                │
│    api-client── Re-exported typed Hono client            │
└──────────────────────────────────────────────────────────┘
```

One API server serves all frontends. The portal and menu app use **Hono's RPC client** — fully typed API calls with zero boilerplate. Authentication is session-based (HTTP-only cookie + `Authorization: Bearer` header).

---

## Apps & Packages

| Name | Path | Port | Audience |
|------|------|------|----------|
| `@dineflow/api` | `apps/api` | 3000 | Internal — serves all frontends |
| `@dineflow/portal` | `apps/portal` | 5000 | Restaurant owners, managers, staff |
| `@dineflow/menu` | `apps/menu` | 5001 | Customers (QR scan → order) |
| `@dineflow/overlord` | `apps/overlord` | — | Platform superadmin |
| `@dineflow/db` | `packages/db` | — | Shared schema, migrations, seed |
| `@dineflow/shared` | `packages/shared` | — | Zod schemas, role helpers |

---

## Prerequisites

- **Bun** ≥ 1.3.10 — [install](https://bun.sh)
- **Docker** — for local Postgres + Redis
- Git

---

## Getting Started

```bash
# 1. Clone and enter the repo
git clone <repo-url> && cd dineflow

# 2. Install all workspace dependencies
bun install

# 3. Copy environment config
cp .env.example .env
# Edit .env if you need to change ports or credentials

# 4. Start Postgres + Redis
bun run infra:up

# 5. Run database migrations
bun run db:migrate

# 6. Seed demo restaurant data
bun run db:seed

# 7. Create the platform superadmin account
bun run db:seed:superadmin

# 8. Generate typed API declarations for the frontend clients
cd apps/api && bun run gen-types && cd ../..

# 9. Start all apps
bun run dev
```

**You're up.** Open:

| URL | What you'll see |
|-----|-----------------|
| `http://localhost:5000/register` | Register a new restaurant organization |
| `http://localhost:5000/login` | Portal login |
| `http://localhost:5001/table/1` | Customer menu for table 1 (after seeding) |
| `http://localhost:3000/health` | API health check |

---

## Environment Variables

All apps read from the root `.env` file.

```env
# Postgres — matches the Docker Compose default
DATABASE_URL=postgresql://dineflow:dineflow_local@localhost:5432/dineflow

# Redis — used for WebSocket pub/sub
REDIS_URL=redis://localhost:6379

# Session signing secret — change to a long random string in production
BETTER_AUTH_SECRET=change-me-to-a-long-random-string

PORT=3000
NODE_ENV=development
```

---

## Database

Schema files live in `packages/db/src/schema/`. Every table is a Drizzle schema file; relations are declared separately in `relations.ts`.

```bash
# Apply pending migrations
bun run db:migrate

# Seed demo data (branches, tables, menu items, staff)
bun run db:seed

# Seed the platform superadmin
bun run db:seed:superadmin

# Open Drizzle Studio (visual DB browser at :4983)
bun run db:studio

# After editing schema files, generate a new migration
bun run db:generate
```

### Seed credentials

After `bun run db:seed`, these legacy single-tenant accounts are available for quick testing:

| Email | Password | Role |
|-------|----------|------|
| `admin@restaurant.local` | `admin123` | Admin |
| `manager@restaurant.local` | `manager123` | Manager |
| `waiter1@restaurant.local` | `waiter123` | Waiter |
| `kitchen1@restaurant.local` | `kitchen123` | Kitchen |

For the full multi-tenant flow, register via `http://localhost:5000/register`.

---

## Running in Development

### All apps (recommended)

```bash
bun run dev
```

Turborepo starts everything in parallel with dependency ordering.

### Individual apps

```bash
cd apps/api     && bun run dev   # API on :3000
cd apps/portal  && bun run dev   # Portal on :5000
cd apps/menu    && bun run dev   # Customer app on :5001
```

### After changing API routes

Whenever you add or modify a route in `apps/api/src/restaurant-app.ts`, regenerate the typed declarations so the frontend clients stay in sync:

```bash
cd apps/api && bun run gen-types
```

### Typecheck

```bash
cd apps/portal && bunx tsc --noEmit
cd apps/menu   && bunx tsc --noEmit
cd apps/api    && bunx tsc --noEmit
```

---

## How the QR Ordering Flow Works

```
1. Owner creates branches + tables in the Portal
         ↓
2. Owner generates QR codes (Portal → Tables page)
   Each table stores:  http://localhost:5001/table/{tableId}
         ↓
3. Customer scans QR code on their phone
         ↓
4. Menu app fetches table context
   GET /api/v1/customer/table/:tableId
   → org name, branch name, table number, table class, currency
         ↓
5. Customer enters name (optional) → "View Menu"
   POST /api/v1/customer/session/start
   → session created, table marked "occupied"
         ↓
6. Customer browses menu
   GET /api/v1/customer/menu/:branchId?table={tableId}
   → items filtered + priced by table class rules
         ↓
7. Customer places order
   POST /api/v1/customer/orders
   → order broadcast via WebSocket to kitchen + waiter displays
```

---

## Multi-tenancy & Roles

### Organizations & Branches

Each restaurant group is an **organization**. Organizations have one or more **branches**. Each branch has its own tables, staff, and can have branch-specific menu overrides.

A new organization is created via `http://localhost:5000/register`. The registering user becomes the **owner** with a 30-day free trial subscription automatically created.

### Role Hierarchy

```
owner   (4)  Full access. Created on organization registration.
admin   (3)  Manage staff, menu, branches, settings.
manager (2)  Manage tables, orders, reservations.
staff   (1)  Scoped to one branch — view orders, limited actions.
```

Roles are enforced in API middleware via `roleGuard('manager')` etc., using `hasPermission(userRole, required)` from `@dineflow/shared`.

Staff members with a `staffType` are routed to specialized views:

| staffType | Destination |
|-----------|-------------|
| `waiter` | Waiter dashboard |
| `kitchen` | Kitchen display (KDS) |
| `cashier` | (future: payment terminal) |

### Table Classes

Tables are assigned a **table class** (e.g. Regular, VIP). This controls:

- **Menu visibility** — items can be shown to all, VIP-only, or hidden from VIP
- **Pricing** — each class has a `priceMultiplier` (e.g. VIP = 1.2×)
- **Per-item price overrides** — override the class multiplier for specific items

Menu item visibility is controlled by `visibilityMode` on each item:

| `visibilityMode` | Behaviour |
|-----------------|-----------|
| `all` | Show to every table class |
| `include` | Only shown to classes with an explicit include rule |
| `exclude` | Hidden from classes with an exclude rule |

---

## Key Concepts

### Typed API client

The portal and menu apps use Hono's RPC client for fully typed API calls:

```ts
import { hc } from 'hono/client'
import type { RestaurantAppType } from '@dineflow/api/restaurant-app'

const client = hc<RestaurantAppType>('http://localhost:3000')

// TypeScript knows the exact response shape
const res = await client.api.v1.admin.menu.categories.$get()
const { data } = await res.json() // fully typed
```

The type is compiled from `apps/api/src/restaurant-app.ts` → `apps/api/dist/restaurant-app.d.ts`. Run `bun run gen-types` after any route change.

> Routes that use non-chained `.get()`/`.post()` style on a Hono instance are not captured in the RPC type. Use plain `fetch` wrappers (see `apps/menu/src/lib/client.ts`) for those.

### Menu resolver

`packages/db/src/queries/menu-resolver.ts` — `getMenuForTable(db, branchId, tableId)`:

1. Resolves the table's class and price multiplier
2. Fetches active categories + items for the branch (branch-specific + global)
3. Applies `visibilityMode` filtering per table class
4. Resolves final price (base × multiplier, or per-item override)

This is the single source of truth for what a customer sees and what price they pay.

### Session-based ordering

When a customer starts a session (`POST /api/v1/customer/session/start`), a `sessions` row is created linking the table, branch, and table class. All subsequent orders reference this `sessionId`. When the session ends, the table is marked `vacant` and the session is closed.

---

## Project Structure

```
dineflow/
├── apps/
│   ├── api/src/
│   │   ├── routes/
│   │   │   ├── auth.ts              # /auth — register, login, logout, /me
│   │   │   ├── admin/               # /api/v1/admin — portal routes (auth required)
│   │   │   │   ├── branches.ts
│   │   │   │   ├── menu.ts          # Categories, items, modifiers
│   │   │   │   ├── tables.ts
│   │   │   │   ├── staff.ts
│   │   │   │   ├── reservations.ts
│   │   │   │   ├── settings.ts
│   │   │   │   └── qr.ts            # QR code generation
│   │   │   ├── customer/            # /api/v1/customer — public, no auth
│   │   │   │   ├── table.ts         # Table info lookup
│   │   │   │   ├── menu.ts          # Menu resolver
│   │   │   │   ├── sessions.ts      # Start/get session
│   │   │   │   └── orders.ts        # Place order
│   │   │   ├── kitchen/             # /api/v1/kitchen — KDS
│   │   │   ├── waiter/              # /api/v1/waiter — waiter app
│   │   │   └── overlord/            # /api/overlord — platform admin
│   │   ├── middleware/
│   │   │   ├── auth.ts              # requireAuth, roleGuard, session store
│   │   │   ├── overlord-auth.ts     # Separate auth for superadmin
│   │   │   └── errors.ts            # AppError hierarchy
│   │   ├── ws/                      # WebSocket broadcaster
│   │   ├── restaurant-app.ts        # Type-only app — run gen-types after changes
│   │   └── index.ts                 # Runtime Hono app entry point
│   │
│   ├── portal/src/
│   │   ├── routes/
│   │   │   ├── login.tsx
│   │   │   ├── register.tsx
│   │   │   └── _auth/               # Authenticated layout + sub-pages
│   │   │       ├── dashboard.tsx
│   │   │       ├── menu/index.tsx   # Full menu CRUD
│   │   │       ├── tables/index.tsx
│   │   │       ├── orders/index.tsx
│   │   │       └── staff/index.tsx
│   │   ├── store/auth.ts            # Zustand auth store (localStorage-persisted)
│   │   └── lib/client.ts            # Typed Hono client
│   │
│   └── menu/src/
│       ├── routes/
│       │   ├── index.tsx            # Home — "scan QR to order"
│       │   └── table.$tableId.tsx   # Full customer ordering experience
│       └── lib/
│           ├── client.ts            # Typed client + fetch helpers
│           └── types.ts             # Customer-side TS interfaces
│
├── packages/
│   ├── db/src/
│   │   ├── schema/                  # One file per table
│   │   │   ├── organizations.ts     # organizations, subscription_plans, subscriptions
│   │   │   ├── branches.ts
│   │   │   ├── tables.ts
│   │   │   ├── table-classes.ts
│   │   │   ├── users.ts
│   │   │   ├── organization-members.ts
│   │   │   ├── menu.ts              # menu_categories, menu_items, modifiers…
│   │   │   ├── orders.ts
│   │   │   └── enums.ts
│   │   ├── queries/
│   │   │   └── menu-resolver.ts     # getMenuForTable()
│   │   ├── seed.ts                  # Demo restaurant seed
│   │   └── seed-superadmin.ts       # Overlord seed
│   └── shared/src/
│       ├── schemas.ts               # Zod schemas (login, register, menu CRUD…)
│       └── roles.ts                 # ROLE_HIERARCHY, hasPermission()
│
├── docker/
│   ├── docker-compose.yml           # Full production stack
│   ├── docker-compose.dev.yml       # Dev: DB + Redis only
│   └── Dockerfile.api
├── .env.example
├── turbo.json
└── package.json                     # Root workspace — bun run dev/build/infra:*
```

---

## Common Tasks

### Add a new API route

1. Create the handler in `apps/api/src/routes/<section>/`
2. Mount it in `apps/api/src/index.ts`
3. If a frontend needs it, also add it to `apps/api/src/restaurant-app.ts`
4. Run `cd apps/api && bun run gen-types`
5. Use `client.api.v1...` in the frontend — it's fully typed

### Add a new database table

1. Create `packages/db/src/schema/<table>.ts`
2. Export it from `packages/db/src/schema/index.ts`
3. Add relations in `packages/db/src/schema/relations.ts` if needed
4. Run `bun run db:generate` → `bun run db:migrate`

### Add a portal page

1. Create `apps/portal/src/routes/_auth/<name>/index.tsx`
2. The TanStack Router Vite plugin auto-updates `routeTree.gen.ts` on next dev server start
3. Add a sidebar link in `apps/portal/src/routes/_auth.tsx` if needed

### Add a validation schema

Add Zod schemas to `packages/shared/src/schemas.ts` and import them in both the API (`zValidator`) and the frontend form.

---

## WebSocket Channels

| Channel | Subscribers | Events |
|---------|-------------|--------|
| `session:<id>` | Customer app | `order:new`, `order:status_update` |
| `kitchen:<branchId>` | Kitchen display | `order:new`, `item:status_update`, `item:availability` |
| `waiter:<branchId>` | Waiter app | `order:new`, `table:status_change`, `item:status_update` |

Connect from the client:

```ts
const ws = new WebSocket(`ws://localhost:3000/ws`)
ws.onopen = () => ws.send(JSON.stringify({ type: 'subscribe', channel: 'kitchen:1' }))
ws.onmessage = (e) => console.log(JSON.parse(e.data))
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime / package manager | Bun |
| Monorepo orchestration | Turborepo |
| API framework | Hono v4 |
| Database | PostgreSQL 16 + Drizzle ORM |
| API validation | Zod |
| Frontend framework | React 19 |
| Client-side routing | TanStack Router (file-based) |
| Data fetching / caching | TanStack Query |
| Form validation | Valibot |
| Styling | Tailwind CSS v4 |
| Icons | Lucide React |
| Global state | Zustand |
| Real-time | Native WebSockets |
| Deployment target | Cloudflare Workers (API) + static hosting (frontends) |

---

## Roadmap

The database schema already has placeholder tables ready for these future features — no schema migrations needed to implement them:

- **Payments** — cash, bKash, Nagad, card; tip amounts; gateway refs
- **Reservations** — advance table booking with time slots
- **Waiter calls** — customers request water, napkins, the bill
- **Feedback** — per-session star ratings and comments
- **Audit log** — full history of who changed what and when
- **Analytics** — revenue by period, top items, peak hours
- **Inventory** — stock tracking and low-stock alerts
- **Loyalty** — points, rewards, customer profiles
- **Split bill** — split by person or item
- **Receipt printing** — thermal printer support
- **Public landing page** — SEO-friendly restaurant page with menu preview and advance reservations (TanStack Start SSR planned)
