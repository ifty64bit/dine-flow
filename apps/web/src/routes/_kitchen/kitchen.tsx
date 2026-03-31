import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { useAuthStore } from '../../store/auth'
import { DineFlowWS } from '../../lib/ws'

export const Route = createFileRoute('/_kitchen/kitchen')({
  component: KDSPage,
})

interface OrderItem {
  id: string
  quantity: number
  status: string
  station: string | null
  specialInstructions: string | null
  menuItem: { name: string }
}

interface Order {
  id: string
  orderNumber: string
  status: string
  createdAt: string
  session: {
    table: { number: number }
  }
  items: OrderItem[]
}

interface OrderGroups {
  placed: Order[]
  confirmed: Order[]
  preparing: Order[]
}

function elapsed(createdAt: string): string {
  const diff = Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000)
  if (diff < 60) return `${diff}s`
  return `${Math.floor(diff / 60)}m ${diff % 60}s`
}

function KDSPage() {
  const user = useAuthStore((s) => s.user)
  const token = useAuthStore((s) => s.token)
  const qc = useQueryClient()
  const wsRef = useRef<DineFlowWS | null>(null)
  const [now, setNow] = useState(Date.now())

  const branchId = user?.branchId ?? ''

  const ordersQ = useQuery({
    queryKey: ['kitchen-orders', branchId],
    queryFn: () => api.get<{ data: OrderGroups }>(`/api/v1/kitchen/${branchId}`),
    refetchInterval: 10_000,
    enabled: !!branchId,
  })

  // Live timer
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 5000)
    return () => clearInterval(t)
  }, [])

  // WebSocket
  useEffect(() => {
    if (!token || !branchId) return
    wsRef.current = new DineFlowWS(token, [`kitchen:${branchId}`])
    const off = wsRef.current.on((event) => {
      if (event.type === 'order:new' || event.type === 'order:status_update' || event.type === 'item:status_update') {
        qc.invalidateQueries({ queryKey: ['kitchen-orders', branchId] })
      }
    })
    return () => {
      off()
      wsRef.current?.destroy()
    }
  }, [token, branchId])

  const updateItemStatus = useMutation({
    mutationFn: ({ itemId, status }: { itemId: string; status: string }) =>
      api.put(`/api/v1/kitchen/items/${itemId}/status`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kitchen-orders', branchId] }),
  })

  const updateOrderStatus = useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: string }) =>
      api.put(`/api/v1/kitchen/orders/${orderId}/status`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kitchen-orders', branchId] }),
  })

  const data = ordersQ.data?.data ?? { placed: [], confirmed: [], preparing: [] }

  const COLUMNS = [
    { key: 'placed' as const, label: 'New', color: 'border-amber-400', nextStatus: 'confirmed', nextLabel: 'Confirm' },
    { key: 'confirmed' as const, label: 'Confirmed', color: 'border-blue-400', nextStatus: 'preparing', nextLabel: 'Start' },
    { key: 'preparing' as const, label: 'Preparing', color: 'border-purple-400', nextStatus: 'ready', nextLabel: 'Ready' },
  ]

  void now

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="px-6 py-3 border-b border-gray-700 flex items-center justify-between">
        <h1 className="text-lg font-bold">Kitchen Display</h1>
        <span className="text-sm text-gray-400">
          {data.placed.length + data.confirmed.length + data.preparing.length} active orders
        </span>
      </div>

      {/* Kanban board */}
      <div className="flex-1 grid grid-cols-3 gap-4 p-4 overflow-hidden">
        {COLUMNS.map((col) => (
          <div key={col.key} className="flex flex-col overflow-hidden">
            <div className={`flex items-center justify-between mb-3 pb-2 border-b-2 ${col.color}`}>
              <h2 className="font-semibold text-gray-200">{col.label}</h2>
              <span className="text-sm text-gray-400">{data[col.key].length}</span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {data[col.key].map((order) => {
                const ageMs = Date.now() - new Date(order.createdAt).getTime()
                const urgent = ageMs > 15 * 60 * 1000

                return (
                  <div
                    key={order.id}
                    className={`bg-gray-800 rounded-xl p-3 border ${urgent ? 'border-red-500' : 'border-gray-700'}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-white">{order.orderNumber}</span>
                      <span className="text-xs text-gray-400">Table {order.session.table.number}</span>
                    </div>

                    <div className="space-y-1 mb-3">
                      {order.items.map((item) => (
                        <div key={item.id} className="flex items-start gap-2">
                          <button
                            onClick={() => {
                              const next = item.status === 'queued' ? 'preparing' : item.status === 'preparing' ? 'ready' : 'served'
                              if (item.status !== 'ready' && item.status !== 'served') {
                                updateItemStatus.mutate({ itemId: item.id, status: next })
                              }
                            }}
                            className={`mt-0.5 w-4 h-4 rounded flex-shrink-0 border ${
                              item.status === 'ready' || item.status === 'served'
                                ? 'bg-green-500 border-green-500'
                                : item.status === 'preparing'
                                ? 'bg-amber-500 border-amber-500'
                                : 'border-gray-500'
                            }`}
                          />
                          <div className="flex-1">
                            <span className={`text-sm ${item.status === 'ready' ? 'line-through text-gray-500' : 'text-gray-200'}`}>
                              {item.quantity}× {item.menuItem.name}
                            </span>
                            {item.specialInstructions && (
                              <p className="text-xs text-amber-400 mt-0.5">{item.specialInstructions}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between">
                      <span className={`text-xs ${urgent ? 'text-red-400 font-bold' : 'text-gray-500'}`}>
                        {elapsed(order.createdAt)} ago
                      </span>
                      <button
                        onClick={() => updateOrderStatus.mutate({ orderId: order.id, status: col.nextStatus })}
                        className="text-xs px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                      >
                        {col.nextLabel} →
                      </button>
                    </div>
                  </div>
                )
              })}
              {data[col.key].length === 0 && (
                <p className="text-center text-gray-600 text-sm mt-6">Empty</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
