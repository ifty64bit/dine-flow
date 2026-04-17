import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { eq, and } from 'drizzle-orm'
import { db } from '../../db.js'
import { reservations } from '@dineflow/db'
import { createReservationSchema, updateReservationStatusSchema } from '@dineflow/shared'
import { requireAuth, roleGuard } from '../../middleware/auth.js'
import { NotFoundError } from '../../middleware/errors.js'

export const adminReservationRoutes = new Hono()
  .use('*', requireAuth, roleGuard('manager'))
  .get('/', async (c) => {
    const branchIdParam = c.req.query('branchId')
    const date = c.req.query('date')

    const conditions: ReturnType<typeof eq>[] = []
    if (branchIdParam) conditions.push(eq(reservations.branchId, Number(branchIdParam)))
    if (date) conditions.push(eq(reservations.date, date))

    const all = await db.query.reservations.findMany({
      where: conditions.length > 0 ? and(...(conditions as [ReturnType<typeof eq>, ...ReturnType<typeof eq>[]])) : undefined,
      with: { table: true, preferredClass: true },
      orderBy: (r, { asc }) => [asc(r.date), asc(r.timeSlot)],
    })
    return c.json({ data: all })
  })
  .post('/', zValidator('json', createReservationSchema), async (c) => {
    const body = c.req.valid('json')
    const [reservation] = await db.insert(reservations).values(body).returning()
    return c.json({ data: reservation }, 201)
  })
  .get('/:id', async (c) => {
    const id = Number(c.req.param('id'))
    const reservation = await db.query.reservations.findFirst({
      where: eq(reservations.id, id),
      with: { table: true, preferredClass: true, branch: true },
    })
    if (!reservation) throw new NotFoundError('Reservation')
    return c.json({ data: reservation })
  })
  .put('/:id', zValidator('json', createReservationSchema.partial()), async (c) => {
    const id = Number(c.req.param('id'))
    const body = c.req.valid('json')
    const [reservation] = await db
      .update(reservations)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(reservations.id, id))
      .returning()
    if (!reservation) throw new NotFoundError('Reservation')
    return c.json({ data: reservation })
  })
  .patch('/:id/status', zValidator('json', updateReservationStatusSchema), async (c) => {
    const id = Number(c.req.param('id'))
    const { status } = c.req.valid('json')
    const [reservation] = await db
      .update(reservations)
      .set({ status, updatedAt: new Date() })
      .where(eq(reservations.id, id))
      .returning()
    if (!reservation) throw new NotFoundError('Reservation')
    return c.json({ data: reservation })
  })
  .delete('/:id', async (c) => {
    const id = Number(c.req.param('id'))
    await db.delete(reservations).where(eq(reservations.id, id))
    return c.json({ data: { success: true } })
  })
