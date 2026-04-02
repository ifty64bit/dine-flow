import { pgTable, bigserial, bigint, varchar, boolean, timestamp } from 'drizzle-orm/pg-core'
import { userRoleEnum, staffTypeEnum } from './enums.js'
import { branches } from './branches.js'

export const users = pgTable('users', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  role: userRoleEnum('role').notNull().default('staff'),
  staffType: staffTypeEnum('staff_type'),
  branchId: bigint('branch_id', { mode: 'number' }).references(() => branches.id, { onDelete: 'set null' }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})
