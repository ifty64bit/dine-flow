import { createFileRoute, Link } from '@tanstack/react-router'
import { z } from 'zod'
import { useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { DineFlowWS } from '../../lib/ws'

const searchSchema = z.object({ sessionId: z.string() })

export const Route = createFileRoute('/_customer/orders')({
  validateSearch: searchSchema,
  component: OrdersPage,
})

const STATUS_LABELS: Record<string, string> = {
  placed: 'Order received',
  confirmed: 'Confirmed',
  preparing: 'Being prepared',
  ready: 'Ready to serve!',
  served: 'Served',
  cancelled: 'Cancelled',
}

const STATUS_COLORS: Record<string, string> = {
  placed: 'bg-gray-100 text-gray-700',
  confirmed: 'bg-blue-50 text-blue-700',
  preparing: 'bg-amber-50 text-amber-700',
  ready: 'bg-green-50 text-green-700',
  served: 'bg-purple-50 text-purple-700',
  cancelled: 'bg-red-50 text-red-700',
}

const ITEM_STATUS_LABELS: Record<string, string> = {
  queued: 'Queued',
  preparing: 'Preparing',
  ready: 'Ready',
  served: 'Served',
}

function OrdersPage() {
  const { sessionId } = Route.useSearch()
  const queryClient = useQueryClient()
  const wsRef = useRef<DineFlowWS | null>(null)

  const ordersQ = useQuery({
    queryKey: ['customer-orders', sessionId],
    queryFn: () =>
      api.get<{ data: { id: string; orderNumber: string; status: string; total: string; items: { id: string; quantity: number; menuItem: { name: string }; status: string }[] }[] }>(
        `/api/v1/customer/orders/session/${sessionId}`
      ),
    refetchInterval: 15_000,
  })

  // WebSocket for real-time updates
  useEffect(() => {
    // We use a guest WS connection without auth for customer view
    // In production, store a guest token. For MVP, poll is the fallback.
    return () => {
      wsRef.current?.destroy()
    }
  }, [sessionId])

  const orders = ordersQ.data?.data ?? []

  if (ordersQ.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto pb-8">
      <div className="sticky top-0 bg-white border-b border-gray-200 z-10 px-4 py-3">
        <h1 className="text-lg font-bold text-gray-900">Your orders</h1>
      </div>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center">
          <div className="text-4xl mb-3">🍽️</div>
          <p className="text-gray-500">No orders yet. Browse the menu to order.</p>
        </div>
      ) : (
        <div className="px-4 py-4 space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <span className="font-semibold text-gray-900">{order.orderNumber}</span>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLORS[order.status] ?? ''}`}>
                  {STATUS_LABELS[order.status] ?? order.status}
                </span>
              </div>

              <div className="divide-y divide-gray-50">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">{item.quantity}×</span>
                      <span className="text-sm text-gray-900">{item.menuItem.name}</span>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      item.status === 'ready' ? 'bg-green-100 text-green-700' :
                      item.status === 'preparing' ? 'bg-amber-100 text-amber-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {ITEM_STATUS_LABELS[item.status] ?? item.status}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center px-4 py-3 bg-gray-50">
                <span className="text-sm text-gray-500">Total</span>
                <span className="font-semibold text-gray-900">৳{parseFloat(order.total).toFixed(0)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {order && (
        <div className="fixed bottom-4 left-4 right-4 max-w-2xl mx-auto">
          <button
            onClick={() => ordersQ.refetch()}
            className="w-full py-3 bg-gray-900 text-white font-medium rounded-2xl"
          >
            Refresh status
          </button>
        </div>
      )}
    </div>
  )
}
