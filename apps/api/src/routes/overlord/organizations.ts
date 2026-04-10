import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { eq, and, inArray, desc, asc, count } from 'drizzle-orm'
import { db } from '../../db.js'
import {
  organizations,
  subscriptions,
  subscriptionPlans,
  branches,
  organizationMembers,
  users,
} from '@dineflow/db'
import { requireOverlordAuth } from '../../middleware/overlord-auth.js'
import { NotFoundError } from '../../middleware/errors.js'

const updateStatusSchema    = z.object({ isActive: z.boolean() })
const changeSubStatusSchema = z.object({
  status: z.enum(['active', 'trialing', 'past_due', 'cancelled', 'paused']),
})

export const overlordOrgRoutes = new Hono()
  .use('*', requireOverlordAuth)

  // ── List ───────────────────────────────────────────────────────────────────
  .get('/', async (c) => {
    const rows = await db
      .select({
        id:                 organizations.id,
        name:               organizations.name,
        slug:               organizations.slug,
        currency:           organizations.currency,
        isActive:           organizations.isActive,
        trialEndsAt:        organizations.trialEndsAt,
        createdAt:          organizations.createdAt,
        branchCount:        count(branches.id),
        subscriptionStatus: subscriptions.status,
        planName:           subscriptionPlans.name,
      })
      .from(organizations)
      .leftJoin(
        subscriptions,
        and(
          eq(subscriptions.organizationId, organizations.id),
          inArray(subscriptions.status, ['active', 'trialing']),
        ),
      )
      .leftJoin(subscriptionPlans, eq(subscriptionPlans.id, subscriptions.planId))
      .leftJoin(branches, eq(branches.organizationId, organizations.id))
      .groupBy(organizations.id, subscriptions.status, subscriptionPlans.name)
      .orderBy(desc(organizations.createdAt))

    // memberCount via separate query to avoid cross-join inflation
    const memberCounts = await db
      .select({ orgId: organizationMembers.organizationId, cnt: count() })
      .from(organizationMembers)
      .groupBy(organizationMembers.organizationId)

    const memberMap = new Map(memberCounts.map((r) => [r.orgId, r.cnt]))

    const data = rows.map((r) => ({
      id:           r.id,
      name:         r.name,
      slug:         r.slug,
      currency:     r.currency,
      isActive:     r.isActive,
      trialEndsAt:  r.trialEndsAt,
      createdAt:    r.createdAt,
      branchCount:  r.branchCount,
      memberCount:  memberMap.get(r.id) ?? 0,
      subscription: r.subscriptionStatus
        ? { status: r.subscriptionStatus, planName: r.planName ?? '' }
        : null,
    }))

    return c.json({ data })
  })

  // ── Detail ─────────────────────────────────────────────────────────────────
  .get('/:id', async (c) => {
    const id = Number(c.req.param('id'))

    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, id),
    })
    if (!org) throw new NotFoundError('Organization')

    const [activeSub] = await db
      .select({
        id:                 subscriptions.id,
        status:             subscriptions.status,
        planName:           subscriptionPlans.name,
        monthlyPrice:       subscriptionPlans.monthlyPrice,
        currentPeriodStart: subscriptions.currentPeriodStart,
        currentPeriodEnd:   subscriptions.currentPeriodEnd,
        cancelledAt:        subscriptions.cancelledAt,
      })
      .from(subscriptions)
      .innerJoin(subscriptionPlans, eq(subscriptionPlans.id, subscriptions.planId))
      .where(
        and(
          eq(subscriptions.organizationId, id),
          inArray(subscriptions.status, ['active', 'trialing', 'past_due', 'paused']),
        ),
      )
      .orderBy(desc(subscriptions.createdAt))
      .limit(1)

    const branchRows = await db
      .select({
        id:          branches.id,
        name:        branches.name,
        address:     branches.address,
        isActive:    branches.isActive,
        memberCount: count(organizationMembers.id),
      })
      .from(branches)
      .leftJoin(organizationMembers, eq(organizationMembers.branchId, branches.id))
      .where(eq(branches.organizationId, id))
      .groupBy(branches.id)
      .orderBy(asc(branches.name))

    const memberRows = await db
      .select({
        id:         users.id,
        name:       users.name,
        email:      users.email,
        role:       organizationMembers.role,
        joinedAt:   organizationMembers.joinedAt,
        branchName: branches.name,
      })
      .from(organizationMembers)
      .innerJoin(users, eq(users.id, organizationMembers.userId))
      .leftJoin(branches, eq(branches.id, organizationMembers.branchId))
      .where(eq(organizationMembers.organizationId, id))
      .orderBy(asc(users.name))

    return c.json({
      data: {
        id:                org.id,
        name:              org.name,
        slug:              org.slug,
        currency:          org.currency,
        timezone:          org.timezone,
        taxRate:           org.taxRate,
        serviceChargeRate: org.serviceChargeRate,
        taxInclusive:      org.taxInclusive,
        isActive:          org.isActive,
        trialEndsAt:       org.trialEndsAt,
        createdAt:         org.createdAt,
        updatedAt:         org.updatedAt,
        subscription:      activeSub ?? null,
        branches:          branchRows.map((b) => ({
          id:          b.id,
          name:        b.name,
          address:     b.address,
          isActive:    b.isActive,
          tableCount:  0,
          memberCount: b.memberCount,
        })),
        members: memberRows,
      },
    })
  })

  // ── Toggle active ──────────────────────────────────────────────────────────
  .patch('/:id/status', zValidator('json', updateStatusSchema), async (c) => {
    const id       = Number(c.req.param('id'))
    const { isActive } = c.req.valid('json')

    const [org] = await db
      .update(organizations)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(organizations.id, id))
      .returning({ id: organizations.id, isActive: organizations.isActive })

    if (!org) throw new NotFoundError('Organization')
    return c.json({ data: org })
  })

  // ── Change subscription status ─────────────────────────────────────────────
  .patch('/:id/subscription', zValidator('json', changeSubStatusSchema), async (c) => {
    const id       = Number(c.req.param('id'))
    const { status } = c.req.valid('json')

    const [sub] = await db
      .update(subscriptions)
      .set({
        status,
        cancelledAt: status === 'cancelled' ? new Date() : null,
        updatedAt:   new Date(),
      })
      .where(
        and(
          eq(subscriptions.organizationId, id),
          inArray(subscriptions.status, ['active', 'trialing', 'past_due', 'paused', 'cancelled']),
        ),
      )
      .returning({ id: subscriptions.id, status: subscriptions.status })

    if (!sub) throw new NotFoundError('Subscription')
    return c.json({ data: sub })
  })
