import { pgTable, bigserial, bigint, integer, numeric, varchar, timestamp, unique, index } from 'drizzle-orm/pg-core'
import { tableStatusEnum, tableShapeEnum } from './enums.js'
import { floors } from './floors.js'
import { tableClasses } from './table-classes.js'

export const tables = pgTable('tables', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  floorId: bigint('floor_id', { mode: 'number' }).notNull().references(() => floors.id, { onDelete: 'cascade' }),
  tableClassId: bigint('table_class_id', { mode: 'number' }).notNull().references(() => tableClasses.id, { onDelete: 'restrict' }),
  number: integer('number').notNull(),
  capacity: integer('capacity').notNull().default(4),
  shape: tableShapeEnum('shape').notNull().default('square'),
  positionX: numeric('position_x', { precision: 6, scale: 2 }).notNull().default('0'),
  positionY: numeric('position_y', { precision: 6, scale: 2 }).notNull().default('0'),
  status: tableStatusEnum('status').notNull().default('vacant'),
  qrCodeUrl: varchar('qr_code_url', { length: 500 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique('tables_floor_number_unique').on(table.floorId, table.number),
  index('tables_floor_id_idx').on(table.floorId),
  index('tables_table_class_id_idx').on(table.tableClassId),
])
