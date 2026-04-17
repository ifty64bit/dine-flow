import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { getMenuForTable } from '@dineflow/db'
import { menuItems, modifiers, tables } from '@dineflow/db'
import { db } from '../../db.js'
import { NotFoundError } from '../../middleware/errors.js'

export const customerMenuRoutes = new Hono()

customerMenuRoutes.get('/:branchId', async (c) => {
  const branchId = Number(c.req.param('branchId'))
  const tableId = c.req.query('table')

  if (!tableId) {
    return c.json({ error: 'table query parameter is required' }, 400)
  }

  const menu = await getMenuForTable(db, branchId, Number(tableId))
  return c.json({ data: menu })
})

customerMenuRoutes.get('/:branchId/items/:id', async (c) => {
  const itemId = Number(c.req.param('id'))
  const tableId = c.req.query('table')

  const item = await db.query.menuItems.findFirst({
    where: eq(menuItems.id, itemId),
    with: {
      classRules: true,
      modifierGroups: {
        with: {
          modifierGroup: {
            with: {
              modifiers: {
                where: eq(modifiers.isAvailable, true),
                orderBy: (mod, { asc }) => [asc(mod.sortOrder)],
              },
            },
          },
        },
      },
      category: true,
    },
  })

  if (!item) throw new NotFoundError('Menu item')

  let resolvedPrice = parseFloat(item.basePrice)
  if (tableId) {
    const table = await db.query.tables.findFirst({
      where: eq(tables.id, Number(tableId)),
      with: { tableClass: true },
    })
    if (table) {
      const multiplier = parseFloat(table.tableClass.priceMultiplier)
      const classRule = item.classRules.find((r) => r.tableClassId === table.tableClassId)
      resolvedPrice = classRule?.priceOverride
        ? parseFloat(classRule.priceOverride)
        : parseFloat(item.basePrice) * multiplier
    }
  }

  return c.json({
    data: {
      ...item,
      resolvedPrice,
      modifierGroups: item.modifierGroups.map((junc) => junc.modifierGroup),
    },
  })
})
