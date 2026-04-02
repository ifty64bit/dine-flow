// FUTURE: not used in MVP — placeholder tables for payment, feedback, waiter calls, and audit logging features

import { pgTable, bigserial, bigint, numeric, varchar, integer, timestamp, text, jsonb, check, index } from 'drizzle-orm/pg-core'
import { paymentMethodEnum, paymentStatusEnum, waiterCallReasonEnum, waiterCallStatusEnum } from './enums.js'
import { sessions } from './orders.js'
import { users } from './users.js'
import { sql } from 'drizzle-orm'

// FUTURE: not used in MVP
export const payments = pgTable('payments', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  sessionId: bigint('session_id', { mode: 'number' }).notNull().references(() => sessions.id, { onDelete: 'restrict' }),
  method: paymentMethodEnum('method').notNull(),
  gatewayRef: varchar('gateway_ref', { length: 255 }),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  tipAmount: numeric('tip_amount', { precision: 10, scale: 2 }).notNull().default('0'),
  status: paymentStatusEnum('status').notNull().default('pending'),
  paidAt: timestamp('paid_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('payments_session_id_idx').on(table.sessionId),
])

// FUTURE: not used in MVP
export const feedback = pgTable('feedback', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  sessionId: bigint('session_id', { mode: 'number' }).notNull().references(() => sessions.id, { onDelete: 'cascade' }),
  rating: integer('rating').notNull(),
  comment: text('comment'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('feedback_session_id_idx').on(table.sessionId),
  check('feedback_rating_check', sql`${table.rating} >= 1 AND ${table.rating} <= 5`),
])

// FUTURE: not used in MVP
export const waiterCalls = pgTable('waiter_calls', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  sessionId: bigint('session_id', { mode: 'number' }).notNull().references(() => sessions.id, { onDelete: 'cascade' }),
  reason: waiterCallReasonEnum('reason').notNull(),
  status: waiterCallStatusEnum('status').notNull().default('pending'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  acknowledgedAt: timestamp('acknowledged_at', { withTimezone: true }),
}, (table) => [
  index('waiter_calls_session_id_idx').on(table.sessionId),
])

// FUTURE: not used in MVP
export const auditLogs = pgTable('audit_logs', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  userId: bigint('user_id', { mode: 'number' }).references(() => users.id, { onDelete: 'set null' }),
  action: varchar('action', { length: 100 }).notNull(),
  entityType: varchar('entity_type', { length: 100 }),
  entityId: bigint('entity_id', { mode: 'number' }),
  oldValue: jsonb('old_value'),
  newValue: jsonb('new_value'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('audit_logs_entity_idx').on(table.entityType, table.entityId),
  index('audit_logs_user_id_idx').on(table.userId),
  index('audit_logs_created_at_idx').on(table.createdAt),
])
