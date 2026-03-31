import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { useAuthStore } from '../store/auth'

export const Route = createFileRoute('/_waiter')({
  beforeLoad: () => {
    const { user } = useAuthStore.getState()
    if (!user) throw redirect({ to: '/login' })
  },
  component: WaiterLayout,
})

function WaiterLayout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Outlet />
    </div>
  )
}
