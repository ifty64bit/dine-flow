import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { useAuthStore } from '../../store/auth'
import { DineFlowWS } from '../../lib/ws'
import { TABLE_STATUS_COLORS } from '@dineflow/shared'

export const Route = createFileRoute('/_waiter/waiter')({
  component: WaiterPage,
})

interface TableEntry {
  id: string
  number: number
  capacity: number
  status: string
  tableClass: { name: string; badgeColor: string }
  activeSession: {
    id: string
    orders: { id: string; orderNumber: string; status: string; total: string }[]
  } | null
}

interface FloorEntry {
  id: string
  name: string
  tables: TableEntry[]
}

function WaiterPage() {
  const user = useAuthStore((s) => s.user)
  const token = useAuthStore((s) => s.token)
  const qc = useQueryClient()
  const wsRef = useRef<DineFlowWS | null>(null)
  const [selectedTable, setSelectedTable] = useState<TableEntry | null>(null)
  const [notifications, setNotifications] = useState<{ id: string; message: string }[]>([])

  const branchId = user?.branchId ?? ''

  const tablesQ = useQuery({
    queryKey: ['waiter-tables', branchId],
    queryFn: () => api.get<{ data: FloorEntry[] }>(`/api/v1/waiter/tables/${branchId}`),
    refetchInterval: 30_000,
    enabled: !!branchId,
  })

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.put(`/api/v1/admin/tables/${id}/status`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['waiter-tables', branchId] }),
  })

  // WebSocket
  useEffect(() => {
    if (!token || !branchId) return
    wsRef.current = new DineFlowWS(token, [`waiter:${branchId}`])
    const off = wsRef.current.on((event) => {
      if (event.type === 'order:new') {
        qc.invalidateQueries({ queryKey: ['waiter-tables', branchId] })
        const n = { id: crypto.randomUUID(), message: `New order ${event.payload.orderNumber} — Table ${event.payload.tableNumber}` }
        setNotifications((s) => [n, ...s].slice(0, 5))
        setTimeout(() => setNotifications((s) => s.filter((x) => x.id !== n.id)), 8000)
      } else if (event.type === 'table:status_change') {
        qc.invalidateQueries({ queryKey: ['waiter-tables', branchId] })
      } else if (event.type === 'item:status_update') {
        qc.invalidateQueries({ queryKey: ['waiter-tables', branchId] })
      }
    })
    return () => {
      off()
      wsRef.current?.destroy()
    }
  }, [token, branchId])

  const floors = tablesQ.data?.data ?? []
  const allTables = floors.flatMap((f) => f.tables)

  return (
    <div className="max-w-4xl mx-auto p-4 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold text-gray-900">Waiter Dashboard</h1>
        <span className="text-sm text-gray-500">{user?.name}</span>
      </div>

      {/* Notification toasts */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {notifications.map((n) => (
          <div
            key={n.id}
            className="bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm shadow-lg animate-in slide-in-from-right"
          >
            🔔 {n.message}
          </div>
        ))}
      </div>

      {/* Floor tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {floors.map((floor) => (
          <span key={floor.id} className="flex-shrink-0 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700">
            {floor.name}
          </span>
        ))}
      </div>

      {/* Table grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {allTables.map((table) => (
          <button
            key={table.id}
            onClick={() => setSelectedTable(table)}
            className="bg-white rounded-xl border-2 p-3 text-left hover:shadow-md transition-shadow"
            style={{ borderColor: TABLE_STATUS_COLORS[table.status] ?? '#e5e7eb' }}
          >
            <div className="flex items-start justify-between mb-1.5">
              <p className="font-semibold text-gray-900">Table {table.number}</p>
              <span
                className="text-xs px-1.5 py-0.5 rounded-full text-white"
                style={{ backgroundColor: table.tableClass.badgeColor }}
              >
                {table.tableClass.name}
              </span>
            </div>
            <p
              className="text-xs font-medium capitalize"
              style={{ color: TABLE_STATUS_COLORS[table.status] ?? '#6b7280' }}
            >
              {table.status}
            </p>
            {table.activeSession && (
              <p className="text-xs text-gray-500 mt-1">
                {table.activeSession.orders.length} order{table.activeSession.orders.length !== 1 ? 's' : ''}
              </p>
            )}
          </button>
        ))}
      </div>

      {/* Table detail panel */}
      {selectedTable && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm max-h-[80vh] overflow-y-auto">
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Table {selectedTable.number}</h2>
                  <p
                    className="text-sm font-medium capitalize"
                    style={{ color: TABLE_STATUS_COLORS[selectedTable.status] }}
                  >
                    {selectedTable.status}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedTable(null)}
                  className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                >
                  ×
                </button>
              </div>

              {/* Status buttons */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                {['vacant', 'occupied', 'cleaning'].map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      updateStatus.mutate({ id: selectedTable.id, status: s })
                      setSelectedTable((t) => t ? { ...t, status: s } : null)
                    }}
                    className={`py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                      selectedTable.status === s
                        ? 'text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                    style={selectedTable.status === s ? { backgroundColor: TABLE_STATUS_COLORS[s] } : {}}
                  >
                    {s}
                  </button>
                ))}
              </div>

              {/* Session orders */}
              {selectedTable.activeSession ? (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">Active orders</h3>
                  <div className="space-y-2">
                    {selectedTable.activeSession.orders.map((order) => (
                      <div
                        key={order.id}
                        className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-lg"
                      >
                        <span className="text-sm font-medium text-gray-900">{order.orderNumber}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600">৳{parseFloat(order.total).toFixed(0)}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            order.status === 'ready' ? 'bg-green-100 text-green-700' :
                            order.status === 'preparing' ? 'bg-amber-100 text-amber-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {order.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">No active session</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
