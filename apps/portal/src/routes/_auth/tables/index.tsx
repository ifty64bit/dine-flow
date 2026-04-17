import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Table2, AlertCircle } from 'lucide-react'
import { client } from '@/lib/client'

export const Route = createFileRoute('/_auth/tables/')({
  component: TablesPage,
})

const STATUS_COLORS: Record<string, { bg: string; icon: string; badge: string; badgeText: string }> = {
  vacant:   { bg: 'bg-emerald-500/15', icon: 'text-emerald-400', badge: 'bg-emerald-500/10', badgeText: 'text-emerald-400' },
  occupied: { bg: 'bg-orange-500/15',  icon: 'text-orange-400',  badge: 'bg-orange-500/10',  badgeText: 'text-orange-400' },
  reserved: { bg: 'bg-sky-500/15',     icon: 'text-sky-400',     badge: 'bg-sky-500/10',     badgeText: 'text-sky-400' },
  cleaning: { bg: 'bg-yellow-500/15',  icon: 'text-yellow-400',  badge: 'bg-yellow-500/10',  badgeText: 'text-yellow-400' },
  merged:   { bg: 'bg-zinc-500/15',    icon: 'text-zinc-400',    badge: 'bg-zinc-500/10',    badgeText: 'text-zinc-400' },
}

function TablesPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['portal', 'tables'],
    queryFn: async () => {
      const res = await client.api.v1.admin.tables.$get()
      if (!res.ok) throw new Error('Failed to load tables')
      return res.json()
    },
  })

  const tables = data?.data ?? []

  return (
    <div className="p-6 space-y-5 max-w-5xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-zinc-100">Tables</h1>
        <p className="text-sm text-zinc-500 mt-0.5">{tables.length} tables</p>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <div className="w-5 h-5 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
        </div>
      )}

      {isError && (
        <div className="flex items-center justify-center gap-2 py-16 text-red-400">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm">Failed to load tables</span>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {tables.map((table) => {
          const colors = STATUS_COLORS[table.status] ?? STATUS_COLORS.vacant
          return (
            <div
              key={table.id}
              className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col items-center gap-2"
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colors.bg}`}>
                <Table2 className={`w-5 h-5 ${colors.icon}`} />
              </div>
              <p className="text-sm font-medium text-zinc-200">Table {table.number}</p>
              <p className="text-xs text-zinc-600">{table.capacity} seats</p>
              <span className={`text-xs px-2 py-0.5 rounded-full ${colors.badge} ${colors.badgeText}`}>
                {table.status}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
