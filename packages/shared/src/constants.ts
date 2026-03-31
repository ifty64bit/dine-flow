export const TABLE_STATUSES = ['vacant', 'occupied', 'reserved', 'cleaning', 'merged'] as const
export type TableStatus = (typeof TABLE_STATUSES)[number]

export const ORDER_STATUSES = ['placed', 'confirmed', 'preparing', 'ready', 'served', 'cancelled'] as const
export type OrderStatus = (typeof ORDER_STATUSES)[number]

export const ORDER_ITEM_STATUSES = ['queued', 'preparing', 'ready', 'served'] as const
export type OrderItemStatus = (typeof ORDER_ITEM_STATUSES)[number]

export const KITCHEN_STATIONS = ['grill', 'fryer', 'salad', 'drinks', 'dessert', 'general'] as const
export type KitchenStation = (typeof KITCHEN_STATIONS)[number]

export const VISIBILITY_MODES = ['all', 'include', 'exclude'] as const
export type VisibilityMode = (typeof VISIBILITY_MODES)[number]

export const DIETARY_TAGS = [
  'vegetarian',
  'vegan',
  'gluten-free',
  'dairy-free',
  'nut-free',
  'halal',
  'spicy',
] as const
export type DietaryTag = (typeof DIETARY_TAGS)[number]

export const USER_ROLES = ['admin', 'manager', 'staff'] as const
export type UserRoleConst = (typeof USER_ROLES)[number]

export const STAFF_TYPES = ['waiter', 'kitchen', 'cashier'] as const
export type StaffType = (typeof STAFF_TYPES)[number]

export const RESERVATION_STATUSES = ['pending', 'confirmed', 'seated', 'completed', 'no_show', 'cancelled'] as const
export type ReservationStatus = (typeof RESERVATION_STATUSES)[number]

export const TABLE_STATUS_COLORS: Record<string, string> = {
  vacant: '#22c55e',
  occupied: '#ef4444',
  reserved: '#f59e0b',
  cleaning: '#8b5cf6',
  merged: '#3b82f6',
}

export const ORDER_STATUS_COLORS: Record<string, string> = {
  placed: '#6b7280',
  confirmed: '#3b82f6',
  preparing: '#f59e0b',
  ready: '#22c55e',
  served: '#8b5cf6',
  cancelled: '#ef4444',
}
