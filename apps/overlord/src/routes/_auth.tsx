import { createFileRoute, redirect, Outlet, Link, useLocation } from '@tanstack/react-router'
import {
  LayoutDashboard,
  Building2,
  CreditCard,
  Users,
  LogOut,
  Shield,
  Menu,
} from 'lucide-react'
import { useState } from 'react'
import { useAuthStore } from '#/store/auth'

export const Route = createFileRoute('/_auth')({
  beforeLoad: () => {
    if (!useAuthStore.getState().token) {
      throw redirect({ to: '/login' })
    }
  },
  component: AuthLayout,
})

const NAV = [
  { to: '/dashboard',      label: 'Dashboard',      icon: LayoutDashboard },
  { to: '/organizations',  label: 'Organizations',  icon: Building2       },
  { to: '/plans',          label: 'Plans',          icon: CreditCard      },
  { to: '/users',          label: 'Users',          icon: Users           },
] as const

function AuthLayout() {
  const admin  = useAuthStore((s) => s.admin)
  const logout = useAuthStore((s) => s.logout)
  const loc    = useLocation()
  const [open, setOpen] = useState(false)

  function isActive(to: string) {
    return loc.pathname.startsWith(to)
  }

  return (
    <div className="flex h-screen bg-[#09090b] overflow-hidden">
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/60 z-20 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-30
          w-60 flex flex-col bg-zinc-950 border-r border-zinc-800
          transform transition-transform duration-200
          ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Brand */}
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-zinc-800">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center flex-shrink-0">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-zinc-100 truncate">Overlord</p>
            <p className="text-xs text-zinc-500 truncate">Platform Admin</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              onClick={() => setOpen(false)}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                ${isActive(to)
                  ? 'bg-indigo-600/15 text-indigo-400'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'}
              `}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </Link>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-3 pb-4 border-t border-zinc-800 pt-4">
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg mb-1">
            <div className="w-7 h-7 rounded-full bg-indigo-600/30 flex items-center justify-center text-xs font-bold text-indigo-400">
              {admin?.name?.[0]?.toUpperCase() ?? 'A'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-zinc-300 truncate">{admin?.name}</p>
              <p className="text-xs text-zinc-600 truncate">{admin?.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile topbar */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-zinc-800 bg-zinc-950">
          <button
            onClick={() => setOpen(true)}
            className="text-zinc-400 hover:text-zinc-100"
          >
            <Menu className="w-5 h-5" />
          </button>
          <p className="text-sm font-semibold text-zinc-100">Overlord</p>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
