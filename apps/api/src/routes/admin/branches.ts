import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { eq } from 'drizzle-orm'
import { db } from '../../db.js'
import { branches } from '@dineflow/db'
import { createBranchSchema, updateBranchSchema } from '@dineflow/shared'
import { requireAuth, roleGuard } from '../../middleware/auth.js'
import { NotFoundError } from '../../middleware/errors.js'

export const adminBranchRoutes = new Hono()

adminBranchRoutes.use('*', requireAuth, roleGuard('admin'))

adminBranchRoutes.get('/', async (c) => {
  const all = await db.query.branches.findMany({
    orderBy: (b, { asc }) => [asc(b.name)],
  })
  return c.json({ data: all })
})

adminBranchRoutes.post('/', zValidator('json', createBranchSchema), async (c) => {
  const body = c.req.valid('json')
  const [branch] = await db.insert(branches).values(body).returning()
  return c.json({ data: branch }, 201)
})

adminBranchRoutes.get('/:id', async (c) => {
  const id = c.req.param('id')
  const branch = await db.query.branches.findFirst({ where: eq(branches.id, id) })
  if (!branch) throw new NotFoundError('Branch')
  return c.json({ data: branch })
})

adminBranchRoutes.put('/:id', zValidator('json', updateBranchSchema), async (c) => {
  const id = c.req.param('id')
  const body = c.req.valid('json')
  const [branch] = await db
    .update(branches)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(branches.id, id))
    .returning()
  if (!branch) throw new NotFoundError('Branch')
  return c.json({ data: branch })
})

adminBranchRoutes.delete('/:id', async (c) => {
  const id = c.req.param('id')
  await db.delete(branches).where(eq(branches.id, id))
  return c.json({ data: { success: true } })
})
