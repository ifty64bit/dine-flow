import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Building2, Users, CreditCard, TrendingUp, Activity, AlertCircle } from 'lucide-react'
import { client } from '#/lib/client'

export const Route = createFileRoute('/_auth/dashboard')({
  component: DashboardPage,
})

function StatCard({
  label, value, sub, icon: Icon, accent = 'indigo',
}: {
  label: string
  value: string | number
  sub?: string
  icon: React.ElementType
  accent?: 'indigo' | 'emerald' | 'amber' | 'violet'
}) {
  const colors = {
    indigo:  'bg-indigo-600/15 text-indigo-400',
    emerald: 'bg-emerald-600/15 text-emerald-400',
    amber:   'bg-amber-600/15 text-amber-400',
    violet:  'bg-violet-600/15 text-violet-400',
  }
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${colors[accent]}`}>
          <Icon className="w-4.5 h-4.5" />
        </div>
      </div>
      <p className="text-2xl font-bold text-zinc-100">{value}</p>
      <p className="text-sm text-zinc-500 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-zinc-600 mt-1">{sub}</p>}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active:    'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    trialing:  'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    past_due:  'bg-amber-500/10 text-amber-400 border-amber-500/20',
    cancelled: 'bg-zinc-700/40 text-zinc-500 border-zinc-700',
    paused:    'bg-zinc-700/40 text-zinc-500 border-zinc-700',
    none:      'bg-zinc-700/40 text-zinc-500 border-zinc-700',
  }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${map[status] ?? map.none}`}>
      {status}
    </span>
  )
}

function DashboardPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['overlord', 'stats'],
    queryFn:  async () => {
      const res = await client.api.overlord.stats.$get()
      if (!res.ok) throw new Error('Failed to load stats')
      return res.json()
    },
  })

  if (isLoading) return <PageLoader />
  if (isError)   return <PageError message="Failed to load stats" />

  const stats = data?.data

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-zinc-100">Dashboard</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Platform overview</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Organizations"
          value={stats?.totalOrgs ?? 0}
          sub={`${stats?.activeOrgs ?? 0} active`}
          icon={Building2}
          accent="indigo"
        />
        <StatCard
          label="Platform Users"
          value={stats?.totalUsers ?? 0}
          icon={Users}
          accent="violet"
        />
        <StatCard
          label="Active Subscriptions"
          value={stats?.activeSubscriptions ?? 0}
          sub={`${stats?.trialOrgs ?? 0} on trial`}
          icon={CreditCard}
          accent="emerald"
        />
        <StatCard
          label="Monthly Revenue"
          value={`৳${(stats?.monthlyRevenue ?? 0).toLocaleString()}`}
          icon={TrendingUp}
          accent="amber"
        />
      </div>

      {/* Recent organizations */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-zinc-500" />
            <h2 className="text-sm font-semibold text-zinc-300">Recent Organizations</h2>
          </div>
          <a href="/organizations" className="text-xs text-indigo-400 hover:text-indigo-300">
            View all →
          </a>
        </div>

        <div className="divide-y divide-zinc-800">
          {(stats?.recentOrgs ?? []).map((org) => (
            <div key={org.id} className="flex items-center justify-between px-5 py-3.5">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-400 flex-shrink-0">
                  {org.name[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-zinc-200 truncate">{org.name}</p>
                  <p className="text-xs text-zinc-600 truncate">
                    {org.branchCount} {org.branchCount === 1 ? 'branch' : 'branches'} · {org.slug}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 flex-shrink-0 ml-4">
                <StatusBadge status={org.subscriptionStatus} />
                <span className="text-xs text-zinc-600 hidden sm:block">
                  {new Date(org.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
          {(stats?.recentOrgs ?? []).length === 0 && (
            <p className="px-5 py-6 text-sm text-zinc-600 text-center">No organizations yet</p>
          )}
        </div>
      </div>
    </div>
  )
}

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
    </div>
  )
}

function PageError({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="flex items-center gap-2 text-red-400">
        <AlertCircle className="w-4 h-4" />
        <span className="text-sm">{message}</span>
      </div>
    </div>
  )
}
