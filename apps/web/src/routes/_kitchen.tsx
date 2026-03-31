import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { useAuthStore } from '../store/auth'

export const Route = createFileRoute('/_kitchen')({
  beforeLoad: () => {
    const { user } = useAuthStore.getState()
    if (!user) throw redirect({ to: '/login' })
  },
  component: KitchenLayout,
})

function KitchenLayout() {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Outlet />
    </div>
  )
}
