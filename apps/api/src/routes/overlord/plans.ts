import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { eq, asc, count, inArray, and } from 'drizzle-orm'
import { db } from '../../db.js'
import { subscriptionPlans, subscriptions } from '@dineflow/db'
import { requireOverlordAuth } from '../../middleware/overlord-auth.js'
import { NotFoundError } from '../../middleware/errors.js'

const planBodySchema = z.object({
  name:               z.string().min(1),
  slug:               z.string().regex(/^[a-z0-9-]+$/),
  monthlyPrice:       z.string().regex(/^\d+(\.\d{1,2})?$/),
  maxBranches:        z.number().int().min(1),
  maxUsersPerBranch:  z.number().int().min(1),
  maxTablesPerBranch: z.number().int().min(1),
  features:           z.array(z.string()).default([]),
  sortOrder:          z.number().int().default(0),
  isActive:           z.boolean().default(true),
})

const statusSchema = z.object({ isActive: z.boolean() })

export const overlordPlanRoutes = new Hono()
  .use('*', requireOverlordAuth)

  // ── List ───────────────────────────────────────────────────────────────────
  .get('/', async (c) => {
    const plans = await db
      .select({
        id:                 subscriptionPlans.id,
        name:               subscriptionPlans.name,
        slug:               subscriptionPlans.slug,
        monthlyPrice:       subscriptionPlans.monthlyPrice,
        maxBranches:        subscriptionPlans.maxBranches,
        maxUsersPerBranch:  subscriptionPlans.maxUsersPerBranch,
        maxTablesPerBranch: subscriptionPlans.maxTablesPerBranch,
        features:           subscriptionPlans.features,
        isActive:           subscriptionPlans.isActive,
        sortOrder:          subscriptionPlans.sortOrder,
        subscriberCount:    count(subscriptions.id),
      })
      .from(subscriptionPlans)
      .leftJoin(
        subscriptions,
        and(
          eq(subscriptions.planId, subscriptionPlans.id),
          inArray(subscriptions.status, ['active', 'trialing']),
        ),
      )
      .groupBy(subscriptionPlans.id)
      .orderBy(asc(subscriptionPlans.sortOrder))

    return c.json({
      data: plans.map((p) => ({
        ...p,
        features: (p.features as string[]) ?? [],
      })),
    })
  })

  // ── Create ─────────────────────────────────────────────────────────────────
  .post('/', zValidator('json', planBodySchema), async (c) => {
    const body = c.req.valid('json')
    const [plan] = await db.insert(subscriptionPlans).values(body).returning()
    return c.json({ data: plan }, 201)
  })

  // ── Update ─────────────────────────────────────────────────────────────────
  .put('/:id', zValidator('json', planBodySchema), async (c) => {
    const id   = Number(c.req.param('id'))
    const body = c.req.valid('json')

    const [plan] = await db
      .update(subscriptionPlans)
      .set(body)
      .where(eq(subscriptionPlans.id, id))
      .returning()

    if (!plan) throw new NotFoundError('Plan')
    return c.json({ data: plan })
  })

  // ── Toggle active ──────────────────────────────────────────────────────────
  .patch('/:id/status', zValidator('json', statusSchema), async (c) => {
    const id           = Number(c.req.param('id'))
    const { isActive } = c.req.valid('json')

    const [plan] = await db
      .update(subscriptionPlans)
      .set({ isActive })
      .where(eq(subscriptionPlans.id, id))
      .returning({ id: subscriptionPlans.id, isActive: subscriptionPlans.isActive })

    if (!plan) throw new NotFoundError('Plan')
    return c.json({ data: plan })
  })
