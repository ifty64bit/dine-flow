import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { db } from '../../db.js'
import { overlordAdmins } from '@dineflow/db'
import {
  createOverlordToken,
  invalidateOverlordToken,
  requireOverlordAuth,
} from '../../middleware/overlord-auth.js'
import { UnauthorizedError } from '../../middleware/errors.js'

const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
})

export const overlordAuthRoutes = new Hono()
  .post('/login', zValidator('json', loginSchema), async (c) => {
    const { email, password } = c.req.valid('json')

    const admin = await db.query.overlordAdmins.findFirst({
      where: eq(overlordAdmins.email, email.toLowerCase()),
    })

    if (!admin || !admin.isActive) throw new UnauthorizedError('Invalid credentials')

    const valid = await bcrypt.compare(password, admin.passwordHash)
    if (!valid) throw new UnauthorizedError('Invalid credentials')

    const token = createOverlordToken(admin.id)

    return c.json({
      data: {
        token,
        admin: { id: admin.id, email: admin.email, name: admin.name },
      },
    })
  })
  .post('/logout', requireOverlordAuth, async (c) => {
    invalidateOverlordToken(c.get('overlordToken'))
    return c.json({ data: { success: true } })
  })
  .get('/me', requireOverlordAuth, async (c) => {
    return c.json({ data: c.get('overlordAdmin') })
  })
