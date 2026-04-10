import { Hono } from 'hono'
import { count, sum, eq, and, inArray, desc } from 'drizzle-orm'
import { db } from '../../db.js'
import { organizations, subscriptionPlans, subscriptions, branches, users } from '@dineflow/db'
import { requireOverlordAuth } from '../../middleware/overlord-auth.js'

export const overlordStatsRoutes = new Hono()
  .use('*', requireOverlordAuth)
  .get('/', async (c) => {
    const [[{ totalOrgs }], [{ activeOrgs }], [{ totalUsers }], [{ activeSubs }], [{ trialOrgs }]] =
      await Promise.all([
        db.select({ totalOrgs:  count() }).from(organizations),
        db.select({ activeOrgs: count() }).from(organizations).where(eq(organizations.isActive, true)),
        db.select({ totalUsers: count() }).from(users),
        db.select({ activeSubs: count() }).from(subscriptions).where(eq(subscriptions.status, 'active')),
        db.select({ trialOrgs:  count() }).from(subscriptions).where(eq(subscriptions.status, 'trialing')),
      ])

    const revenueRows = await db
      .select({ total: sum(subscriptionPlans.monthlyPrice) })
      .from(subscriptions)
      .innerJoin(subscriptionPlans, eq(subscriptions.planId, subscriptionPlans.id))
      .where(eq(subscriptions.status, 'active'))

    const monthlyRevenue = parseFloat(revenueRows[0]?.total ?? '0')

    const recentRows = await db
      .select({
        id:                 organizations.id,
        name:               organizations.name,
        slug:               organizations.slug,
        createdAt:          organizations.createdAt,
        subscriptionStatus: subscriptions.status,
        branchCount:        count(branches.id),
      })
      .from(organizations)
      .leftJoin(
        subscriptions,
        and(
          eq(subscriptions.organizationId, organizations.id),
          inArray(subscriptions.status, ['active', 'trialing']),
        ),
      )
      .leftJoin(branches, eq(branches.organizationId, organizations.id))
      .groupBy(organizations.id, subscriptions.status)
      .orderBy(desc(organizations.createdAt))
      .limit(10)

    const recentOrgs = recentRows.map((r) => ({
      id:                 r.id,
      name:               r.name,
      slug:               r.slug,
      createdAt:          r.createdAt,
      subscriptionStatus: r.subscriptionStatus ?? 'none',
      branchCount:        r.branchCount,
    }))

    return c.json({
      data: {
        totalOrgs,
        activeOrgs,
        totalUsers,
        activeSubscriptions: activeSubs,
        trialOrgs,
        monthlyRevenue,
        recentOrgs,
      },
    })
  })
