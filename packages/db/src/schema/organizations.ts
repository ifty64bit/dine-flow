import {
  pgTable,
  bigserial,
  bigint,
  varchar,
  numeric,
  integer,
  boolean,
  jsonb,
  timestamp,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { subscriptionStatusEnum } from './enums.js'

export const organizations = pgTable('organizations', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  logoUrl: varchar('logo_url', { length: 500 }),
  currency: varchar('currency', { length: 10 }).notNull().default('BDT'),
  timezone: varchar('timezone', { length: 100 }).notNull().default('Asia/Dhaka'),
  taxRate: numeric('tax_rate', { precision: 5, scale: 2 }).notNull().default('0'),
  serviceChargeRate: numeric('service_charge_rate', { precision: 5, scale: 2 }).notNull().default('0'),
  taxInclusive: boolean('tax_inclusive').notNull().default(true),
  branding: jsonb('branding').notNull().default({}),
  isActive: boolean('is_active').notNull().default(true),
  trialEndsAt: timestamp('trial_ends_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const subscriptionPlans = pgTable('subscription_plans', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  slug: varchar('slug', { length: 50 }).notNull().unique(),
  monthlyPrice: numeric('monthly_price', { precision: 10, scale: 2 }).notNull().default('0'),
  maxBranches: integer('max_branches').notNull().default(1),
  maxUsersPerBranch: integer('max_users_per_branch').notNull().default(5),
  maxTablesPerBranch: integer('max_tables_per_branch').notNull().default(20),
  features: jsonb('features').notNull().default([]),
  isActive: boolean('is_active').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const subscriptions = pgTable('subscriptions', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  organizationId: bigint('organization_id', { mode: 'number' }).notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  planId: bigint('plan_id', { mode: 'number' }).notNull().references(() => subscriptionPlans.id, { onDelete: 'restrict' }),
  status: subscriptionStatusEnum('status').notNull().default('trialing'),
  currentPeriodStart: timestamp('current_period_start', { withTimezone: true }).notNull().defaultNow(),
  currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }),
  cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  // Fix #6: only one active/trialing subscription per org at a time
  uniqueIndex('one_active_sub_per_org')
    .on(table.organizationId)
    .where(sql`${table.status} IN ('active', 'trialing')`),
  index('subscriptions_org_id_idx').on(table.organizationId),
])
