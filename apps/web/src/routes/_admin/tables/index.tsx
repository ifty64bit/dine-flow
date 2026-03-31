import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../../lib/api'
import { TABLE_STATUS_COLORS } from '@dineflow/shared'

export const Route = createFileRoute('/_admin/tables/')({
  component: TablesIndexPage,
})

interface TableClass {
  id: string
  name: string
  badgeColor: string
}

interface Table {
  id: string
  number: number
  capacity: number
  status: string
  positionX: string
  positionY: string
  tableClass: TableClass
  qrCodeUrl: string | null
}

interface Floor {
  id: string
  name: string
  tables: Table[]
}

function TablesIndexPage() {
  const qc = useQueryClient()
  const [selectedFloor, setSelectedFloor] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState({ number: '', capacity: '4', tableClassId: '' })

  const floorsQ = useQuery({
    queryKey: ['admin-floors'],
    queryFn: () => api.get<{ data: Floor[] }>('/api/v1/admin/tables/floors'),
  })

  const classesQ = useQuery({
    queryKey: ['table-classes'],
    queryFn: () => api.get<{ data: TableClass[] }>('/api/v1/admin/tables/classes'),
  })

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.put(`/api/v1/admin/tables/${id}/status`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-floors'] }),
  })

  const addTable = useMutation({
    mutationFn: () =>
      api.post('/api/v1/admin/tables', {
        floorId: selectedFloor,
        number: parseInt(addForm.number),
        capacity: parseInt(addForm.capacity),
        tableClassId: addForm.tableClassId,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-floors'] })
      setShowAdd(false)
      setAddForm({ number: '', capacity: '4', tableClassId: '' })
    },
  })

  const deleteTable = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/admin/tables/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-floors'] }),
  })

  const floors = floorsQ.data?.data ?? []
  const classes = classesQ.data?.data ?? []
  const activeFloor = selectedFloor
    ? floors.find((f) => f.id === selectedFloor)
    : floors[0]

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Floor Plan</h1>
        <button
          onClick={() => setShowAdd(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          + Table
        </button>
      </div>

      {/* Floor selector */}
      <div className="flex gap-2 mb-5">
        {floors.map((floor) => (
          <button
            key={floor.id}
            onClick={() => setSelectedFloor(floor.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              (activeFloor?.id === floor.id)
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {floor.name}
          </button>
        ))}
      </div>

      {/* Table grid */}
      {activeFloor && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {activeFloor.tables.map((table) => (
            <div
              key={table.id}
              className="bg-white rounded-xl border-2 p-4"
              style={{ borderColor: TABLE_STATUS_COLORS[table.status] ?? '#e5e7eb' }}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-semibold text-gray-900">Table {table.number}</p>
                  <p className="text-xs text-gray-500">{table.capacity} seats</p>
                </div>
                <span
                  className="text-xs px-2 py-0.5 rounded-full text-white font-medium"
                  style={{ backgroundColor: table.tableClass.badgeColor }}
                >
                  {table.tableClass.name}
                </span>
              </div>

              <div
                className="text-xs px-2 py-1 rounded-full text-center font-medium mb-3"
                style={{
                  backgroundColor: `${TABLE_STATUS_COLORS[table.status]}22`,
                  color: TABLE_STATUS_COLORS[table.status],
                }}
              >
                {table.status}
              </div>

              <select
                value={table.status}
                onChange={(e) => updateStatus.mutate({ id: table.id, status: e.target.value })}
                className="w-full text-xs px-2 py-1 border border-gray-200 rounded-lg focus:outline-none"
              >
                {['vacant', 'occupied', 'reserved', 'cleaning', 'merged'].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>

              {table.qrCodeUrl && (
                <a
                  href={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(table.qrCodeUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block mt-2 text-xs text-center text-blue-600 hover:text-blue-800"
                >
                  QR code
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add table modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Add table</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Table number</label>
                <input
                  type="number"
                  value={addForm.number}
                  onChange={(e) => setAddForm((s) => ({ ...s, number: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Capacity</label>
                <input
                  type="number"
                  value={addForm.capacity}
                  onChange={(e) => setAddForm((s) => ({ ...s, capacity: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Table class</label>
                <select
                  value={addForm.tableClassId}
                  onChange={(e) => setAddForm((s) => ({ ...s, tableClassId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none"
                >
                  <option value="">Select class…</option>
                  {classes.map((tc) => (
                    <option key={tc.id} value={tc.id}>{tc.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button
                onClick={() => addTable.mutate()}
                disabled={!addForm.number || !addForm.tableClassId || !selectedFloor}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {addTable.isPending ? 'Adding…' : 'Add table'}
              </button>
              <button onClick={() => setShowAdd(false)} className="flex-1 py-2 text-gray-700 rounded-lg text-sm hover:bg-gray-100">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
