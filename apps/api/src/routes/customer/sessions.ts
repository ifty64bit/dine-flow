import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { eq } from 'drizzle-orm'
import { db } from '../../db.js'
import { sessions, tables } from '@dineflow/db'
import { startSessionSchema } from '@dineflow/shared'
import { NotFoundError } from '../../middleware/errors.js'
import { broadcast } from '../../ws/index.js'

export const customerSessionRoutes = new Hono()

customerSessionRoutes.post('/start', zValidator('json', startSessionSchema), async (c) => {
  const { tableId, guestName } = c.req.valid('json')

  const table = await db.query.tables.findFirst({
    where: eq(tables.id, tableId),
    with: { tableClass: true },
  })
  if (!table) throw new NotFoundError('Table')

  // Close any existing active sessions for this table
  await db
    .update(sessions)
    .set({ isActive: false, endedAt: new Date() })
    .where(eq(sessions.tableId, tableId))

  // Mark table occupied
  await db
    .update(tables)
    .set({ status: 'occupied', updatedAt: new Date() })
    .where(eq(tables.id, tableId))

  const [session] = await db
    .insert(sessions)
    .values({
      tableId,
      branchId: table.branchId,
      tableClassId: table.tableClassId,
      guestName: guestName ?? null,
      isActive: true,
    })
    .returning()

  broadcast(`waiter:${table.branchId}`, {
    type: 'table:status_change',
    payload: {
      tableId: table.id,
      tableNumber: table.number,
      branchId: table.branchId,
      status: 'occupied',
      updatedAt: new Date().toISOString(),
    },
  })

  return c.json({ data: session }, 201)
})

customerSessionRoutes.get('/:id', async (c) => {
  const sessionId = Number(c.req.param('id'))
  const session = await db.query.sessions.findFirst({
    where: eq(sessions.id, sessionId),
    with: { table: { with: { tableClass: true } } },
  })
  if (!session) throw new NotFoundError('Session')
  return c.json({ data: session })
})
