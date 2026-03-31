import { relations } from 'drizzle-orm'
import { branches } from './branches.js'
import { users } from './users.js'
import { floors } from './floors.js'
import { tables } from './tables.js'
import { tableClasses } from './table-classes.js'
import { menuCategories, menuItems, menuItemClassRules, modifierGroups, menuItemModifierGroups, modifiers } from './menu.js'
import { sessions, orders, orderItems } from './orders.js'
import { reservations } from './reservations.js'
import { payments, feedback, waiterCalls, auditLogs } from './payments.js'

export const branchesRelations = relations(branches, ({ many }) => ({
  floors: many(floors),
  menuCategories: many(menuCategories),
  menuItems: many(menuItems),
  reservations: many(reservations),
  users: many(users),
}))

export const usersRelations = relations(users, ({ one, many }) => ({
  branch: one(branches, { fields: [users.branchId], references: [branches.id] }),
  orders: many(orders),
  auditLogs: many(auditLogs),
}))

export const floorsRelations = relations(floors, ({ one, many }) => ({
  branch: one(branches, { fields: [floors.branchId], references: [branches.id] }),
  tables: many(tables),
}))

export const tableClassesRelations = relations(tableClasses, ({ many }) => ({
  tables: many(tables),
  menuItemClassRules: many(menuItemClassRules),
  sessions: many(sessions),
  reservations: many(reservations),
}))

export const tablesRelations = relations(tables, ({ one, many }) => ({
  floor: one(floors, { fields: [tables.floorId], references: [floors.id] }),
  tableClass: one(tableClasses, { fields: [tables.tableClassId], references: [tableClasses.id] }),
  sessions: many(sessions),
  reservations: many(reservations),
}))

export const menuCategoriesRelations = relations(menuCategories, ({ one, many }) => ({
  branch: one(branches, { fields: [menuCategories.branchId], references: [branches.id] }),
  items: many(menuItems),
}))

export const menuItemsRelations = relations(menuItems, ({ one, many }) => ({
  category: one(menuCategories, { fields: [menuItems.categoryId], references: [menuCategories.id] }),
  branch: one(branches, { fields: [menuItems.branchId], references: [branches.id] }),
  classRules: many(menuItemClassRules),
  modifierGroups: many(menuItemModifierGroups),
  orderItems: many(orderItems),
}))

export const menuItemClassRulesRelations = relations(menuItemClassRules, ({ one }) => ({
  menuItem: one(menuItems, { fields: [menuItemClassRules.menuItemId], references: [menuItems.id] }),
  tableClass: one(tableClasses, { fields: [menuItemClassRules.tableClassId], references: [tableClasses.id] }),
}))

export const modifierGroupsRelations = relations(modifierGroups, ({ many }) => ({
  modifiers: many(modifiers),
  menuItems: many(menuItemModifierGroups),
}))

export const menuItemModifierGroupsRelations = relations(menuItemModifierGroups, ({ one }) => ({
  menuItem: one(menuItems, { fields: [menuItemModifierGroups.menuItemId], references: [menuItems.id] }),
  modifierGroup: one(modifierGroups, { fields: [menuItemModifierGroups.modifierGroupId], references: [modifierGroups.id] }),
}))

export const modifiersRelations = relations(modifiers, ({ one }) => ({
  group: one(modifierGroups, { fields: [modifiers.groupId], references: [modifierGroups.id] }),
}))

export const sessionsRelations = relations(sessions, ({ one, many }) => ({
  table: one(tables, { fields: [sessions.tableId], references: [tables.id] }),
  tableClass: one(tableClasses, { fields: [sessions.tableClassId], references: [tableClasses.id] }),
  orders: many(orders),
  payments: many(payments),
  feedback: many(feedback),
  waiterCalls: many(waiterCalls),
}))

export const ordersRelations = relations(orders, ({ one, many }) => ({
  session: one(sessions, { fields: [orders.sessionId], references: [sessions.id] }),
  waiter: one(users, { fields: [orders.waiterId], references: [users.id] }),
  items: many(orderItems),
}))

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  menuItem: one(menuItems, { fields: [orderItems.menuItemId], references: [menuItems.id] }),
}))

export const reservationsRelations = relations(reservations, ({ one }) => ({
  branch: one(branches, { fields: [reservations.branchId], references: [branches.id] }),
  table: one(tables, { fields: [reservations.tableId], references: [tables.id] }),
  preferredClass: one(tableClasses, { fields: [reservations.preferredClassId], references: [tableClasses.id] }),
}))

// FUTURE relations
export const paymentsRelations = relations(payments, ({ one }) => ({
  session: one(sessions, { fields: [payments.sessionId], references: [sessions.id] }),
}))

export const feedbackRelations = relations(feedback, ({ one }) => ({
  session: one(sessions, { fields: [feedback.sessionId], references: [sessions.id] }),
}))

export const waiterCallsRelations = relations(waiterCalls, ({ one }) => ({
  session: one(sessions, { fields: [waiterCalls.sessionId], references: [sessions.id] }),
}))

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, { fields: [auditLogs.userId], references: [users.id] }),
}))
