import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { updateSettingsSchema } from '@dineflow/shared'
import { requireAuth, roleGuard } from '../../middleware/auth.js'

// In-memory settings store (no DB table — use organization config or migrate later)
let currentSettings: Record<string, unknown> = {
  restaurantName: 'My Restaurant',
  currency: 'USD',
  timezone: 'UTC',
  taxRate: '0',
  serviceChargeRate: '0',
  taxInclusive: false,
}

export const adminSettingsRoutes = new Hono()
  .use('*', requireAuth, roleGuard('admin'))
  .get('/', async (c) => {
    return c.json({ data: currentSettings })
  })
  .put('/', zValidator('json', updateSettingsSchema), async (c) => {
    const body = c.req.valid('json')
    currentSettings = { ...currentSettings, ...body }
    return c.json({ data: currentSettings })
  })
