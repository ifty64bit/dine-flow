import React, { createContext, useContext, useReducer } from 'react'

export interface CartModifier {
  modifierId: string
  name: string
  priceAdjustment: number
}

export interface CartItem {
  menuItemId: string
  name: string
  quantity: number
  unitPrice: number
  modifiers: CartModifier[]
  specialInstructions?: string
}

interface CartState {
  sessionId: string | null
  branchId: string | null
  tableId: string | null
  items: CartItem[]
}

type CartAction =
  | { type: 'SET_SESSION'; sessionId: string; branchId: string; tableId: string }
  | { type: 'ADD_ITEM'; item: CartItem }
  | { type: 'REMOVE_ITEM'; menuItemId: string }
  | { type: 'UPDATE_QUANTITY'; menuItemId: string; quantity: number }
  | { type: 'CLEAR' }

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'SET_SESSION':
      return { ...state, sessionId: action.sessionId, branchId: action.branchId, tableId: action.tableId }
    case 'ADD_ITEM': {
      const existing = state.items.findIndex((i) => i.menuItemId === action.item.menuItemId)
      if (existing >= 0) {
        const items = [...state.items]
        items[existing] = { ...items[existing], quantity: items[existing].quantity + action.item.quantity }
        return { ...state, items }
      }
      return { ...state, items: [...state.items, action.item] }
    }
    case 'REMOVE_ITEM':
      return { ...state, items: state.items.filter((i) => i.menuItemId !== action.menuItemId) }
    case 'UPDATE_QUANTITY':
      return {
        ...state,
        items: state.items
          .map((i) =>
            i.menuItemId === action.menuItemId ? { ...i, quantity: action.quantity } : i
          )
          .filter((i) => i.quantity > 0),
      }
    case 'CLEAR':
      return { ...state, items: [] }
    default:
      return state
  }
}

interface CartContextValue {
  state: CartState
  dispatch: React.Dispatch<CartAction>
  total: number
  itemCount: number
}

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, {
    sessionId: null,
    branchId: null,
    tableId: null,
    items: [],
  })

  const total = state.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
  const itemCount = state.items.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <CartContext.Provider value={{ state, dispatch, total, itemCount }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used inside CartProvider')
  return ctx
}
