import { pgTable, uuid, varchar, integer, timestamp, index } from 'drizzle-orm/pg-core'
import { branches } from './branches.js'

export const floors = pgTable('floors', {
  id: uuid('id').primaryKey().defaultRandom(),
  branchId: uuid('branch_id').notNull().references(() => branches.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('floors_branch_id_idx').on(table.branchId),
])
