import {
  pgTable,
  bigserial,
  bigint,
  varchar,
  integer,
  numeric,
  boolean,
  jsonb,
  timestamp,
  text,
  index,
  unique,
} from 'drizzle-orm/pg-core'
import {
  orderStatusEnum,
  orderItemStatusEnum,
  orderCreatedByEnum,
  kitchenStationEnum,
} from './enums.js'
import { branches } from './branches.js'
import { tables } from './tables.js'
import { tableClasses } from './table-classes.js'
import { menuItems } from './menu.js'
import { users } from './users.js'

export const sessions = pgTable(
  'sessions',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    // Denormalized for branch-scoped queries (avoids session→table→branch join on hot paths)
    branchId: bigint('branch_id', { mode: 'number' })
      .notNull()
      .references(() => branches.id, { onDelete: 'restrict' }),
    tableId: bigint('table_id', { mode: 'number' })
      .notNull()
      .references(() => tables.id, { onDelete: 'restrict' }),
    tableClassId: bigint('table_class_id', { mode: 'number' })
      .notNull()
      .references(() => tableClasses.id, { onDelete: 'restrict' }),
    guestName: varchar('guest_name', { length: 255 }),
    startedAt: timestamp('started_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    endedAt: timestamp('ended_at', { withTimezone: true }),
    isActive: boolean('is_active').notNull().default(true),
  },
  (table) => [
    index('sessions_branch_id_idx').on(table.branchId),
    index('sessions_branch_active_idx').on(table.branchId, table.isActive),
    index('sessions_table_id_idx').on(table.tableId),
  ]
)

// One counter row per branch — PK is branchId
// Actual order number = startFrom + currentValue  (e.g. startFrom=1000, currentValue=0 → first order is #1001)
export const orderCounters = pgTable('order_counters', {
  branchId: bigint('branch_id', { mode: 'number' })
    .primaryKey()
    .references(() => branches.id, { onDelete: 'cascade' }),
  startFrom: integer('start_from').notNull().default(1000),
  currentValue: integer('current_value').notNull().default(0),
})

export const orders = pgTable(
  'orders',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    // Denormalized for branch-scoped queries and unique order number per branch
    branchId: bigint('branch_id', { mode: 'number' })
      .notNull()
      .references(() => branches.id, { onDelete: 'restrict' }),
    sessionId: bigint('session_id', { mode: 'number' })
      .notNull()
      .references(() => sessions.id, { onDelete: 'restrict' }),
    // orderNumber will derive from orderCounters but we store it here for easy querying and uniqueness constraint
    orderNumber: varchar('order_number', { length: 20 }).notNull(),
    status: orderStatusEnum('status').notNull().default('placed'),
    subtotal: numeric('subtotal', { precision: 10, scale: 2 }).notNull(),
    taxAmount: numeric('tax_amount', { precision: 10, scale: 2 })
      .notNull()
      .default('0'),
    serviceCharge: numeric('service_charge', { precision: 10, scale: 2 })
      .notNull()
      .default('0'),
    discountAmount: numeric('discount_amount', { precision: 10, scale: 2 })
      .notNull()
      .default('0'),
    total: numeric('total', { precision: 10, scale: 2 }).notNull(),
    notes: text('notes'),
    createdBy: orderCreatedByEnum('created_by').notNull().default('customer'),
    waiterId: bigint('waiter_id', { mode: 'number' }).references(
      () => users.id,
      { onDelete: 'set null' }
    ),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique('orders_branch_order_number_unique').on(
      table.branchId,
      table.orderNumber
    ),
    index('orders_branch_id_idx').on(table.branchId),
    index('orders_session_id_idx').on(table.sessionId),
    index('orders_status_created_at_idx').on(table.status, table.createdAt),
    index('orders_waiter_id_idx').on(table.waiterId),
  ]
)

export const orderItems = pgTable(
  'order_items',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    orderId: bigint('order_id', { mode: 'number' })
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    menuItemId: bigint('menu_item_id', { mode: 'number' })
      .notNull()
      .references(() => menuItems.id, { onDelete: 'restrict' }),
    quantity: integer('quantity').notNull().default(1),
    unitPrice: numeric('unit_price', { precision: 10, scale: 2 }).notNull(),
    modifiers: jsonb('modifiers').notNull().default([]),
    specialInstructions: text('special_instructions'),
    status: orderItemStatusEnum('status').notNull().default('queued'),
    station: kitchenStationEnum('station'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('order_items_order_id_idx').on(table.orderId),
    index('order_items_menu_item_id_idx').on(table.menuItemId),
  ]
)
