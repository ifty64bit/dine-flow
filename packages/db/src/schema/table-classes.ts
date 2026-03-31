import { pgTable, uuid, varchar, numeric, integer, boolean, timestamp } from 'drizzle-orm/pg-core'

export const tableClasses = pgTable('table_classes', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  description: varchar('description', { length: 500 }),
  badgeColor: varchar('badge_color', { length: 20 }).notNull().default('#6B7280'),
  priceMultiplier: numeric('price_multiplier', { precision: 4, scale: 2 }).notNull().default('1.00'),
  sortOrder: integer('sort_order').notNull().default(0),
  isDefault: boolean('is_default').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
