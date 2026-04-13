import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import {
  Users,
  Search,
  AlertCircle,
  Building2,
  ChevronRight,
} from 'lucide-react'
import { client } from '@/lib/client'

export const Route = createFileRoute('/_auth/users/')({
  component: UsersPage,
})

function RoleBadge({ role }: { role: string }) {
  const map: Record<string, string> = {
    owner: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
    admin: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    manager: 'bg-amber-500/10  text-amber-400  border-amber-500/20',
    staff: 'bg-zinc-700/40   text-zinc-500   border-zinc-700',
  }
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded-full border font-medium ${map[role] ?? map.staff}`}
    >
      {role}
    </span>
  )
}

function UsersPage() {
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<number | null>(null)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['overlord', 'users'],
    queryFn: async () => {
      const res = await client.api.overlord.users.$get()
      if (!res.ok) throw new Error('Failed to load users')
      return res.json()
    },
  })

  const users = (data?.data ?? []).filter(
    (u) =>
      search === '' ||
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-6 space-y-5 max-w-5xl mx-auto">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">Users</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {data?.data.length ?? 0} total
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email…"
          className="w-full max-w-sm bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder-zinc-600 rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-colors"
        />
      </div>

      {/* List */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        {/* Header */}
        <div className="hidden md:grid grid-cols-[1fr_200px_80px_36px] gap-4 px-5 py-3 border-b border-zinc-800">
          {['User', 'Organizations', 'Status', ''].map((h) => (
            <span
              key={h}
              className="text-xs font-medium text-zinc-600 uppercase tracking-wide"
            >
              {h}
            </span>
          ))}
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <div className="w-5 h-5 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
          </div>
        )}

        {isError && (
          <div className="flex items-center justify-center gap-2 py-16 text-red-400">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">Failed to load users</span>
          </div>
        )}

        {!isLoading && !isError && users.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <Users className="w-8 h-8 text-zinc-700" />
            <p className="text-sm text-zinc-600">
              {search ? 'No results found' : 'No users yet'}
            </p>
          </div>
        )}

        <div className="divide-y divide-zinc-800">
          {users.map((user) => (
            <div key={user.id}>
              {/* Desktop row */}
              <button
                onClick={() =>
                  setExpanded(expanded === user.id ? null : user.id)
                }
                className="hidden md:grid w-full grid-cols-[1fr_200px_80px_36px] gap-4 items-center px-5 py-3.5 hover:bg-zinc-800/50 transition-colors text-left group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-400 shrink-0 group-hover:bg-zinc-700">
                    {user.name[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-200 truncate">
                      {user.name}
                    </p>
                    <p className="text-xs text-zinc-600 truncate">
                      {user.email}
                    </p>
                  </div>
                </div>
                <div className="min-w-0">
                  {user.memberships.length === 0 ? (
                    <span className="text-xs text-zinc-600">—</span>
                  ) : user.memberships.length === 1 ? (
                    <span className="text-xs text-zinc-400 truncate">
                      {user.memberships[0].organizationName}
                    </span>
                  ) : (
                    <span className="text-xs text-zinc-400">
                      {user.memberships.length} orgs
                    </span>
                  )}
                </div>
                <span
                  className={`text-xs font-medium ${user.isActive ? 'text-emerald-400' : 'text-zinc-600'}`}
                >
                  {user.isActive ? 'Active' : 'Inactive'}
                </span>
                <ChevronRight
                  className={`w-4 h-4 text-zinc-700 group-hover:text-zinc-500 transition-transform ${
                    expanded === user.id ? 'rotate-90' : ''
                  }`}
                />
              </button>

              {/* Mobile row */}
              <button
                onClick={() =>
                  setExpanded(expanded === user.id ? null : user.id)
                }
                className="md:hidden w-full flex items-center justify-between px-4 py-3.5 hover:bg-zinc-800/50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-400 shrink-0">
                    {user.name[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-200 truncate">
                      {user.name}
                    </p>
                    <p className="text-xs text-zinc-600 truncate">
                      {user.email}
                    </p>
                  </div>
                </div>
                <ChevronRight
                  className={`w-4 h-4 text-zinc-700 shrink-0 transition-transform ${
                    expanded === user.id ? 'rotate-90' : ''
                  }`}
                />
              </button>

              {/* Expanded memberships */}
              {expanded === user.id && (
                <div className="px-5 pb-4 space-y-2 bg-zinc-800/20 border-t border-zinc-800">
                  <p className="text-xs font-medium text-zinc-600 uppercase tracking-wide pt-3 mb-2">
                    Memberships
                  </p>
                  {user.memberships.length === 0 ? (
                    <p className="text-xs text-zinc-600 py-1">
                      Not a member of any organization
                    </p>
                  ) : (
                    user.memberships.map((m, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <Building2 className="w-3.5 h-3.5 text-zinc-600" />
                          <Link
                            to="/organizations/$orgId"
                            params={{ orgId: String(m.organizationId) }}
                            className="text-sm text-zinc-300 hover:text-indigo-400 transition-colors"
                          >
                            {m.organizationName}
                          </Link>
                          {m.branchName && (
                            <span className="text-xs text-zinc-600">
                              · {m.branchName}
                            </span>
                          )}
                        </div>
                        <RoleBadge role={m.role} />
                      </div>
                    ))
                  )}
                  <p className="text-xs text-zinc-700 pt-1">
                    Joined {new Date(user.createdAt).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
