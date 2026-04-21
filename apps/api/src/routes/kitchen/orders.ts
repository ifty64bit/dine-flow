import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { eq, and, inArray } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../../db.js'
import { orders, orderItems, menuItems } from '@dineflow/db'
import { requireAuth } from '../../middleware/auth.js'
import { NotFoundError } from '../../middleware/errors.js'
import { broadcast } from '../../ws/index.js'

const updateItemStatusSchema = z.object({
  status: z.enum(['queued', 'preparing', 'ready', 'served']),
})

const toggleAvailabilitySchema = z.object({ isAvailable: z.boolean() })

const updateOrderStatusSchema = z.object({
  status: z.enum(['placed', 'confirmed', 'preparing', 'ready', 'served', 'cancelled']),
})

export const kitchenOrderRoutes = new Hono()
  .use('*', requireAuth)
  .get('/:branchId', async (c) => {
    const branchId = Number(c.req.param('branchId'))

    const activeOrders = await db.query.orders.findMany({
      where: and(
        eq(orders.branchId, branchId),
        inArray(orders.status, ['placed', 'confirmed', 'preparing'])
      ),
      with: {
        items: {
          with: { menuItem: true },
          orderBy: (i, { asc }) => [asc(i.createdAt)],
        },
        session: {
          with: { table: true },
        },
      },
      orderBy: (o, { asc }) => [asc(o.createdAt)],
    })

    return c.json({
      data: {
        placed: activeOrders.filter((o) => o.status === 'placed'),
        confirmed: activeOrders.filter((o) => o.status === 'confirmed'),
        preparing: activeOrders.filter((o) => o.status === 'preparing'),
      },
    })
  })
  .put('/items/:orderItemId/status', zValidator('json', updateItemStatusSchema), async (c) => {
    const orderItemId = Number(c.req.param('orderItemId'))
    const { status } = c.req.valid('json')

    const [item] = await db
      .update(orderItems)
      .set({ status, updatedAt: new Date() })
      .where(eq(orderItems.id, orderItemId))
      .returning()
    if (!item) throw new NotFoundError('Order item')

    const order = await db.query.orders.findFirst({
      where: eq(orders.id, item.orderId),
      with: { session: true },
    })

    if (order) {
      const branchId = order.session.branchId
      const wsPayload = {
        orderItemId: item.id,
        orderId: item.orderId,
        sessionId: order.sessionId,
        status,
        updatedAt: new Date().toISOString(),
      }
      await broadcast(`session:${order.sessionId}`, { type: 'item:status_update', payload: wsPayload })
      await broadcast(`kitchen:${branchId}`, { type: 'item:status_update', payload: wsPayload })
      await broadcast(`waiter:${branchId}`, { type: 'item:status_update', payload: wsPayload })

      // Auto-update order status when all items ready
      const allItems = await db.query.orderItems.findMany({
        where: eq(orderItems.orderId, item.orderId),
      })
      const allReady = allItems.every((i) => i.status === 'ready' || i.status === 'served')
      if (allReady && order.status !== 'ready') {
        await db
          .update(orders)
          .set({ status: 'ready', updatedAt: new Date() })
          .where(eq(orders.id, item.orderId))
        await broadcast(`session:${order.sessionId}`, {
          type: 'order:status_update',
          payload: {
            orderId: order.id,
            orderNumber: order.orderNumber,
            sessionId: order.sessionId,
            status: 'ready',
            updatedAt: new Date().toISOString(),
          },
        })
      }
    }

    return c.json({ data: item })
  })
  .put('/menu/:menuItemId/availability', zValidator('json', toggleAvailabilitySchema), async (c) => {
    const menuItemId = Number(c.req.param('menuItemId'))
    const { isAvailable } = c.req.valid('json')

    const [item] = await db
      .update(menuItems)
      .set({ isAvailable, updatedAt: new Date() })
      .where(eq(menuItems.id, menuItemId))
      .returning()
    if (!item) throw new NotFoundError('Menu item')

    await broadcast('admin', {
      type: 'item:availability',
      payload: { menuItemId: item.id, name: item.name, isAvailable },
    })

    return c.json({ data: item })
  })
  .put('/orders/:orderId/status', zValidator('json', updateOrderStatusSchema), async (c) => {
    const orderId = Number(c.req.param('orderId'))
    const { status } = c.req.valid('json')

    const [order] = await db
      .update(orders)
      .set({ status, updatedAt: new Date() })
      .where(eq(orders.id, orderId))
      .returning()
    if (!order) throw new NotFoundError('Order')

    const fullOrder = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
      with: { session: true },
    })
    if (fullOrder) {
      const branchId = fullOrder.session.branchId
      const wsPayload = {
        orderId: order.id,
        orderNumber: order.orderNumber,
        sessionId: order.sessionId,
        status,
        updatedAt: new Date().toISOString(),
      }
      await broadcast(`session:${order.sessionId}`, { type: 'order:status_update', payload: wsPayload })
      await broadcast(`kitchen:${branchId}`, { type: 'order:status_update', payload: wsPayload })
      await broadcast(`waiter:${branchId}`, { type: 'order:status_update', payload: wsPayload })
    }

    return c.json({ data: order })
  })
