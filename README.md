# DineFlow

Self-hosted restaurant management system API. Provides REST and WebSocket endpoints for restaurant management.

## MVP Scope

**Included (API only):**

- QR-based customer ordering endpoints
- Table class system with per-class pricing and visibility rules
- Real-time kitchen events via WebSockets
- Waiter and Admin API endpoints
- Role-based auth (admin / manager / staff)

**Deferred:**
Payments, billing, split bill, tips, discounts, analytics, receipt printing, inventory, loyalty program, audit logging.

## Architecture

```
dineflow/
├── apps/
│   └── api/        Hono REST API + WebSocket (Node.js 20)
├── packages/
│   ├── db/         Drizzle ORM schema, migrations, queries, seed
│   ├── shared/     Zod validators, types, enums, role helpers
│   └── api-client/ Hono RPC type-safe client
├── docker/
│   ├── docker-compose.yml      Production stack
│   ├── docker-compose.dev.yml  Dev: DB + Redis only
│   └── Dockerfile.api          Multi-stage Bun→Node build
└── scripts/
    └── install.sh  One-command production setup
```

## Tech Stack

| Layer       | Technology                      |
| ----------- | ------------------------------- |
| Runtime     | Node.js 20+                     |
| Pkg manager | Bun (workspaces + install only) |
| API         | Hono v4 + @hono/node-server     |
| Database    | PostgreSQL 16 + Drizzle ORM     |
| Real-time   | ws (WebSocket)                  |
| Containers  | Docker + Docker Compose         |
| Local DNS   | Avahi/mDNS → `menu.local`       |

## Prerequisites

- Node.js 20+
- Bun (`curl -fsSL https://bun.sh/install | bash`)
- Docker + Docker Compose

## Dev Quickstart

```bash
# 1. Install dependencies
bun install

# 2. Start DB + Redis
docker compose -f docker/docker-compose.dev.yml up -d

# 3. Copy and configure environment
cp .env.example .env

# 4. Generate & run migrations
bun run db:generate
bun run db:migrate

# 5. Seed the database
bun run db:seed

# 6. Start API (API on :3000)
bun run dev
```

## Production Deploy

```bash
bash scripts/install.sh
```

This script will:

1. Install Docker and Bun if needed
2. Generate a random `BETTER_AUTH_SECRET`
3. Start all containers
4. Run migrations and seed
5. Print the admin URL and default credentials

## Default Logins

| Role    | Email                     | Password   |
| ------- | ------------------------- | ---------- |
| Admin   | admin@restaurant.local    | admin123   |
| Manager | manager@restaurant.local  | manager123 |
| Waiter  | waiter1@restaurant.local  | waiter123  |
| Kitchen | kitchen1@restaurant.local | kitchen123 |

## How QR Codes Work

Each table gets a QR code encoding `http://menu.local/table/{tableId}` (with `http://{LOCAL_IP}/table/{tableId}` as a fallback).

When a customer scans the code:

1. A session is created and linked to the table
2. The menu loads filtered by the table's class (Regular/VIP/etc.)
3. Prices are resolved server-side at order time using the class multiplier or override

QR codes can be regenerated per-table from the admin portal: **Tables → [table] → QR code**.

## Role Hierarchy

```
admin (3)   — Full access: settings, table classes, all CRUD, all branches
  └── manager (2) — Menu, tables, floors, staff, reservations
        └── staff (1)  — Table status updates, order entry (waiter / kitchen)
```

Staff can have a `staffType`:

- `waiter` — Redirected to Waiter Dashboard on login
- `kitchen` — Redirected to KDS on login
- `cashier` — (future: redirected to payment terminal)

## WebSocket Channels

| Channel              | Subscribers   | Events                                                                        |
| -------------------- | ------------- | ----------------------------------------------------------------------------- |
| `session:<id>`       | Customer      | `order:new`, `order:status_update`, `item:status_update`                      |
| `kitchen:<branchId>` | Kitchen staff | `order:new`, `order:status_update`, `item:status_update`, `item:availability` |
| `waiter:<branchId>`  | Waiters       | `order:new`, `table:status_change`, `item:status_update`                      |
| `admin`              | Admin/manager | `item:availability`, `kitchen:alert`                                          |

## Future Features Roadmap

The database schema already includes production-ready placeholder tables for:

- **Payments** — cash, bKash, Nagad, card; tip amounts; gateway refs
- **Feedback** — per-session star ratings + comments
- **Waiter calls** — customers request water, napkins, bill, etc.
- **Audit logs** — full history of who changed what and when
- **Analytics** — revenue by period, top items, peak hours
- **Inventory** — stock tracking, low-stock alerts
- **Loyalty** — points, rewards, customer profiles
- **Receipt printing** — thermal printer support
- **Split bill** — split by person or item

None of these require schema migrations to implement.
