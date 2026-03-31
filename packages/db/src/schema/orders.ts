import {
  pgTable, uuid, varchar, integer, numeric, boolean,
  jsonb, timestamp, text, index
} from 'drizzle-orm/pg-core'
import { orderStatusEnum, orderItemStatusEnum, orderCreatedByEnum, kitchenStationEnum } from './enums.js'
import { tables } from './tables.js'
import { tableClasses } from './table-classes.js'
import { menuItems } from './menu.js'
import { users } from './users.js'

export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  tableId: uuid('table_id').notNull().references(() => tables.id, { onDelete: 'restrict' }),
  tableClassId: uuid('table_class_id').notNull().references(() => tableClasses.id, { onDelete: 'restrict' }),
  guestName: varchar('guest_name', { length: 255 }),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
  endedAt: timestamp('ended_at', { withTimezone: true }),
  isActive: boolean('is_active').notNull().default(true),
}, (table) => [
  index('sessions_table_id_idx').on(table.tableId),
  index('sessions_is_active_idx').on(table.isActive),
])

export const orderCounters = pgTable('order_counters', {
  id: integer('id').primaryKey().default(1),
  currentValue: integer('current_value').notNull().default(0),
})

export const orders = pgTable('orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').notNull().references(() => sessions.id, { onDelete: 'restrict' }),
  orderNumber: varchar('order_number', { length: 20 }).notNull(),
  status: orderStatusEnum('status').notNull().default('placed'),
  subtotal: numeric('subtotal', { precision: 10, scale: 2 }).notNull(),
  taxAmount: numeric('tax_amount', { precision: 10, scale: 2 }).notNull().default('0'),
  serviceCharge: numeric('service_charge', { precision: 10, scale: 2 }).notNull().default('0'),
  discountAmount: numeric('discount_amount', { precision: 10, scale: 2 }).notNull().default('0'),
  total: numeric('total', { precision: 10, scale: 2 }).notNull(),
  notes: text('notes'),
  createdBy: orderCreatedByEnum('created_by').notNull().default('customer'),
  waiterId: uuid('waiter_id').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('orders_session_id_idx').on(table.sessionId),
  index('orders_status_created_at_idx').on(table.status, table.createdAt),
  index('orders_waiter_id_idx').on(table.waiterId),
])

export const orderItems = pgTable('order_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  menuItemId: uuid('menu_item_id').notNull().references(() => menuItems.id, { onDelete: 'restrict' }),
  quantity: integer('quantity').notNull().default(1),
  unitPrice: numeric('unit_price', { precision: 10, scale: 2 }).notNull(),
  modifiers: jsonb('modifiers').notNull().default([]),
  specialInstructions: text('special_instructions'),
  status: orderItemStatusEnum('status').notNull().default('queued'),
  station: kitchenStationEnum('station'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('order_items_order_id_idx').on(table.orderId),
  index('order_items_menu_item_id_idx').on(table.menuItemId),
])
