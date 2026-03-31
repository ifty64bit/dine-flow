import { pgTable, uuid, varchar, boolean, jsonb, timestamp } from 'drizzle-orm/pg-core'

export const branches = pgTable('branches', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  address: varchar('address', { length: 500 }),
  phone: varchar('phone', { length: 50 }),
  operatingHours: jsonb('operating_hours').notNull().default({}),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})
