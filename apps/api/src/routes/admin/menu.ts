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
  .use('*', requireAuth, roleGuard('manager'))
  // Categories
  .get('/categories', async (c) => {
    const cats = await db.query.menuCategories.findMany({
      with: { items: true },
      orderBy: (cat, { asc }) => [asc(cat.sortOrder)],
    })
    return c.json({ data: cats })
  })
  .post('/categories', zValidator('json', createMenuCategorySchema), async (c) => {
    const body = c.req.valid('json')
    const [cat] = await db.insert(menuCategories).values(body).returning()
    return c.json({ data: cat }, 201)
  })
  .put('/categories/:id', zValidator('json', updateMenuCategorySchema), async (c) => {
    const id = Number(c.req.param('id'))
    const body = c.req.valid('json')
    const [cat] = await db
      .update(menuCategories)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(menuCategories.id, id))
      .returning()
    if (!cat) throw new NotFoundError('Category')
    return c.json({ data: cat })
  })
  .delete('/categories/:id', async (c) => {
    const id = Number(c.req.param('id'))
    await db.delete(menuCategories).where(eq(menuCategories.id, id))
    return c.json({ data: { success: true } })
  })
  // Items
  .get('/items', async (c) => {
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
  .post('/items', zValidator('json', createMenuItemSchema), async (c) => {
    const body = c.req.valid('json')
    const [item] = await db.insert(menuItems).values(body).returning()
    return c.json({ data: item }, 201)
  })
  .get('/items/:id', async (c) => {
    const id = Number(c.req.param('id'))
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
  .put('/items/:id', zValidator('json', updateMenuItemSchema), async (c) => {
    const id = Number(c.req.param('id'))
    const body = c.req.valid('json')
    const [item] = await db
      .update(menuItems)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(menuItems.id, id))
      .returning()
    if (!item) throw new NotFoundError('Menu item')
    return c.json({ data: item })
  })
  .delete('/items/:id', async (c) => {
    const id = Number(c.req.param('id'))
    await db.delete(menuItems).where(eq(menuItems.id, id))
    return c.json({ data: { success: true } })
  })
  // Class Rules
  .get('/items/:id/class-rules', async (c) => {
    const itemId = Number(c.req.param('id'))
    const rules = await db.query.menuItemClassRules.findMany({
      where: eq(menuItemClassRules.menuItemId, itemId),
      with: { tableClass: true },
    })
    return c.json({ data: rules })
  })
  .post('/items/:id/class-rules', zValidator('json', createMenuItemClassRuleSchema), async (c) => {
    const menuItemId = Number(c.req.param('id'))
    const body = c.req.valid('json')
    const [rule] = await db
      .insert(menuItemClassRules)
      .values({ menuItemId, ...body })
      .returning()
    return c.json({ data: rule }, 201)
  })
  .delete('/items/:id/class-rules/:ruleId', async (c) => {
    const ruleId = Number(c.req.param('ruleId'))
    await db.delete(menuItemClassRules).where(eq(menuItemClassRules.id, ruleId))
    return c.json({ data: { success: true } })
  })
  // Modifier Groups
  .get('/modifier-groups', async (c) => {
    const groups = await db.query.modifierGroups.findMany({
      with: { modifiers: { orderBy: (m, { asc }) => [asc(m.sortOrder)] } },
    })
    return c.json({ data: groups })
  })
  .post('/modifier-groups', zValidator('json', createModifierGroupSchema), async (c) => {
    const body = c.req.valid('json')
    const [group] = await db.insert(modifierGroups).values(body).returning()
    return c.json({ data: group }, 201)
  })
  .put('/modifier-groups/:id', zValidator('json', updateModifierGroupSchema), async (c) => {
    const id = Number(c.req.param('id'))
    const body = c.req.valid('json')
    const [group] = await db
      .update(modifierGroups)
      .set(body)
      .where(eq(modifierGroups.id, id))
      .returning()
    if (!group) throw new NotFoundError('Modifier group')
    return c.json({ data: group })
  })
  .delete('/modifier-groups/:id', async (c) => {
    const id = Number(c.req.param('id'))
    await db.delete(modifierGroups).where(eq(modifierGroups.id, id))
    return c.json({ data: { success: true } })
  })
  .post('/modifier-groups/:groupId/modifiers', zValidator('json', createModifierSchema), async (c) => {
    const body = c.req.valid('json')
    const [mod] = await db.insert(modifiers).values(body).returning()
    return c.json({ data: mod }, 201)
  })
  .put('/modifiers/:id', zValidator('json', updateModifierSchema), async (c) => {
    const id = Number(c.req.param('id'))
    const body = c.req.valid('json')
    const [mod] = await db.update(modifiers).set(body).where(eq(modifiers.id, id)).returning()
    if (!mod) throw new NotFoundError('Modifier')
    return c.json({ data: mod })
  })
  .delete('/modifiers/:id', async (c) => {
    const id = Number(c.req.param('id'))
    await db.delete(modifiers).where(eq(modifiers.id, id))
    return c.json({ data: { success: true } })
  })
  // Attach/detach modifier group to item
  .post('/items/:id/modifier-groups/:groupId', async (c) => {
    const menuItemId = Number(c.req.param('id'))
    const modifierGroupId = Number(c.req.param('groupId'))
    await db
      .insert(menuItemModifierGroups)
      .values({ menuItemId, modifierGroupId })
      .onConflictDoNothing()
    return c.json({ data: { success: true } }, 201)
  })
  .delete('/items/:id/modifier-groups/:groupId', async (c) => {
    const menuItemId = Number(c.req.param('id'))
    const modifierGroupId = Number(c.req.param('groupId'))
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
