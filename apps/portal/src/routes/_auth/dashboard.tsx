import { createFileRoute } from '@tanstack/react-router'
import { useAuthStore } from '@/store/auth'
import { UtensilsCrossed, Table2, ClipboardList, Users } from 'lucide-react'

export const Route = createFileRoute('/_auth/dashboard')({
  component: DashboardPage,
})

const STAT_CARDS = [
  { label: 'Menu Items', icon: UtensilsCrossed, value: '—', color: 'text-orange-400', bg: 'bg-orange-500/10' },
  { label: 'Tables', icon: Table2, value: '—', color: 'text-sky-400', bg: 'bg-sky-500/10' },
  { label: 'Active Orders', icon: ClipboardList, value: '—', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  { label: 'Staff', icon: Users, value: '—', color: 'text-violet-400', bg: 'bg-violet-500/10' },
]

function DashboardPage() {
  const user = useAuthStore((s) => s.user)

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-zinc-100">Dashboard</h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          Welcome back, {user?.name ?? 'there'}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STAT_CARDS.map(({ label, icon: Icon, value, color, bg }) => (
          <div
            key={label}
            className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3"
          >
            <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center`}>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-100">{value}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <p className="text-sm text-zinc-500">
          Use the sidebar to manage your restaurant's menu, tables, orders, and staff.
        </p>
      </div>
    </div>
  )
}
