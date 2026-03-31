import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { eq, and } from 'drizzle-orm'
import { db } from '../../db.js'
import {
  menuCategories,
  menuItems,
  menuItemClassRules,
  modifierGroups,
  menuItemModifierGroups,
  modifiers,
} from '@dineflow/db'
import {
  createMenuCategorySchema,
  updateMenuCategorySchema,
  createMenuItemSchema,
  updateMenuItemSchema,
  createMenuItemClassRuleSchema,
  createModifierGroupSchema,
  updateModifierGroupSchema,
  createModifierSchema,
  updateModifierSchema,
} from '@dineflow/shared'
import { requireAuth, roleGuard } from '../../middleware/auth.js'
import { NotFoundError } from '../../middleware/errors.js'

export const adminMenuRoutes = new Hono()

adminMenuRoutes.use('*', requireAuth, roleGuard('manager'))

// Categories
adminMenuRoutes.get('/categories', async (c) => {
  const cats = await db.query.menuCategories.findMany({
    with: { items: true },
    orderBy: (cat, { asc }) => [asc(cat.sortOrder)],
  })
  return c.json({ data: cats })
})

adminMenuRoutes.post('/categories', zValidator('json', createMenuCategorySchema), async (c) => {
  const body = c.req.valid('json')
  const [cat] = await db.insert(menuCategories).values(body).returning()
  return c.json({ data: cat }, 201)
})

adminMenuRoutes.put('/categories/:id', zValidator('json', updateMenuCategorySchema), async (c) => {
  const id = c.req.param('id')
  const body = c.req.valid('json')
  const [cat] = await db
    .update(menuCategories)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(menuCategories.id, id))
    .returning()
  if (!cat) throw new NotFoundError('Category')
  return c.json({ data: cat })
})

adminMenuRoutes.delete('/categories/:id', async (c) => {
  const id = c.req.param('id')
  await db.delete(menuCategories).where(eq(menuCategories.id, id))
  return c.json({ data: { success: true } })
})

// Items
adminMenuRoutes.get('/items', async (c) => {
  const items = await db.query.menuItems.findMany({
    with: {
      category: true,
      classRules: { with: { tableClass: true } },
      modifierGroups: { with: { modifierGroup: { with: { modifiers: true } } } },
    },
    orderBy: (item, { asc }) => [asc(item.sortOrder)],
  })
  return c.json({ data: items })
})

adminMenuRoutes.post('/items', zValidator('json', createMenuItemSchema), async (c) => {
  const body = c.req.valid('json')
  const [item] = await db.insert(menuItems).values(body).returning()
  return c.json({ data: item }, 201)
})

adminMenuRoutes.get('/items/:id', async (c) => {
  const id = c.req.param('id')
  const item = await db.query.menuItems.findFirst({
    where: eq(menuItems.id, id),
    with: {
      category: true,
      classRules: { with: { tableClass: true } },
      modifierGroups: { with: { modifierGroup: { with: { modifiers: true } } } },
    },
  })
  if (!item) throw new NotFoundError('Menu item')
  return c.json({ data: item })
})

adminMenuRoutes.put('/items/:id', zValidator('json', updateMenuItemSchema), async (c) => {
  const id = c.req.param('id')
  const body = c.req.valid('json')
  const [item] = await db
    .update(menuItems)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(menuItems.id, id))
    .returning()
  if (!item) throw new NotFoundError('Menu item')
  return c.json({ data: item })
})

adminMenuRoutes.delete('/items/:id', async (c) => {
  const id = c.req.param('id')
  await db.delete(menuItems).where(eq(menuItems.id, id))
  return c.json({ data: { success: true } })
})

// Class Rules
adminMenuRoutes.get('/items/:id/class-rules', async (c) => {
  const itemId = c.req.param('id')
  const rules = await db.query.menuItemClassRules.findMany({
    where: eq(menuItemClassRules.menuItemId, itemId),
    with: { tableClass: true },
  })
  return c.json({ data: rules })
})

adminMenuRoutes.post(
  '/items/:id/class-rules',
  zValidator('json', createMenuItemClassRuleSchema),
  async (c) => {
    const itemId = c.req.param('id')
    const body = c.req.valid('json')
    const [rule] = await db
      .insert(menuItemClassRules)
      .values({ menuItemId: itemId, ...body })
      .returning()
    return c.json({ data: rule }, 201)
  }
)

adminMenuRoutes.delete('/items/:id/class-rules/:ruleId', async (c) => {
  const ruleId = c.req.param('ruleId')
  await db.delete(menuItemClassRules).where(eq(menuItemClassRules.id, ruleId))
  return c.json({ data: { success: true } })
})

// Modifier Groups
adminMenuRoutes.get('/modifier-groups', async (c) => {
  const groups = await db.query.modifierGroups.findMany({
    with: { modifiers: { orderBy: (m, { asc }) => [asc(m.sortOrder)] } },
  })
  return c.json({ data: groups })
})

adminMenuRoutes.post(
  '/modifier-groups',
  zValidator('json', createModifierGroupSchema),
  async (c) => {
    const body = c.req.valid('json')
    const [group] = await db.insert(modifierGroups).values(body).returning()
    return c.json({ data: group }, 201)
  }
)

adminMenuRoutes.put(
  '/modifier-groups/:id',
  zValidator('json', updateModifierGroupSchema),
  async (c) => {
    const id = c.req.param('id')
    const body = c.req.valid('json')
    const [group] = await db
      .update(modifierGroups)
      .set(body)
      .where(eq(modifierGroups.id, id))
      .returning()
    if (!group) throw new NotFoundError('Modifier group')
    return c.json({ data: group })
  }
)

adminMenuRoutes.delete('/modifier-groups/:id', async (c) => {
  const id = c.req.param('id')
  await db.delete(modifierGroups).where(eq(modifierGroups.id, id))
  return c.json({ data: { success: true } })
})

adminMenuRoutes.post(
  '/modifier-groups/:groupId/modifiers',
  zValidator('json', createModifierSchema),
  async (c) => {
    const body = c.req.valid('json')
    const [mod] = await db.insert(modifiers).values(body).returning()
    return c.json({ data: mod }, 201)
  }
)

adminMenuRoutes.put('/modifiers/:id', zValidator('json', updateModifierSchema), async (c) => {
  const id = c.req.param('id')
  const body = c.req.valid('json')
  const [mod] = await db.update(modifiers).set(body).where(eq(modifiers.id, id)).returning()
  if (!mod) throw new NotFoundError('Modifier')
  return c.json({ data: mod })
})

adminMenuRoutes.delete('/modifiers/:id', async (c) => {
  const id = c.req.param('id')
  await db.delete(modifiers).where(eq(modifiers.id, id))
  return c.json({ data: { success: true } })
})

// Attach/detach modifier group to item
adminMenuRoutes.post('/items/:id/modifier-groups/:groupId', async (c) => {
  const menuItemId = c.req.param('id')
  const modifierGroupId = c.req.param('groupId')
  await db
    .insert(menuItemModifierGroups)
    .values({ menuItemId, modifierGroupId })
    .onConflictDoNothing()
  return c.json({ data: { success: true } }, 201)
})

adminMenuRoutes.delete('/items/:id/modifier-groups/:groupId', async (c) => {
  const menuItemId = c.req.param('id')
  const modifierGroupId = c.req.param('groupId')
  await db
    .delete(menuItemModifierGroups)
    .where(
      and(
        eq(menuItemModifierGroups.menuItemId, menuItemId),
        eq(menuItemModifierGroups.modifierGroupId, modifierGroupId)
      )
    )
  return c.json({ data: { success: true } })
})
