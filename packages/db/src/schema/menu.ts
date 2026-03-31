import {
  pgTable, uuid, varchar, text, numeric, integer, boolean,
  jsonb, timestamp, primaryKey, index, unique
} from 'drizzle-orm/pg-core'
import { visibilityModeEnum, classRuleTypeEnum, kitchenStationEnum } from './enums.js'
import { branches } from './branches.js'
import { tableClasses } from './table-classes.js'

export const menuCategories = pgTable('menu_categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  branchId: uuid('branch_id').references(() => branches.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  imageUrl: varchar('image_url', { length: 500 }),
  sortOrder: integer('sort_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('menu_categories_branch_id_idx').on(table.branchId),
])

export const menuItems = pgTable('menu_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  categoryId: uuid('category_id').notNull().references(() => menuCategories.id, { onDelete: 'cascade' }),
  branchId: uuid('branch_id').references(() => branches.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  basePrice: numeric('base_price', { precision: 10, scale: 2 }).notNull(),
  imageUrl: varchar('image_url', { length: 500 }),
  prepTimeMin: integer('prep_time_min').notNull().default(15),
  dietaryTags: text('dietary_tags').array().notNull().default([]),
  calories: integer('calories'),
  isAvailable: boolean('is_available').notNull().default(true),
  station: kitchenStationEnum('station'),
  visibilityMode: visibilityModeEnum('visibility_mode').notNull().default('all'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('menu_items_category_id_idx').on(table.categoryId),
  index('menu_items_branch_id_idx').on(table.branchId),
])

export const menuItemClassRules = pgTable('menu_item_class_rules', {
  id: uuid('id').primaryKey().defaultRandom(),
  menuItemId: uuid('menu_item_id').notNull().references(() => menuItems.id, { onDelete: 'cascade' }),
  tableClassId: uuid('table_class_id').notNull().references(() => tableClasses.id, { onDelete: 'cascade' }),
  ruleType: classRuleTypeEnum('rule_type').notNull(),
  priceOverride: numeric('price_override', { precision: 10, scale: 2 }),
}, (table) => [
  unique('menu_item_class_rules_item_class_unique').on(table.menuItemId, table.tableClassId),
  index('menu_item_class_rules_item_idx').on(table.menuItemId),
  index('menu_item_class_rules_class_idx').on(table.tableClassId),
])

export const modifierGroups = pgTable('modifier_groups', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  isRequired: boolean('is_required').notNull().default(false),
  minSelect: integer('min_select').notNull().default(0),
  maxSelect: integer('max_select').notNull().default(1),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const menuItemModifierGroups = pgTable('menu_item_modifier_groups', {
  menuItemId: uuid('menu_item_id').notNull().references(() => menuItems.id, { onDelete: 'cascade' }),
  modifierGroupId: uuid('modifier_group_id').notNull().references(() => modifierGroups.id, { onDelete: 'cascade' }),
}, (table) => [
  primaryKey({ columns: [table.menuItemId, table.modifierGroupId] }),
  index('menu_item_modifier_groups_item_idx').on(table.menuItemId),
  index('menu_item_modifier_groups_group_idx').on(table.modifierGroupId),
])

export const modifiers = pgTable('modifiers', {
  id: uuid('id').primaryKey().defaultRandom(),
  groupId: uuid('group_id').notNull().references(() => modifierGroups.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  priceAdjustment: numeric('price_adjustment', { precision: 10, scale: 2 }).notNull().default('0'),
  sortOrder: integer('sort_order').notNull().default(0),
  isAvailable: boolean('is_available').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('modifiers_group_id_idx').on(table.groupId),
])
