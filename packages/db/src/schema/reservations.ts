import { pgTable, bigserial, bigint, varchar, integer, date, time, timestamp, index } from 'drizzle-orm/pg-core'
import { reservationStatusEnum } from './enums.js'
import { branches } from './branches.js'
import { tables } from './tables.js'
import { tableClasses } from './table-classes.js'

export const reservations = pgTable('reservations', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  branchId: bigint('branch_id', { mode: 'number' }).notNull().references(() => branches.id, { onDelete: 'cascade' }),
  tableId: bigint('table_id', { mode: 'number' }).references(() => tables.id, { onDelete: 'set null' }),
  preferredClassId: bigint('preferred_class_id', { mode: 'number' }).references(() => tableClasses.id, { onDelete: 'set null' }),
  customerName: varchar('customer_name', { length: 255 }).notNull(),
  customerPhone: varchar('customer_phone', { length: 50 }).notNull(),
  partySize: integer('party_size').notNull(),
  date: date('date').notNull(),
  timeSlot: time('time_slot').notNull(),
  durationMin: integer('duration_min').notNull().default(90),
  status: reservationStatusEnum('status').notNull().default('pending'),
  specialRequests: varchar('special_requests', { length: 1000 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('reservations_branch_date_idx').on(table.branchId, table.date),
  index('reservations_table_id_idx').on(table.tableId),
  index('reservations_preferred_class_id_idx').on(table.preferredClassId),
])
