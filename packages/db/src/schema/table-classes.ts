import { pgTable, bigserial, bigint, varchar, numeric, integer, boolean, timestamp, unique, index } from 'drizzle-orm/pg-core'
import { organizations } from './organizations.js'

export const tableClasses = pgTable('table_classes', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  organizationId: bigint('organization_id', { mode: 'number' }).notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull(),
  description: varchar('description', { length: 500 }),
  badgeColor: varchar('badge_color', { length: 20 }).notNull().default('#6B7280'),
  priceMultiplier: numeric('price_multiplier', { precision: 4, scale: 2 }).notNull().default('1.00'),
  sortOrder: integer('sort_order').notNull().default(0),
  isDefault: boolean('is_default').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique('table_classes_org_slug_unique').on(table.organizationId, table.slug),
  index('table_classes_org_id_idx').on(table.organizationId),
])
