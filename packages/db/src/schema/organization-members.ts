import { pgTable, bigserial, bigint, boolean, timestamp, unique, index } from 'drizzle-orm/pg-core'
import { orgMemberRoleEnum, staffTypeEnum } from './enums.js'
import { organizations } from './organizations.js'
import { branches } from './branches.js'
import { users } from './users.js'

export const organizationMembers = pgTable('organization_members', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  organizationId: bigint('organization_id', { mode: 'number' }).notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  userId: bigint('user_id', { mode: 'number' }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: orgMemberRoleEnum('role').notNull().default('staff'),
  staffType: staffTypeEnum('staff_type'),
  // null = org-wide access (owner/admin); set = scoped to one branch (manager/staff)
  branchId: bigint('branch_id', { mode: 'number' }).references(() => branches.id, { onDelete: 'cascade' }),
  isActive: boolean('is_active').notNull().default(true),
  joinedAt: timestamp('joined_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique('org_members_org_user_unique').on(table.organizationId, table.userId),
  index('org_members_org_id_idx').on(table.organizationId),
  index('org_members_user_id_idx').on(table.userId),
  index('org_members_branch_id_idx').on(table.branchId),
])
