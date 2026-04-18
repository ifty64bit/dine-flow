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
