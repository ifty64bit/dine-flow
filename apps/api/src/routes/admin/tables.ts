import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { eq } from 'drizzle-orm'
import { db } from '../../db.js'
import { tables, tableClasses } from '@dineflow/db'
import {
  createTableSchema,
  updateTableSchema,
  updateTableStatusSchema,
  createTableClassSchema,
  updateTableClassSchema,
} from '@dineflow/shared'
import { requireAuth, roleGuard } from '../../middleware/auth.js'
import { NotFoundError } from '../../middleware/errors.js'
import { broadcast } from '../../ws/index.js'

export const adminTableRoutes = new Hono()
  .use('*', requireAuth)
  // Table Classes (admin only)
  .get('/classes', async (c) => {
    const classes = await db.query.tableClasses.findMany({
      orderBy: (tc, { asc }) => [asc(tc.sortOrder)],
    })
    return c.json({ data: classes })
  })
  .post('/classes', roleGuard('admin'), zValidator('json', createTableClassSchema), async (c) => {
    const user = c.get('user')
    const body = c.req.valid('json')
    if (!user.organizationId) throw new NotFoundError('Organization')
    const [tc] = await db.insert(tableClasses).values({ ...body, organizationId: user.organizationId }).returning()
    return c.json({ data: tc }, 201)
  })
  .put('/classes/:id', roleGuard('admin'), zValidator('json', updateTableClassSchema), async (c) => {
    const id = Number(c.req.param('id'))
    const body = c.req.valid('json')
    const [tc] = await db
      .update(tableClasses)
      .set(body)
      .where(eq(tableClasses.id, id))
      .returning()
    if (!tc) throw new NotFoundError('Table class')
    return c.json({ data: tc })
  })
  .delete('/classes/:id', roleGuard('admin'), async (c) => {
    const id = Number(c.req.param('id'))
    await db.delete(tableClasses).where(eq(tableClasses.id, id))
    return c.json({ data: { success: true } })
  })
  // Tables (manager+)
  .get('/', roleGuard('manager'), async (c) => {
    const allTables = await db.query.tables.findMany({
      with: { tableClass: true, branch: true },
      orderBy: (t, { asc }) => [asc(t.number)],
    })
    return c.json({ data: allTables })
  })
  .post('/', roleGuard('manager'), zValidator('json', createTableSchema), async (c) => {
    const body = c.req.valid('json')
    const [table] = await db
      .insert(tables)
      .values({ ...body, qrCodeUrl: 'pending' })
      .returning()
    const [updated] = await db
      .update(tables)
      .set({ qrCodeUrl: `http://menu.local/table/${table.id}` })
      .where(eq(tables.id, table.id))
      .returning()
    return c.json({ data: updated }, 201)
  })
  .put('/:id', roleGuard('manager'), zValidator('json', updateTableSchema), async (c) => {
    const id = Number(c.req.param('id'))
    const body = c.req.valid('json')
    const [table] = await db
      .update(tables)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(tables.id, id))
      .returning()
    if (!table) throw new NotFoundError('Table')
    return c.json({ data: table })
  })
  .put('/:id/status', zValidator('json', updateTableStatusSchema), async (c) => {
    const id = Number(c.req.param('id'))
    const { status } = c.req.valid('json')
    const [table] = await db
      .update(tables)
      .set({ status, updatedAt: new Date() })
      .where(eq(tables.id, id))
      .returning()
    if (!table) throw new NotFoundError('Table')

    await broadcast(`waiter:${table.branchId}`, {
      type: 'table:status_change',
      payload: {
        tableId: table.id,
        tableNumber: table.number,
        branchId: table.branchId,
        status,
        updatedAt: new Date().toISOString(),
      },
    })

    return c.json({ data: table })
  })
  .delete('/:id', roleGuard('manager'), async (c) => {
    const id = Number(c.req.param('id'))
    await db.delete(tables).where(eq(tables.id, id))
    return c.json({ data: { success: true } })
  })
