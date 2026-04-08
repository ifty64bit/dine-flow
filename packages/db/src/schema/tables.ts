import { pgTable, bigserial, bigint, integer, numeric, varchar, timestamp, unique, index } from 'drizzle-orm/pg-core'
import { tableStatusEnum, tableShapeEnum } from './enums.js'
import { branches } from './branches.js'
import { tableClasses } from './table-classes.js'

export const tables = pgTable('tables', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  branchId: bigint('branch_id', { mode: 'number' }).notNull().references(() => branches.id, { onDelete: 'cascade' }),
  tableClassId: bigint('table_class_id', { mode: 'number' }).notNull().references(() => tableClasses.id, { onDelete: 'restrict' }),
  number: integer('number').notNull(),
  floorName: varchar('floor_name', { length: 100 }),
  capacity: integer('capacity').notNull().default(4),
  shape: tableShapeEnum('shape').notNull().default('square'),
  positionX: numeric('position_x', { precision: 6, scale: 2 }).notNull().default('0'),
  positionY: numeric('position_y', { precision: 6, scale: 2 }).notNull().default('0'),
  status: tableStatusEnum('status').notNull().default('vacant'),
  qrCodeUrl: varchar('qr_code_url', { length: 500 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique('tables_branch_number_unique').on(table.branchId, table.number),
  index('tables_branch_id_idx').on(table.branchId),
  index('tables_table_class_id_idx').on(table.tableClassId),
])
