import { z } from 'zod'

// Operating hours — keyed by day ("mon","tue","wed","thu","fri","sat","sun")
export const operatingHoursDaySchema = z.object({
  open: z.string().regex(/^\d{2}:\d{2}$/, 'Format HH:MM'),
  close: z.string().regex(/^\d{2}:\d{2}$/, 'Format HH:MM'),
  closed: z.boolean().optional().default(false),
})
export const operatingHoursSchema = z.record(
  z.enum(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']),
  operatingHoursDaySchema
)
export type OperatingHours = z.infer<typeof operatingHoursSchema>

// Branch
export const createBranchSchema = z.object({
  name: z.string().min(1).max(255),
  address: z.string().max(500).optional(),
  phone: z.string().max(50).optional(),
  operatingHours: operatingHoursSchema.optional().default({}),
  isActive: z.boolean().optional().default(true),
})
export const updateBranchSchema = createBranchSchema.partial()

// User (staff)
export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1).max(255),
  role: z.enum(['admin', 'manager', 'staff']),
  staffType: z.enum(['waiter', 'kitchen', 'cashier']).optional(),
  branchId: z.number().int().positive().optional(),
  isActive: z.boolean().optional().default(true),
})
export const updateUserSchema = createUserSchema.omit({ password: true }).partial().extend({
  password: z.string().min(6).optional(),
})

// Table Class
export const createTableClassSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  description: z.string().max(500).optional(),
  badgeColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#6B7280'),
  priceMultiplier: z.string().regex(/^\d+(\.\d{1,2})?$/).default('1.00'),
  sortOrder: z.number().int().default(0),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
})
export const updateTableClassSchema = createTableClassSchema.partial()

// Table
export const createTableSchema = z.object({
  branchId: z.number().int().positive(),
  tableClassId: z.number().int().positive(),
  number: z.number().int().positive(),
  floorName: z.string().max(100).optional(),
  capacity: z.number().int().positive().default(4),
  shape: z.enum(['round', 'square', 'rectangle']).default('square'),
  positionX: z.string().optional().default('0'),
  positionY: z.string().optional().default('0'),
})
export const updateTableStatusSchema = z.object({
  status: z.enum(['vacant', 'occupied', 'reserved', 'cleaning', 'merged']),
})
export const updateTableSchema = createTableSchema.partial()

// Menu Category
export const createMenuCategorySchema = z.object({
  branchId: z.number().int().positive().optional(),
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  imageUrl: z.string().url().optional(),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
})
export const updateMenuCategorySchema = createMenuCategorySchema.partial()

// Menu Item
export const createMenuItemSchema = z.object({
  categoryId: z.number().int().positive(),
  branchId: z.number().int().positive().optional(),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  basePrice: z.string().regex(/^\d+(\.\d{1,2})?$/),
  imageUrl: z.string().url().optional(),
  prepTimeMin: z.number().int().min(0).default(15),
  dietaryTags: z.array(z.string()).default([]),
  calories: z.number().int().positive().optional(),
  isAvailable: z.boolean().default(true),
  station: z.enum(['grill', 'fryer', 'salad', 'drinks', 'dessert', 'general']).optional(),
  visibilityMode: z.enum(['all', 'include', 'exclude']).default('all'),
  sortOrder: z.number().int().default(0),
})
export const updateMenuItemSchema = createMenuItemSchema.partial()

// Menu Item Class Rule
export const createMenuItemClassRuleSchema = z.object({
  tableClassId: z.number().int().positive(),
  ruleType: z.enum(['include', 'exclude']),
  priceOverride: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
})

// Modifier Group
export const createModifierGroupSchema = z.object({
  branchId: z.number().int().positive(),
  name: z.string().min(1).max(100),
  isRequired: z.boolean().default(false),
  minSelect: z.number().int().min(0).default(0),
  maxSelect: z.number().int().min(1).default(1),
})
export const updateModifierGroupSchema = createModifierGroupSchema.partial()

// Modifier
export const createModifierSchema = z.object({
  groupId: z.number().int().positive(),
  name: z.string().min(1).max(100),
  priceAdjustment: z.string().regex(/^-?\d+(\.\d{1,2})?$/).default('0'),
  sortOrder: z.number().int().default(0),
  isAvailable: z.boolean().default(true),
})
export const updateModifierSchema = createModifierSchema.partial()

// Session
export const startSessionSchema = z.object({
  tableId: z.number().int().positive(),
  guestName: z.string().max(255).optional(),
})

// ─── Order modifiers ─────────────────────────────────────────────────────────

// Input: what the client sends when placing an order (IDs only — server resolves names/prices)
export const orderModifierInputSchema = z.object({
  modifierId: z.number().int().positive(),
  modifierGroupId: z.number().int().positive(),
})
export type OrderModifierInput = z.infer<typeof orderModifierInputSchema>

// Snapshot: what gets written into order_items.modifiers JSONB at order time.
// Captures the full state at purchase — immune to future price/name changes.
export const orderModifierSnapshotSchema = z.object({
  modifierId: z.number().int().positive(),
  modifierName: z.string(),
  modifierGroupId: z.number().int().positive(),
  modifierGroupName: z.string(),
  priceAdjustment: z.number(),
})
export type OrderModifierSnapshot = z.infer<typeof orderModifierSnapshotSchema>
export const orderModifiersSnapshotSchema = z.array(orderModifierSnapshotSchema)

// ─── Order ───────────────────────────────────────────────────────────────────

export const orderItemInputSchema = z.object({
  menuItemId: z.number().int().positive(),
  quantity: z.number().int().positive().max(99),
  modifiers: z.array(orderModifierInputSchema).default([]),
  specialInstructions: z.string().max(500).optional(),
})

export const createOrderSchema = z.object({
  sessionId: z.number().int().positive(),
  items: z.array(orderItemInputSchema).min(1),
  notes: z.string().max(1000).optional(),
})

// Reservation
export const createReservationSchema = z.object({
  branchId: z.number().int().positive(),
  tableId: z.number().int().positive().optional(),
  preferredClassId: z.number().int().positive().optional(),
  customerName: z.string().min(1).max(255),
  customerPhone: z.string().min(1).max(50),
  partySize: z.number().int().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  timeSlot: z.string().regex(/^\d{2}:\d{2}$/),
  durationMin: z.number().int().positive().default(90),
  specialRequests: z.string().max(1000).optional(),
})
export const updateReservationStatusSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'seated', 'completed', 'no_show', 'cancelled']),
})

// Settings
export const updateSettingsSchema = z.object({
  restaurantName: z.string().min(1).max(255).optional(),
  logoUrl: z.string().url().optional().nullable(),
  currency: z.string().max(10).optional(),
  timezone: z.string().max(100).optional(),
  taxRate: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  serviceChargeRate: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  taxInclusive: z.boolean().optional(),
  branding: z.record(z.unknown()).optional(),
})

// Auth
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export const registerSchema = z.object({
  orgName: z.string().min(2).max(255),
  name: z.string().min(1).max(255),
  email: z.string().email(),
  password: z.string().min(8).max(100),
  currency: z.string().max(10).optional().default('BDT'),
  timezone: z.string().max(100).optional().default('Asia/Dhaka'),
})
