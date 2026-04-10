# DineFlow Database Schema Reference

A plain-English guide to every table — what it does, why it exists, and where it shows up in the product.

---

## Mental Model

```
Billing       organizations → subscriptions → subscription_plans
Access        users → organization_members → (org + branch + role)
Location      organizations → branches → tables (with table_classes)
Menu          branches → menu_categories → menu_items → menu_item_class_rules
                                                      → modifier_groups → modifiers
                                         menu_item_modifier_groups (junction)
Operations    branches → tables → sessions → orders → order_items
                                                     order_counters (number generator)
Bookings      branches → reservations
Future        payments · feedback · waiter_calls · audit_logs
```

---

## Layer 1 — Tenant & Billing

### `organizations`

The top-level owner of everything in the system. One row = one restaurant business (e.g. "Sultan's Grill"). Every piece of data — menus, tables, staff, orders — traces back to an org via foreign keys.

Stores the brand identity and financial defaults that apply across all branches:
currency, timezone, tax rate, service charge rate, tax-inclusive flag, logo, and branding config.

| Column | Purpose |
|--------|---------|
| `slug` | URL-safe unique identifier (e.g. `sultans-grill`) used in API routes |
| `tax_rate` | Default tax % applied to all orders in this org |
| `service_charge_rate` | Default service charge % |
| `tax_inclusive` | Whether prices already include tax or tax is added on top |
| `branding` | JSONB blob — primary color, font, custom CSS etc |
| `trial_ends_at` | When the free trial expires; null = not on trial |

**UI visibility:** Settings page (org name, logo, tax config).
**Internal use:** `id` is silently attached to every query to prevent cross-tenant data leaks.

---

### `subscription_plans`

The product catalog written by you (the platform owner). Defines each plan tier — Free, Starter, Pro, Enterprise — and what limits apply.

| Column | Purpose |
|--------|---------|
| `slug` | Machine-readable identifier (`free`, `starter`, `pro`, `enterprise`) |
| `monthly_price` | Price charged per billing cycle |
| `max_branches` | How many branch locations the org can create |
| `max_users_per_branch` | Staff cap per branch |
| `max_tables_per_branch` | Table cap per branch |
| `features` | JSONB array of feature flags (`["kds", "reservations", "analytics"]`) |

**UI visibility:** Pricing page, upgrade/downgrade modal.
**Internal use:** Enforced by the API before allowing branch/table/user creation.

---

### `subscriptions`

Links an org to a plan and tracks billing state. One row per billing period; old rows are kept as history (only one `active` or `trialing` row per org at a time, enforced by a partial unique index).

| Column | Purpose |
|--------|---------|
| `status` | `trialing` → `active` → `past_due` → `cancelled` / `paused` |
| `current_period_start/end` | The active billing window |
| `cancelled_at` | When cancellation was requested (service runs until period end) |

**UI visibility:** Billing settings ("Your plan: Pro · Renews May 1").
**Internal use:** Checked on every request to gate premium features.

---

## Layer 2 — Identity & Access

### `users`

Pure authentication identity. Stores only what's needed to log someone in — nothing restaurant-specific. A single user account can belong to multiple organizations (e.g. a consultant managing two restaurants).

| Column | Purpose |
|--------|---------|
| `email` | Login credential and unique identifier |
| `password_hash` | bcrypt hash — never exposed to any UI or API response |
| `is_active` | Soft-disable without deleting the account |

**UI visibility:** Login/signup, profile settings (name, email, password change).
**Internal use:** `password_hash` stays server-side only.

---

### `organization_members`

The bridge that gives a user a *role* inside a specific org. A user row alone has no permissions — this table is what grants access.

| Column | Purpose |
|--------|---------|
| `organization_id` | Which org this membership belongs to |
| `user_id` | Which user |
| `role` | `owner` / `admin` / `manager` / `staff` |
| `staff_type` | Only for staff role: `waiter` / `kitchen` / `cashier` |
| `branch_id` | `null` = org-wide access (owner/admin); set = scoped to one branch (manager/staff) |
| `is_active` | Soft-disable without removing history |
| `joined_at` | When the invitation was accepted |

**Permission rules:**
- `owner` / `admin` → `branch_id` is null → can act on any branch
- `manager` / `staff` → `branch_id` is set → can only act on their branch

**UI visibility:** Team management page (invite, assign roles, deactivate).
**Internal use:** Checked on every API request to authorize the action and scope the query.

---

## Layer 3 — Location

### `branches`

A physical restaurant location under an org. "Sultan's Grill — Gulshan" and "Sultan's Grill — Dhanmondi" are two branches of the same org.

| Column | Purpose |
|--------|---------|
| `organization_id` | Parent org |
| `operating_hours` | JSONB — keyed by day (`mon`–`sun`), each with `open`, `close`, `closed` |
| `is_active` | Hide a branch without deleting its history |

**UI visibility:** Branch selector dropdown (appears throughout the app), branch management page for admins.
**Internal use:** `branch_id` is denormalized onto sessions and orders so kitchen/waiter queries never need to join back up.

---

## Layer 4 — Table Configuration

### `table_classes`

Categories of tables that control pricing and menu visibility. Owned at the org level so all branches share the same class definitions.

Examples: "VIP" (2× price multiplier, gold badge), "Regular" (1× price), "Bar" (1.2×, drinks-only menu).

| Column | Purpose |
|--------|---------|
| `organization_id` | Owning org |
| `slug` | Unique per org (`vip`, `regular`, `bar`) — used in API routes |
| `price_multiplier` | Multiplied against `menu_items.base_price` at order time |
| `badge_color` | Hex color shown on the table card in the UI |
| `is_default` | The class assigned to new tables unless overridden |

**UI visibility:** Admin settings ("Table Classes"), badge color on every table card in waiter/admin views.
**Internal use:** Price resolution at order time — `final_price = base_price × multiplier` (unless a class rule overrides it).

---

### `tables`

The actual physical tables in a branch.

| Column | Purpose |
|--------|---------|
| `branch_id` | Which branch this table belongs to |
| `table_class_id` | Which pricing/visibility class |
| `number` | Human-readable table number (unique per branch) |
| `floor_name` | Optional grouping label — "Ground Floor", "Rooftop", null |
| `capacity` | Number of seats |
| `shape` | `round` / `square` / `rectangle` — for floor map rendering |
| `position_x/y` | Coordinates on the floor map canvas |
| `status` | `vacant` / `occupied` / `reserved` / `cleaning` / `merged` |
| `qr_code_url` | URL of the printed QR code for customer self-ordering |

**UI visibility:** Floor map (admin), table grid (waiter dashboard), status badges in real time via WebSocket.
**Internal use:** `status` is updated on every session open/close; `qr_code_url` is scanned by customers to open the ordering flow.

---

## Layer 5 — Menu

### `menu_categories`

Groups of menu items — "Starters", "Mains", "Drinks", "Desserts". Controls display order on the menu screen.

When `branch_id` is null, the category is shared across all branches. When set, it's branch-specific.

| Column | Purpose |
|--------|---------|
| `branch_id` | null = org-wide; set = branch-specific |
| `sort_order` | Display order on the menu screen |
| `is_active` | Hide without deleting |

**UI visibility:** Tabs/sections on the customer ordering screen, category list in menu management.

---

### `menu_items`

The actual dishes. Stores the base price (pre-class-rule), availability, prep time for KDS display, dietary tags, and which kitchen station prepares it.

| Column | Purpose |
|--------|---------|
| `category_id` | Parent category |
| `branch_id` | null = shared across branches; set = branch-specific |
| `base_price` | Starting price before any class multiplier or override |
| `prep_time_min` | Shown on KDS to indicate expected ready time |
| `dietary_tags` | Array — `["vegetarian", "gluten-free"]` — shown as badges |
| `station` | `grill` / `fryer` / `salad` / `drinks` / `dessert` / `general` — routes item to correct kitchen station |
| `visibility_mode` | `all` = show to everyone; `include` = show only to listed classes; `exclude` = hide from listed classes |
| `is_available` | Toggle off when 86'd (sold out) |

**UI visibility:** Customer menu screen, menu management page. `base_price` is shown to staff; customers see the resolved price.
**Internal use:** `visibility_mode` + `menu_item_class_rules` filter which items appear for each table class.

---

### `menu_item_class_rules`

Per-item rules for specific table classes. Used to both control visibility and override price.

| Column | Purpose |
|--------|---------|
| `menu_item_id` | Which item |
| `table_class_id` | Which class this rule applies to |
| `rule_type` | `include` (show to this class) or `exclude` (hide from this class) |
| `price_override` | If set, use this exact price instead of `base_price × multiplier` |

**Price resolution logic (at order time):**
1. If `price_override` is set on the matching rule → use it
2. Else → `base_price × table_class.price_multiplier`

**UI visibility:** Menu item editor ("Table Class Rules" section). Invisible to customers — applied silently.

---

### `modifier_groups`

A named group of options attached to a menu item — "Spice Level", "Size", "Add-ons". Defines selection rules.

| Column | Purpose |
|--------|---------|
| `branch_id` | Each branch owns its modifier groups independently |
| `is_required` | Must the customer choose at least one? |
| `min_select` | Minimum options to select |
| `max_select` | Maximum options to select (1 = radio button, >1 = checkboxes) |

**UI visibility:** Option groups on the customer ordering screen. Managed in menu settings.

---

### `menu_item_modifier_groups`

Pure junction table — records which modifier groups are attached to which menu items. Has no columns beyond the two foreign keys (plus a composite primary key).

**Why it exists:** A menu item can have many modifier groups ("Size" + "Spice Level" + "Add-ons"), and a modifier group can be reused across many items.

**UI visibility:** Never shown directly. Makes "this item has these options" work.

---

### `modifiers`

The individual selectable options inside a modifier group — "Mild", "Hot", "Extra Cheese (+৳30)", "No Onions (-৳0)".

| Column | Purpose |
|--------|---------|
| `group_id` | Parent modifier group |
| `price_adjustment` | Added to item price when selected (can be negative) |
| `sort_order` | Display order within the group |
| `is_available` | Toggle off without deleting |

**UI visibility:** The radio buttons / checkboxes the customer sees when customizing an item.

---

## Layer 6 — Operations

### `sessions`

Represents a group of guests occupying a table. Opened when the table becomes occupied, closed when guests leave and pay. All orders during a visit are attached to this session.

| Column | Purpose |
|--------|---------|
| `branch_id` | Denormalized from `table → branch` — avoids a join on every kitchen/waiter query |
| `table_id` | Which physical table |
| `table_class_id` | Snapshot of the class at session start (class changes don't affect in-progress sessions) |
| `guest_name` | Optional — for reservation-linked sessions |
| `started_at / ended_at` | Session duration |
| `is_active` | True while guests are seated |

**UI visibility:** Waiter dashboard ("Table 7 · Active · 3 orders"). Mostly internal — staff interact with orders, not sessions directly.

---

### `order_counters`

One row per branch. Its sole job is generating sequential, human-readable order numbers atomically.

The API runs:
```sql
UPDATE order_counters
SET current_value = current_value + 1
WHERE branch_id = $1
RETURNING start_from + current_value AS order_number
```

| Column | Purpose |
|--------|---------|
| `branch_id` | PK — one counter per branch |
| `start_from` | First order number = `start_from + 1` (default 1000 → first order is #1001) |
| `current_value` | Incremented atomically on every new order |

**UI visibility:** Never shown. The *result* (order number) appears on KDS tickets and receipts.
**Why not use `orders.id`?** `id` is a global bigserial that increments across all orgs. Order #84,291 on a busy day is bad UX. Branch-scoped #1042 is meaningful to staff.

---

### `orders`

One order per round of ordering. A session can have multiple orders (guests order drinks first, then food). Stores the full financial breakdown.

| Column | Purpose |
|--------|---------|
| `branch_id` | Denormalized — fast branch-scoped filtering without joining through sessions |
| `session_id` | Which table visit this belongs to |
| `order_number` | Human-readable number derived from `order_counters` (e.g. "1042") |
| `status` | `placed` → `confirmed` → `preparing` → `ready` → `served` → `cancelled` |
| `subtotal` | Sum of all line items before charges |
| `tax_amount` | Calculated from org's `tax_rate` |
| `service_charge` | Calculated from org's `service_charge_rate` |
| `discount_amount` | Any applied discount |
| `total` | Final amount due |
| `created_by` | `customer` (self-order via QR) or `waiter` (placed by staff) |
| `waiter_id` | Which staff member placed the order (if `created_by = waiter`) |

**Unique constraint:** `(branch_id, order_number)` — same number can exist across branches, never within one.

**UI visibility:** KDS main view, waiter dashboard, order history, receipt.

---

### `order_items`

Each individual dish on an order. The unit price is frozen at order time — future menu price changes don't alter historical orders.

| Column | Purpose |
|--------|---------|
| `order_id` | Parent order |
| `menu_item_id` | Which dish (reference — not a snapshot of the name) |
| `quantity` | How many |
| `unit_price` | Price at time of order (frozen snapshot) |
| `modifiers` | JSONB array of `OrderModifierSnapshot` — full snapshot of selected options including names and prices at order time |
| `special_instructions` | Free-text note ("no onions", "extra crispy") |
| `status` | `queued` → `preparing` → `ready` → `served` |
| `station` | Which kitchen station handles this item — overrides the menu item's default if set |

**UI visibility:** Item list on KDS cards (staff tap to advance status), order detail view.
**Why snapshot `modifiers` as JSONB?** If you later rename "Extra Hot" to "Fiery" or change its price, old orders must still display and calculate correctly.

---

## Layer 7 — Reservations

### `reservations`

A future booking. A customer calls ahead or books online; staff log the details.

| Column | Purpose |
|--------|---------|
| `branch_id` | Which location |
| `table_id` | Optional — assign a specific table, or leave null for host to decide on arrival |
| `preferred_class_id` | Customer's preferred table class ("we'd like a VIP table") |
| `customer_name / phone` | Contact details |
| `party_size` | For table assignment decisions |
| `date / time_slot` | When |
| `duration_min` | Expected length of visit (default 90 min) — used to block the time slot |
| `status` | `pending` → `confirmed` → `seated` → `completed` / `no_show` / `cancelled` |
| `special_requests` | Free-text — "birthday cake", "wheelchair accessible" |

**UI visibility:** Reservation management page for staff, potentially a public booking widget for customers.

---

## Layer 8 — Future Tables *(schema exists, not active in MVP)*

---

### `payments`

Will record how a session was paid. Supports split bills (multiple payment rows per session).

| Column | Purpose |
|--------|---------|
| `session_id` | Which session is being paid |
| `method` | `cash` / `bkash` / `nagad` / `card` |
| `gateway_ref` | Transaction ID from the payment gateway |
| `amount` | Amount paid via this method |
| `tip_amount` | Optional tip |
| `status` | `pending` → `completed` / `refunded` / `failed` |

**Future UI:** Cashier payment screen, session summary receipt.

---

### `feedback`

Post-meal rating and comment from the customer.

| Column | Purpose |
|--------|---------|
| `session_id` | Linked to the completed session |
| `rating` | 1–5 stars (check constraint enforced at DB level) |
| `comment` | Optional free-text |

**Future UI:** Post-meal survey screen, analytics dashboard showing average rating per branch.

---

### `waiter_calls`

Logged when a customer taps "Call Waiter" from their table's self-order screen.

| Column | Purpose |
|--------|---------|
| `session_id` | Which table is calling |
| `reason` | `water` / `napkins` / `assistance` / `bill` / `other` |
| `status` | `pending` → `acknowledged` → `resolved` |
| `acknowledged_at` | When a waiter tapped "on my way" |

**Future UI:** Live notification feed on the waiter app.

---

### `audit_logs`

An append-only record of every write action in the system. Never updated, never deleted.

| Column | Purpose |
|--------|---------|
| `organization_id` | Which org |
| `branch_id` | Which branch the action affected (null for org-level actions) |
| `user_id` | Who performed the action |
| `action` | Verb string — `menu_item.update`, `table.status_change`, `modifier.create` |
| `entity_type` | Table name — `menu_items`, `orders`, `tables` |
| `entity_id` | The specific row that was changed |
| `old_value` | JSONB snapshot before the change |
| `new_value` | JSONB snapshot after the change |

**Example row:**
```
action:      "menu_item.update"
entity_type: "menu_items"
entity_id:   42
old_value:   { "base_price": "250.00" }
new_value:   { "base_price": "280.00" }
user_id:     7   (Manager Rafi)
branch_id:   3   (Gulshan branch)
```

**Future UI:** Admin audit trail page ("Activity Log").
**Why important:** Compliance, debugging, dispute resolution ("who changed this price and when?").

---

## Column Naming Conventions

| Pattern | Meaning |
|---------|---------|
| `*_id` | Foreign key to another table |
| `is_*` | Boolean flag (`is_active`, `is_available`, `is_default`) |
| `*_at` | Timestamp (`created_at`, `started_at`, `cancelled_at`) |
| `*_min` | Duration in minutes (`prep_time_min`, `duration_min`) |
| `sort_order` | Integer controlling display order in the UI |
| `base_price` | Pre-tax, pre-multiplier price stored as `numeric(10,2)` |
| `*_amount` | Calculated monetary value stored as `numeric(10,2)` |

## Delete Behavior Reference

| Relationship | On parent delete |
|-------------|-----------------|
| org → branches | `CASCADE` — deleting an org wipes everything |
| branch → tables | `CASCADE` |
| branch → menu_categories | `CASCADE` |
| session → orders | `RESTRICT` — cannot delete a session with orders |
| order → order_items | `CASCADE` |
| menu_item → order_items | `RESTRICT` — preserves order history |
| user → organization_members | `CASCADE` |
| user → orders (waiter_id) | `SET NULL` — order history preserved, just loses waiter attribution |
