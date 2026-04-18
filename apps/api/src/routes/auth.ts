import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { eq, asc } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { setCookie, deleteCookie } from 'hono/cookie'
import { db } from '../db.js'
import { users, organizationMembers, organizations, subscriptionPlans, subscriptions } from '@dineflow/db'
import { loginSchema, registerSchema } from '@dineflow/shared'
import { createSessionToken, invalidateSession, requireAuth } from '../middleware/auth.js'
import { UnauthorizedError, ConflictError } from '../middleware/errors.js'

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

const TRIAL_DAYS = 30

export const authRoutes = new Hono()
  .post('/register', zValidator('json', registerSchema), async (c) => {
    const { orgName, name, email, password, currency, timezone } = c.req.valid('json')

    const existing = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase()),
    })
    if (existing) throw new ConflictError('An account with this email already exists')

    // Pick the cheapest active plan for the trial subscription (optional)
    const plan = await db.query.subscriptionPlans.findFirst({
      where: eq(subscriptionPlans.isActive, true),
      orderBy: [asc(subscriptionPlans.sortOrder), asc(subscriptionPlans.id)],
    })

    const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000)

    // Generate a unique slug
    const baseSlug = slugify(orgName) || 'org'
    const suffix = Math.random().toString(36).slice(2, 7)
    const slug = `${baseSlug}-${suffix}`

    const passwordHash = await bcrypt.hash(password, 10)

    const result = await db.transaction(async (tx) => {
      const [org] = await tx
        .insert(organizations)
        .values({ name: orgName, slug, currency, timezone, trialEndsAt })
        .returning()

      const [user] = await tx
        .insert(users)
        .values({ email: email.toLowerCase(), passwordHash, name })
        .returning()

      await tx.insert(organizationMembers).values({
        organizationId: org.id,
        userId: user.id,
        role: 'owner',
        joinedAt: new Date(),
      })

      if (plan) {
        await tx.insert(subscriptions).values({
          organizationId: org.id,
          planId: plan.id,
          status: 'trialing',
          currentPeriodStart: new Date(),
          currentPeriodEnd: trialEndsAt,
        })
      }

      return { org, user }
    })

    const token = await createSessionToken(result.user.id)
    const isSecure = (c.env as Record<string, string> | undefined)?.NODE_ENV === 'production'

    setCookie(c, 'dineflow_session', token, {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'Lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    })

    return c.json({
      data: {
        token,
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
          role: 'owner',
          staffType: null,
          branchId: null,
          organizationId: result.org.id,
        },
        organization: {
          id: result.org.id,
          name: result.org.name,
          slug: result.org.slug,
          trialEndsAt: result.org.trialEndsAt,
        },
      },
    }, 201)
  })
  .post('/login', zValidator('json', loginSchema), async (c) => {
    const { email, password } = c.req.valid('json')

    const user = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase()),
    })

    if (!user || !user.isActive) {
      throw new UnauthorizedError('Invalid email or password')
    }

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) {
      throw new UnauthorizedError('Invalid email or password')
    }

    // Get role/branch from their most recent active organization membership
    const membership = await db.query.organizationMembers.findFirst({
      where: eq(organizationMembers.userId, user.id),
      orderBy: (m, { desc }) => [desc(m.createdAt)],
    })

    const token = await createSessionToken(user.id)
    const isSecure = (c.env as Record<string, string> | undefined)?.NODE_ENV === 'production'

    setCookie(c, 'dineflow_session', token, {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'Lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    })

    return c.json({
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: membership?.role ?? 'staff',
          staffType: membership?.staffType ?? null,
          branchId: membership?.branchId ?? null,
          organizationId: membership?.organizationId ?? null,
        },
      },
    })
  })
  .post('/logout', requireAuth, async (c) => {
    const token = c.get('sessionToken')
    invalidateSession(token)
    deleteCookie(c, 'dineflow_session')
    return c.json({ data: { success: true } })
  })
  .get('/me', requireAuth, async (c) => {
    const user = c.get('user')
    return c.json({ data: user })
  })
