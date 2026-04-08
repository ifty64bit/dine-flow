import { pgTable, bigserial, bigint, varchar, boolean, jsonb, timestamp, index } from 'drizzle-orm/pg-core'
import { organizations } from './organizations.js'

export const branches = pgTable('branches', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  organizationId: bigint('organization_id', { mode: 'number' }).notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  address: varchar('address', { length: 500 }),
  phone: varchar('phone', { length: 50 }),
  operatingHours: jsonb('operating_hours').notNull().default({}),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('branches_org_id_idx').on(table.organizationId),
])
