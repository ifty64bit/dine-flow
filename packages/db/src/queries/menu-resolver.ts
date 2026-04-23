import { eq, and, inArray, or, isNull } from 'drizzle-orm'
import type { Db } from '../client.js'
import {
  tables,
  menuCategories,
  menuItems,
  menuItemClassRules,
  modifiers,
} from '../schema/index.js'

export interface ResolvedModifier {
  id: number
  name: string
  priceAdjustment: number
  sortOrder: number
  isAvailable: boolean
}

export interface ResolvedModifierGroup {
  id: number
  name: string
  isRequired: boolean
  minSelect: number
  maxSelect: number
  modifiers: ResolvedModifier[]
}

export interface ResolvedMenuItem {
  id: number
  name: string
  description: string | null
  basePrice: number
  resolvedPrice: number
  imageUrl: string | null
  prepTimeMin: number
  dietaryTags: string[]
  calories: number | null
  isAvailable: boolean
  station: string | null
  sortOrder: number
  modifierGroups: ResolvedModifierGroup[]
}

export interface ResolvedCategory {
  id: number
  name: string
  description: string | null
  imageUrl: string | null
  sortOrder: number
  items: ResolvedMenuItem[]
}

export async function getMenuForTable(
  db: Db,
  branchId: number,
  tableId: number
): Promise<ResolvedCategory[]> {
  // Resolve table_class_id from table
  const table = await db.query.tables.findFirst({
    where: eq(tables.id, tableId),
    with: { tableClass: true },
  })
  if (!table) throw new Error(`Table ${tableId} not found`)

  const tableClassId = table.tableClassId
  const priceMultiplier = parseFloat(table.tableClass.priceMultiplier)

  // Fetch all active categories for this branch (branch-specific + global)
  const categories = await db.query.menuCategories.findMany({
    where: and(
      or(eq(menuCategories.branchId, branchId), isNull(menuCategories.branchId)),
      eq(menuCategories.isActive, true)
    ),
    orderBy: (cat, { asc }) => [asc(cat.sortOrder)],
  })

  if (categories.length === 0) return []

  const categoryIds = categories.map((c) => c.id)

  // Fetch all items for these categories
  const items = await db.query.menuItems.findMany({
    where: and(
      inArray(menuItems.categoryId, categoryIds),
      or(eq(menuItems.branchId, branchId), isNull(menuItems.branchId)),
      eq(menuItems.isAvailable, true)
    ),
    with: {
      classRules: {
        where: eq(menuItemClassRules.tableClassId, tableClassId),
      },
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
    },
    orderBy: (item, { asc }) => [asc(item.sortOrder)],
  })

  // Filter and resolve pricing per item
  const resolvedItems: (ResolvedMenuItem & { categoryId: number })[] = []

  for (const item of items) {
    const classRule = item.classRules[0] ?? null

    // Visibility filtering
    if (item.visibilityMode === 'include') {
      if (!classRule || classRule.ruleType !== 'include') continue
    } else if (item.visibilityMode === 'exclude') {
      if (classRule && classRule.ruleType === 'exclude') continue
    }
    // 'all' mode: show regardless

    // Price resolution
    const basePrice = parseFloat(item.basePrice)
    let resolvedPrice: number
    if (classRule?.priceOverride != null) {
      resolvedPrice = parseFloat(classRule.priceOverride)
    } else {
      resolvedPrice = basePrice * priceMultiplier
    }

    const resolvedModifierGroups: ResolvedModifierGroup[] = item.modifierGroups.map((junc) => ({
      id: junc.modifierGroup.id,
      name: junc.modifierGroup.name,
      isRequired: junc.modifierGroup.isRequired,
      minSelect: junc.modifierGroup.minSelect,
      maxSelect: junc.modifierGroup.maxSelect,
      modifiers: junc.modifierGroup.modifiers.map((mod) => ({
        id: mod.id,
        name: mod.name,
        priceAdjustment: parseFloat(mod.priceAdjustment),
        sortOrder: mod.sortOrder,
        isAvailable: mod.isAvailable,
      })),
    }))

    resolvedItems.push({
      categoryId: item.categoryId,
      id: item.id,
      name: item.name,
      description: item.description,
      basePrice,
      resolvedPrice,
      imageUrl: item.imageUrl,
      prepTimeMin: item.prepTimeMin,
      dietaryTags: item.dietaryTags,
      calories: item.calories,
      isAvailable: item.isAvailable,
      station: item.station,
      sortOrder: item.sortOrder,
      modifierGroups: resolvedModifierGroups,
    })
  }

  // Group by category
  const result: ResolvedCategory[] = []
  for (const category of categories) {
    const categoryItems = resolvedItems.filter((i) => i.categoryId === category.id)
    if (categoryItems.length === 0) continue
    result.push({
      id: category.id,
      name: category.name,
      description: category.description,
      imageUrl: category.imageUrl,
      sortOrder: category.sortOrder,
      items: categoryItems.map(({ categoryId: _, ...item }) => item),
    })
  }

  return result
}
