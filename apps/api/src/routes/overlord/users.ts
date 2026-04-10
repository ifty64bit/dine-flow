import { Hono } from 'hono'
import { eq, asc } from 'drizzle-orm'
import { db } from '../../db.js'
import { users, organizationMembers, organizations, branches } from '@dineflow/db'
import { requireOverlordAuth } from '../../middleware/overlord-auth.js'

export const overlordUserRoutes = new Hono()
  .use('*', requireOverlordAuth)
  .get('/', async (c) => {
    // Fetch all users
    const allUsers = await db
      .select({
        id:        users.id,
        name:      users.name,
        email:     users.email,
        isActive:  users.isActive,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(asc(users.name))

    // Fetch all memberships with org and branch names
    const memberships = await db
      .select({
        userId:           organizationMembers.userId,
        organizationId:   organizationMembers.organizationId,
        organizationName: organizations.name,
        role:             organizationMembers.role,
        branchName:       branches.name,
      })
      .from(organizationMembers)
      .innerJoin(organizations, eq(organizations.id, organizationMembers.organizationId))
      .leftJoin(branches, eq(branches.id, organizationMembers.branchId))
      .where(eq(organizationMembers.isActive, true))
      .orderBy(asc(organizations.name))

    // Group memberships by userId
    const membershipMap = new Map<number, typeof memberships>()
    for (const m of memberships) {
      const list = membershipMap.get(m.userId) ?? []
      list.push(m)
      membershipMap.set(m.userId, list)
    }

    const data = allUsers.map((u) => ({
      id:        u.id,
      name:      u.name,
      email:     u.email,
      isActive:  u.isActive,
      createdAt: u.createdAt,
      memberships: (membershipMap.get(u.id) ?? []).map((m) => ({
        organizationId:   m.organizationId,
        organizationName: m.organizationName,
        role:             m.role,
        branchName:       m.branchName ?? null,
      })),
    }))

    return c.json({ data })
  })
