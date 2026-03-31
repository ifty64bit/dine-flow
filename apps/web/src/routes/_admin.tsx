import { createFileRoute, Outlet, Link, redirect, useRouterState } from '@tanstack/react-router'
import { useAuthStore } from '../store/auth'
import { api } from '../lib/api'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'

export const Route = createFileRoute('/_admin')({
  beforeLoad: () => {
    const { user } = useAuthStore.getState()
    if (!user) throw redirect({ to: '/login' })
    if (user.staffType === 'kitchen') throw redirect({ to: '/kitchen' })
    if (user.staffType === 'waiter') throw redirect({ to: '/waiter' })
  },
  component: AdminLayout,
})

const NAV = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: '📊' },
  { to: '/admin/menu', label: 'Menu', icon: '🍽️' },
  { to: '/admin/tables', label: 'Tables', icon: '🪑' },
  { to: '/admin/reservations', label: 'Reservations', icon: '📅' },
  { to: '/admin/staff', label: 'Staff', icon: '👥' },
  { to: '/admin/settings', label: 'Settings', icon: '⚙️' },
]

function AdminLayout() {
  const user = useAuthStore((s) => s.user)
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const navigate = useNavigate()
  const routerState = useRouterState()
  const currentPath = routerState.location.pathname

  const logout = useMutation({
    mutationFn: () => api.post('/auth/logout'),
    onSettled: () => {
      clearAuth()
      navigate({ to: '/login' })
    },
  })

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-60 bg-white border-r border-gray-200 flex flex-col">
        <div className="px-5 py-4 border-b border-gray-200">
          <h1 className="text-lg font-bold text-gray-900">DineFlow</h1>
          <p className="text-xs text-gray-500 mt-0.5 capitalize">{user?.role} Portal</p>
        </div>

        <nav className="flex-1 px-3 py-3 space-y-0.5">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                currentPath.startsWith(item.to)
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="px-3 py-3 border-t border-gray-200">
          <div className="px-3 py-2 text-xs text-gray-500">
            {user?.name}
            <br />
            {user?.email}
          </div>
          <button
            onClick={() => logout.mutate()}
            className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <span>🚪</span> Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
