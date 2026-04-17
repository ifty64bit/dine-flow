import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { eq, and } from 'drizzle-orm'
import { db } from '../../db.js'
import {
  tables,
  sessions,
  orders,
  orderItems,
  menuItems,
  menuItemClassRules,
  modifiers,
} from '@dineflow/db'
import { createOrderSchema } from '@dineflow/shared'
import { requireAuth } from '../../middleware/auth.js'
import { NotFoundError, ValidationError } from '../../middleware/errors.js'
import { broadcast } from '../../ws/index.js'
import { getNextOrderNumber } from '@dineflow/db'

export const waiterRoutes = new Hono()
  .use('*', requireAuth)
  .get('/tables/:branchId', async (c) => {
    const branchId = Number(c.req.param('branchId'))

    const branchTables = await db.query.tables.findMany({
      where: eq(tables.branchId, branchId),
      with: {
        tableClass: true,
      },
      orderBy: (t, { asc }) => [asc(t.number)],
    })

    const result = await Promise.all(
      branchTables.map(async (table) => {
        const activeSession = await db.query.sessions.findFirst({
          where: and(eq(sessions.tableId, table.id), eq(sessions.isActive, true)),
          with: {
            orders: {
              orderBy: (o, { desc }) => [desc(o.createdAt)],
              limit: 3,
            },
          },
        })
        return { ...table, activeSession: activeSession ?? null }
      })
    )

    return c.json({ data: result })
  })
  .post('/orders', zValidator('json', createOrderSchema), async (c) => {
    const user = c.get('user')
    const { sessionId, items: itemInputs, notes } = c.req.valid('json')

    const session = await db.query.sessions.findFirst({
      where: and(eq(sessions.id, sessionId), eq(sessions.isActive, true)),
      with: {
        table: {
          with: { tableClass: true },
        },
      },
    })
    if (!session) throw new NotFoundError('Active session')

    const tableClass = session.table.tableClass
    const multiplier = parseFloat(tableClass.priceMultiplier)
    const branchId = session.branchId

    let subtotal = 0
    const resolvedItems: {
      menuItemId: number
      quantity: number
      unitPrice: number
      modifiers: { modifierId: number; name: string; priceAdjustment: number }[]
      specialInstructions: string | undefined
      station: string | null
      name: string
    }[] = []

    for (const input of itemInputs) {
      const item = await db.query.menuItems.findFirst({
        where: eq(menuItems.id, input.menuItemId),
      })
      if (!item) throw new NotFoundError(`Menu item ${input.menuItemId}`)
      if (!item.isAvailable) throw new ValidationError(`${item.name} is currently unavailable`)

      const rule = await db.query.menuItemClassRules.findFirst({
        where: and(
          eq(menuItemClassRules.menuItemId, item.id),
          eq(menuItemClassRules.tableClassId, tableClass.id)
        ),
      })

      const baseItemPrice = rule?.priceOverride
        ? parseFloat(rule.priceOverride)
        : parseFloat(item.basePrice) * multiplier

      // Resolve modifier details from DB to get prices and names
      const resolvedModifiers: { modifierId: number; name: string; priceAdjustment: number }[] = []
      for (const mod of input.modifiers) {
        const modifier = await db.query.modifiers.findFirst({
          where: eq(modifiers.id, mod.modifierId),
        })
        if (modifier) {
          resolvedModifiers.push({
            modifierId: modifier.id,
            name: modifier.name,
            priceAdjustment: parseFloat(modifier.priceAdjustment),
          })
        }
      }

      const modifierTotal = resolvedModifiers.reduce((sum, m) => sum + m.priceAdjustment, 0)
      const unitPrice = baseItemPrice + modifierTotal
      subtotal += unitPrice * input.quantity

      resolvedItems.push({
        menuItemId: item.id,
        quantity: input.quantity,
        unitPrice,
        modifiers: resolvedModifiers,
        specialInstructions: input.specialInstructions,
        station: item.station,
        name: item.name,
      })
    }

    // Use hardcoded defaults (no settings table — configure per-organization when needed)
    const taxRate = 0
    const serviceChargeRate = 0
    const taxAmount = taxRate > 0 ? subtotal * (taxRate / 100) : 0
    const serviceCharge = serviceChargeRate > 0 ? subtotal * (serviceChargeRate / 100) : 0
    const total = subtotal + taxAmount + serviceCharge

    const orderNumber = await getNextOrderNumber(db)

    const [order] = await db
      .insert(orders)
      .values({
        sessionId,
        branchId,
        orderNumber,
        status: 'placed',
        subtotal: subtotal.toFixed(2),
        taxAmount: taxAmount.toFixed(2),
        serviceCharge: serviceCharge.toFixed(2),
        discountAmount: '0',
        total: total.toFixed(2),
        notes: notes ?? null,
        createdBy: 'waiter',
        waiterId: user.id,
      })
      .returning()

    const insertedItems = await db
      .insert(orderItems)
      .values(
        resolvedItems.map((ri) => ({
          orderId: order.id,
          menuItemId: ri.menuItemId,
          quantity: ri.quantity,
          unitPrice: ri.unitPrice.toFixed(2),
          modifiers: ri.modifiers,
          specialInstructions: ri.specialInstructions ?? null,
          status: 'queued' as const,
          station: ri.station as 'grill' | 'fryer' | 'salad' | 'drinks' | 'dessert' | 'general' | null,
        }))
      )
      .returning()

    const wsPayload = {
      orderId: order.id,
      orderNumber: order.orderNumber,
      sessionId,
      tableId: session.tableId,
      tableNumber: session.table.number,
      branchId,
      items: resolvedItems.map((ri, i) => ({
        id: insertedItems[i].id,
        name: ri.name,
        quantity: ri.quantity,
        station: ri.station,
        specialInstructions: ri.specialInstructions ?? null,
      })),
      createdAt: order.createdAt.toISOString(),
    }

    broadcast(`session:${sessionId}`, { type: 'order:new', payload: wsPayload })
    broadcast(`kitchen:${branchId}`, { type: 'order:new', payload: wsPayload })
    broadcast(`waiter:${branchId}`, { type: 'order:new', payload: wsPayload })

    return c.json({ data: { order, items: insertedItems } }, 201)
  })
