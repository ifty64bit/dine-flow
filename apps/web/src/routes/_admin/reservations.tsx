import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'

export const Route = createFileRoute('/_admin/reservations')({
  component: ReservationsPage,
})

interface Reservation {
  id: string
  customerName: string
  customerPhone: string
  partySize: number
  date: string
  timeSlot: string
  status: string
  specialRequests: string | null
  durationMin: number
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700',
  confirmed: 'bg-blue-50 text-blue-700',
  seated: 'bg-purple-50 text-purple-700',
  completed: 'bg-green-50 text-green-700',
  no_show: 'bg-red-50 text-red-600',
  cancelled: 'bg-gray-50 text-gray-500',
}

function ReservationsPage() {
  const qc = useQueryClient()
  const today = new Date().toISOString().slice(0, 10)
  const [date, setDate] = useState(today)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({
    customerName: '',
    customerPhone: '',
    partySize: '2',
    date: today,
    timeSlot: '12:00',
    durationMin: '90',
    specialRequests: '',
    branchId: '',
  })

  const branchesQ = useQuery({
    queryKey: ['branches'],
    queryFn: () => api.get<{ data: { id: string; name: string }[] }>('/api/v1/admin/branches'),
  })

  const reservationsQ = useQuery({
    queryKey: ['reservations', date],
    queryFn: () =>
      api.get<{ data: Reservation[] }>(`/api/v1/admin/reservations?date=${date}`),
  })

  const create = useMutation({
    mutationFn: () =>
      api.post('/api/v1/admin/reservations', {
        ...form,
        partySize: parseInt(form.partySize),
        durationMin: parseInt(form.durationMin),
        branchId: form.branchId || branchesQ.data?.data[0]?.id,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reservations'] })
      setShowCreate(false)
    },
  })

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/api/v1/admin/reservations/${id}/status`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reservations'] }),
  })

  const reservations = reservationsQ.data?.data ?? []
  const f = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((s) => ({ ...s, [key]: e.target.value }))

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Reservations</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          + New reservation
        </button>
      </div>

      <div className="flex items-center gap-3 mb-5">
        <label className="text-sm font-medium text-gray-700">Date</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="space-y-3">
        {reservations.length === 0 ? (
          <p className="text-gray-500 text-sm">No reservations for this date.</p>
        ) : (
          reservations.map((r) => (
            <div key={r.id} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-gray-900">{r.customerName}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {r.timeSlot} · {r.partySize} guests · {r.customerPhone}
                  </p>
                  {r.specialRequests && (
                    <p className="text-xs text-gray-500 mt-1 italic">{r.specialRequests}</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLORS[r.status]}`}>
                    {r.status}
                  </span>
                  <select
                    value={r.status}
                    onChange={(e) => updateStatus.mutate({ id: r.id, status: e.target.value })}
                    className="text-xs px-2 py-1 border border-gray-200 rounded-lg focus:outline-none"
                  >
                    {['pending', 'confirmed', 'seated', 'completed', 'no_show', 'cancelled'].map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-gray-900 mb-4">New reservation</h2>
            <div className="space-y-3">
              {[
                { label: 'Customer name', key: 'customerName', type: 'text' },
                { label: 'Phone', key: 'customerPhone', type: 'text' },
                { label: 'Party size', key: 'partySize', type: 'number' },
                { label: 'Date', key: 'date', type: 'date' },
                { label: 'Time', key: 'timeSlot', type: 'time' },
                { label: 'Duration (min)', key: 'durationMin', type: 'number' },
              ].map(({ label, key, type }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                  <input
                    type={type}
                    value={(form as Record<string, string>)[key]}
                    onChange={f(key)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Special requests</label>
                <textarea
                  value={form.specialRequests}
                  onChange={f('specialRequests')}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none resize-none"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button
                onClick={() => create.mutate()}
                disabled={create.isPending || !form.customerName || !form.customerPhone}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {create.isPending ? 'Creating…' : 'Create'}
              </button>
              <button onClick={() => setShowCreate(false)} className="flex-1 py-2 text-gray-700 rounded-lg text-sm hover:bg-gray-100">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
