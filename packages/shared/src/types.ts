// Shared TypeScript types used across API and Web

export interface ApiResponse<T> {
  data: T
  message?: string
}

export interface ApiError {
  error: string
  message: string
  statusCode: number
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
}

export interface WsEventOrderNew {
  type: 'order:new'
  payload: {
    orderId: number
    orderNumber: string
    sessionId: number
    tableId: number
    tableNumber: number
    branchId: number
    items: {
      id: number
      name: string
      quantity: number
      station: string | null
      specialInstructions: string | null
    }[]
    createdAt: string
  }
}

export interface WsEventOrderStatusUpdate {
  type: 'order:status_update'
  payload: {
    orderId: number
    orderNumber: string
    sessionId: number
    status: string
    updatedAt: string
  }
}

export interface WsEventItemStatusUpdate {
  type: 'item:status_update'
  payload: {
    orderItemId: number
    orderId: number
    sessionId: number
    status: string
    updatedAt: string
  }
}

export interface WsEventTableStatusChange {
  type: 'table:status_change'
  payload: {
    tableId: number
    tableNumber: number
    branchId: number
    status: string
    updatedAt: string
  }
}

export interface WsEventItemAvailability {
  type: 'item:availability'
  payload: {
    menuItemId: number
    name: string
    isAvailable: boolean
  }
}

export interface WsEventKitchenAlert {
  type: 'kitchen:alert'
  payload: {
    message: string
    severity: 'info' | 'warning' | 'error'
    branchId: number
  }
}

export type WsEvent =
  | WsEventOrderNew
  | WsEventOrderStatusUpdate
  | WsEventItemStatusUpdate
  | WsEventTableStatusChange
  | WsEventItemAvailability
  | WsEventKitchenAlert
