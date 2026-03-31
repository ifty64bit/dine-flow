import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { eq } from 'drizzle-orm'
import { db } from '../../db.js'
import { tables, floors, tableClasses } from '@dineflow/db'
import {
  createTableSchema,
  updateTableSchema,
  updateTableStatusSchema,
  createFloorSchema,
  createTableClassSchema,
  updateTableClassSchema,
} from '@dineflow/shared'
import { requireAuth, roleGuard } from '../../middleware/auth.js'
import { NotFoundError } from '../../middleware/errors.js'
import { broadcast } from '../../ws/index.js'

export const adminTableRoutes = new Hono()

adminTableRoutes.use('*', requireAuth)

// Table Classes (admin only)
adminTableRoutes.get('/classes', async (c) => {
  const classes = await db.query.tableClasses.findMany({
    orderBy: (tc, { asc }) => [asc(tc.sortOrder)],
  })
  return c.json({ data: classes })
})

adminTableRoutes.post(
  '/classes',
  roleGuard('admin'),
  zValidator('json', createTableClassSchema),
  async (c) => {
    const body = c.req.valid('json')
    const [tc] = await db.insert(tableClasses).values(body).returning()
    return c.json({ data: tc }, 201)
  }
)

adminTableRoutes.put(
  '/classes/:id',
  roleGuard('admin'),
  zValidator('json', updateTableClassSchema),
  async (c) => {
    const id = c.req.param('id')
    const body = c.req.valid('json')
    const [tc] = await db
      .update(tableClasses)
      .set(body)
      .where(eq(tableClasses.id, id))
      .returning()
    if (!tc) throw new NotFoundError('Table class')
    return c.json({ data: tc })
  }
)

adminTableRoutes.delete('/classes/:id', roleGuard('admin'), async (c) => {
  const id = c.req.param('id')
  await db.delete(tableClasses).where(eq(tableClasses.id, id))
  return c.json({ data: { success: true } })
})

// Floors (manager+)
adminTableRoutes.get('/floors', roleGuard('manager'), async (c) => {
  const allFloors = await db.query.floors.findMany({
    with: { tables: { with: { tableClass: true } } },
    orderBy: (f, { asc }) => [asc(f.sortOrder)],
  })
  return c.json({ data: allFloors })
})

adminTableRoutes.post(
  '/floors',
  roleGuard('manager'),
  zValidator('json', createFloorSchema),
  async (c) => {
    const body = c.req.valid('json')
    const [floor] = await db.insert(floors).values(body).returning()
    return c.json({ data: floor }, 201)
  }
)

adminTableRoutes.delete('/floors/:id', roleGuard('manager'), async (c) => {
  const id = c.req.param('id')
  await db.delete(floors).where(eq(floors.id, id))
  return c.json({ data: { success: true } })
})

// Tables (manager+)
adminTableRoutes.get('/', roleGuard('manager'), async (c) => {
  const allTables = await db.query.tables.findMany({
    with: { floor: true, tableClass: true },
    orderBy: (t, { asc }) => [asc(t.number)],
  })
  return c.json({ data: allTables })
})

adminTableRoutes.post(
  '/',
  roleGuard('manager'),
  zValidator('json', createTableSchema),
  async (c) => {
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
  }
)

adminTableRoutes.put(
  '/:id',
  roleGuard('manager'),
  zValidator('json', updateTableSchema),
  async (c) => {
    const id = c.req.param('id')
    const body = c.req.valid('json')
    const [table] = await db
      .update(tables)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(tables.id, id))
      .returning()
    if (!table) throw new NotFoundError('Table')
    return c.json({ data: table })
  }
)

adminTableRoutes.put('/:id/status', zValidator('json', updateTableStatusSchema), async (c) => {
  const id = c.req.param('id')
  const { status } = c.req.valid('json')
  const [table] = await db
    .update(tables)
    .set({ status, updatedAt: new Date() })
    .where(eq(tables.id, id))
    .returning()
  if (!table) throw new NotFoundError('Table')

  const floor = await db.query.floors.findFirst({ where: eq(floors.id, table.floorId) })
  if (floor) {
    broadcast(`waiter:${floor.branchId}`, {
      type: 'table:status_change',
      payload: {
        tableId: table.id,
        tableNumber: table.number,
        floorId: table.floorId,
        branchId: floor.branchId,
        status,
        updatedAt: new Date().toISOString(),
      },
    })
  }

  return c.json({ data: table })
})

adminTableRoutes.delete('/:id', roleGuard('manager'), async (c) => {
  const id = c.req.param('id')
  await db.delete(tables).where(eq(tables.id, id))
  return c.json({ data: { success: true } })
})
