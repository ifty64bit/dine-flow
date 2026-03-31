import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { eq, and } from 'drizzle-orm'
import { db } from '../../db.js'
import {
  tables,
  sessions,
  orders,
  orderItems,
  floors,
  menuItems,
  menuItemClassRules,
  settings,
} from '@dineflow/db'
import { createOrderSchema } from '@dineflow/shared'
import { requireAuth } from '../../middleware/auth.js'
import { NotFoundError, ValidationError } from '../../middleware/errors.js'
import { broadcast } from '../../ws/index.js'
import { getNextOrderNumber } from '@dineflow/db'

export const waiterRoutes = new Hono()

waiterRoutes.use('*', requireAuth)

waiterRoutes.get('/tables/:branchId', async (c) => {
  const branchId = c.req.param('branchId')

  const branchFloors = await db.query.floors.findMany({
    where: eq(floors.branchId, branchId),
    with: {
      tables: {
        with: { tableClass: true },
        orderBy: (t, { asc }) => [asc(t.number)],
      },
    },
    orderBy: (f, { asc }) => [asc(f.sortOrder)],
  })

  const result = await Promise.all(
    branchFloors.map(async (floor) => ({
      ...floor,
      tables: await Promise.all(
        floor.tables.map(async (table) => {
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
      ),
    }))
  )

  return c.json({ data: result })
})

waiterRoutes.post('/orders', zValidator('json', createOrderSchema), async (c) => {
  const user = c.get('user')
  const { sessionId, items: itemInputs, notes } = c.req.valid('json')

  const session = await db.query.sessions.findFirst({
    where: and(eq(sessions.id, sessionId), eq(sessions.isActive, true)),
    with: {
      table: {
        with: {
          tableClass: true,
          floor: { with: { branch: true } },
        },
      },
    },
  })
  if (!session) throw new NotFoundError('Active session')

  const tableClass = session.table.tableClass
  const multiplier = parseFloat(tableClass.priceMultiplier)
  const branchId = session.table.floor.branchId

  let subtotal = 0
  const resolvedItems: {
    menuItemId: string
    quantity: number
    unitPrice: number
    modifiers: { modifierId: string; name: string; priceAdjustment: number }[]
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

    const modifierTotal = input.modifiers.reduce((sum, mod) => sum + mod.priceAdjustment, 0)
    const unitPrice = baseItemPrice + modifierTotal
    subtotal += unitPrice * input.quantity

    resolvedItems.push({
      menuItemId: item.id,
      quantity: input.quantity,
      unitPrice,
      modifiers: input.modifiers,
      specialInstructions: input.specialInstructions,
      station: item.station,
      name: item.name,
    })
  }

  const [restaurantSettings] = await db.select().from(settings).limit(1)
  const taxRate = restaurantSettings ? parseFloat(restaurantSettings.taxRate) : 0
  const serviceChargeRate = restaurantSettings
    ? parseFloat(restaurantSettings.serviceChargeRate)
    : 0
  const taxAmount = taxRate > 0 ? subtotal * (taxRate / 100) : 0
  const serviceCharge = serviceChargeRate > 0 ? subtotal * (serviceChargeRate / 100) : 0
  const total = subtotal + taxAmount + serviceCharge

  const orderNumber = await getNextOrderNumber(db)

  const [order] = await db
    .insert(orders)
    .values({
      sessionId,
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
