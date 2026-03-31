import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { setCookie, deleteCookie } from 'hono/cookie'
import { db } from '../db.js'
import { users } from '@dineflow/db'
import { loginSchema } from '@dineflow/shared'
import { createSessionToken, invalidateSession, requireAuth } from '../middleware/auth.js'
import { UnauthorizedError } from '../middleware/errors.js'

export const authRoutes = new Hono()

authRoutes.post('/login', zValidator('json', loginSchema), async (c) => {
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

  const token = createSessionToken(user.id)

  setCookie(c, 'dineflow_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
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
        role: user.role,
        staffType: user.staffType,
        branchId: user.branchId,
      },
    },
  })
})

authRoutes.post('/logout', requireAuth, async (c) => {
  const token = c.get('sessionToken')
  invalidateSession(token)
  deleteCookie(c, 'dineflow_session')
  return c.json({ data: { success: true } })
})

authRoutes.get('/me', requireAuth, async (c) => {
  const user = c.get('user')
  return c.json({ data: user })
})
