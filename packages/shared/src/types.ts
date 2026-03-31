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
    orderId: string
    orderNumber: string
    sessionId: string
    tableId: string
    tableNumber: number
    branchId: string
    items: {
      id: string
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
    orderId: string
    orderNumber: string
    sessionId: string
    status: string
    updatedAt: string
  }
}

export interface WsEventItemStatusUpdate {
  type: 'item:status_update'
  payload: {
    orderItemId: string
    orderId: string
    sessionId: string
    status: string
    updatedAt: string
  }
}

export interface WsEventTableStatusChange {
  type: 'table:status_change'
  payload: {
    tableId: string
    tableNumber: number
    floorId: string
    branchId: string
    status: string
    updatedAt: string
  }
}

export interface WsEventItemAvailability {
  type: 'item:availability'
  payload: {
    menuItemId: string
    name: string
    isAvailable: boolean
  }
}

export interface WsEventKitchenAlert {
  type: 'kitchen:alert'
  payload: {
    message: string
    severity: 'info' | 'warning' | 'error'
    branchId: string
  }
}

export type WsEvent =
  | WsEventOrderNew
  | WsEventOrderStatusUpdate
  | WsEventItemStatusUpdate
  | WsEventTableStatusChange
  | WsEventItemAvailability
  | WsEventKitchenAlert
