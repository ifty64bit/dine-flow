import { relations } from 'drizzle-orm'
import { organizations, subscriptionPlans, subscriptions } from './organizations.js'
import { organizationMembers } from './organization-members.js'
import { branches } from './branches.js'
import { users } from './users.js'
import { tables } from './tables.js'
import { tableClasses } from './table-classes.js'
import { menuCategories, menuItems, menuItemClassRules, modifierGroups, menuItemModifierGroups, modifiers } from './menu.js'
import { sessions, orders, orderItems, orderCounters } from './orders.js'
import { reservations } from './reservations.js'
import { payments, feedback, waiterCalls, auditLogs } from './payments.js'

// ─── Organizations ───────────────────────────────────────────────────────────

export const organizationsRelations = relations(organizations, ({ many, one }) => ({
  branches: many(branches),
  tableClasses: many(tableClasses),
  members: many(organizationMembers),
  subscriptions: many(subscriptions),
  auditLogs: many(auditLogs),
}))

export const subscriptionPlansRelations = relations(subscriptionPlans, ({ many }) => ({
  subscriptions: many(subscriptions),
}))

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  organization: one(organizations, { fields: [subscriptions.organizationId], references: [organizations.id] }),
  plan: one(subscriptionPlans, { fields: [subscriptions.planId], references: [subscriptionPlans.id] }),
}))

export const organizationMembersRelations = relations(organizationMembers, ({ one }) => ({
  organization: one(organizations, { fields: [organizationMembers.organizationId], references: [organizations.id] }),
  user: one(users, { fields: [organizationMembers.userId], references: [users.id] }),
  branch: one(branches, { fields: [organizationMembers.branchId], references: [branches.id] }),
}))

// ─── Users ───────────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(organizationMembers),
  orders: many(orders),
  auditLogs: many(auditLogs),
}))

// ─── Branches ────────────────────────────────────────────────────────────────

export const branchesRelations = relations(branches, ({ one, many }) => ({
  organization: one(organizations, { fields: [branches.organizationId], references: [organizations.id] }),
  tables: many(tables),
  menuCategories: many(menuCategories),
  menuItems: many(menuItems),
  modifierGroups: many(modifierGroups),
  reservations: many(reservations),
  sessions: many(sessions),
  orders: many(orders),
  orderCounter: many(orderCounters),
}))

// ─── Table Classes ────────────────────────────────────────────────────────────

export const tableClassesRelations = relations(tableClasses, ({ one, many }) => ({
  organization: one(organizations, { fields: [tableClasses.organizationId], references: [organizations.id] }),
  tables: many(tables),
  menuItemClassRules: many(menuItemClassRules),
  sessions: many(sessions),
  reservations: many(reservations),
}))

// ─── Tables ──────────────────────────────────────────────────────────────────

export const tablesRelations = relations(tables, ({ one, many }) => ({
  branch: one(branches, { fields: [tables.branchId], references: [branches.id] }),
  tableClass: one(tableClasses, { fields: [tables.tableClassId], references: [tableClasses.id] }),
  sessions: many(sessions),
  reservations: many(reservations),
}))

// ─── Menu ─────────────────────────────────────────────────────────────────────

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

export const modifierGroupsRelations = relations(modifierGroups, ({ one, many }) => ({
  branch: one(branches, { fields: [modifierGroups.branchId], references: [branches.id] }),
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

// ─── Orders ───────────────────────────────────────────────────────────────────

export const orderCountersRelations = relations(orderCounters, ({ one }) => ({
  branch: one(branches, { fields: [orderCounters.branchId], references: [branches.id] }),
}))

export const sessionsRelations = relations(sessions, ({ one, many }) => ({
  branch: one(branches, { fields: [sessions.branchId], references: [branches.id] }),
  table: one(tables, { fields: [sessions.tableId], references: [tables.id] }),
  tableClass: one(tableClasses, { fields: [sessions.tableClassId], references: [tableClasses.id] }),
  orders: many(orders),
  payments: many(payments),
  feedback: many(feedback),
  waiterCalls: many(waiterCalls),
}))

export const ordersRelations = relations(orders, ({ one, many }) => ({
  branch: one(branches, { fields: [orders.branchId], references: [branches.id] }),
  session: one(sessions, { fields: [orders.sessionId], references: [sessions.id] }),
  waiter: one(users, { fields: [orders.waiterId], references: [users.id] }),
  items: many(orderItems),
}))

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  menuItem: one(menuItems, { fields: [orderItems.menuItemId], references: [menuItems.id] }),
}))

// ─── Reservations ─────────────────────────────────────────────────────────────

export const reservationsRelations = relations(reservations, ({ one }) => ({
  branch: one(branches, { fields: [reservations.branchId], references: [branches.id] }),
  table: one(tables, { fields: [reservations.tableId], references: [tables.id] }),
  preferredClass: one(tableClasses, { fields: [reservations.preferredClassId], references: [tableClasses.id] }),
}))

// ─── Payments / Future ────────────────────────────────────────────────────────

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
  organization: one(organizations, { fields: [auditLogs.organizationId], references: [organizations.id] }),
  branch: one(branches, { fields: [auditLogs.branchId], references: [branches.id] }),
  user: one(users, { fields: [auditLogs.userId], references: [users.id] }),
}))
