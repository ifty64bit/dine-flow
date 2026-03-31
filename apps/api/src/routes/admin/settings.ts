import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { db } from '../../db.js'
import { settings } from '@dineflow/db'
import { updateSettingsSchema } from '@dineflow/shared'
import { requireAuth, roleGuard } from '../../middleware/auth.js'

export const adminSettingsRoutes = new Hono()

adminSettingsRoutes.use('*', requireAuth, roleGuard('admin'))

adminSettingsRoutes.get('/', async (c) => {
  const [setting] = await db.select().from(settings).limit(1)
  return c.json({ data: setting ?? null })
})

adminSettingsRoutes.put('/', zValidator('json', updateSettingsSchema), async (c) => {
  const body = c.req.valid('json')
  const existing = await db.select().from(settings).limit(1)

  if (existing.length === 0) {
    const [created] = await db
      .insert(settings)
      .values({ ...body, updatedAt: new Date() })
      .returning()
    return c.json({ data: created })
  }

  const [updated] = await db
    .update(settings)
    .set({ ...body, updatedAt: new Date() })
    .returning()
  return c.json({ data: updated })
})
