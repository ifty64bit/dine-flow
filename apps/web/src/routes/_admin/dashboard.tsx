import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'

export const Route = createFileRoute('/_admin/dashboard')({
  component: DashboardPage,
})

function DashboardPage() {
  const tablesQ = useQuery({
    queryKey: ['admin-tables'],
    queryFn: () => api.get<{ data: { status: string }[] }>('/api/v1/admin/tables'),
  })

  const tables = tablesQ.data?.data ?? []
  const occupied = tables.filter((t) => t.status === 'occupied').length
  const vacant = tables.filter((t) => t.status === 'vacant').length
  const reserved = tables.filter((t) => t.status === 'reserved').length

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard label="Occupied tables" value={occupied} color="text-red-600" />
        <StatCard label="Vacant tables" value={vacant} color="text-green-600" />
        <StatCard label="Reserved tables" value={reserved} color="text-amber-600" />
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 text-blue-800 text-sm">
        <p className="font-medium mb-1">Analytics coming soon</p>
        <p className="text-blue-600">Revenue charts, popular items, and peak hours will appear here in a future update.</p>
      </div>
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
    </div>
  )
}
