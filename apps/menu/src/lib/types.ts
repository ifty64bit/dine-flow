export interface Modifier {
  id: number
  name: string
  priceAdjustment: number
  isAvailable: boolean
}

export interface ModifierGroup {
  id: number
  name: string
  isRequired: boolean
  minSelect: number
  maxSelect: number
  modifiers: Modifier[]
}

export interface MenuItem {
  id: number
  name: string
  description: string | null
  resolvedPrice: number
  imageUrl: string | null
  prepTimeMin: number
  dietaryTags: string[]
  isAvailable: boolean
  station: string | null
  modifierGroups: ModifierGroup[]
}

export interface Category {
  id: number
  name: string
  description: string | null
  items: MenuItem[]
}

export interface Session {
  id: number
  tableId: number
  branchId: number
  isActive: boolean
}

export interface OrderPayload {
  sessionId: number
  items: {
    menuItemId: number
    quantity: number
    modifiers: { modifierId: number; modifierGroupId: number }[]
    specialInstructions?: string
  }[]
}

export interface OrderResult {
  order: { id: number; orderNumber: number }
  items: { id: number }[]
}

export interface CustomerOrderItem {
  id: number
  orderId: number
  menuItemId: number
  quantity: number
  unitPrice: string
  modifiers: unknown
  specialInstructions: string | null
  status: 'queued' | 'preparing' | 'ready' | 'served'
  station: string | null
  createdAt: string
  updatedAt: string
  menuItem: {
    id: number
    name: string
    description: string | null
    basePrice: string
    imageUrl: string | null
    isAvailable: boolean
  }
}

export interface CustomerOrder {
  id: number
  sessionId: number
  branchId: number
  orderNumber: string
  status: 'placed' | 'confirmed' | 'preparing' | 'ready' | 'served' | 'cancelled'
  subtotal: string
  taxAmount: string
  serviceCharge: string
  discountAmount: string
  total: string
  notes: string | null
  createdBy: string
  createdAt: string
  updatedAt: string
  items: CustomerOrderItem[]
}

export type SessionEvent =
  | { type: 'order:new'; payload: { orderId: number; orderNumber: string } }
  | { type: 'order:status_update'; payload: { orderId: number; status: string } }
  | { type: 'item:status_update'; payload: { orderItemId: number; orderId: number; status: string } }
