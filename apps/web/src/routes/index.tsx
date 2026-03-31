import { createFileRoute, redirect } from '@tanstack/react-router'
import { useAuthStore } from '../store/auth'

export const Route = createFileRoute('/')({
  beforeLoad: () => {
    const { user } = useAuthStore.getState()
    if (!user) throw redirect({ to: '/login' })

    if (user.role === 'admin' || user.role === 'manager') {
      throw redirect({ to: '/admin/dashboard' })
    }
    if (user.staffType === 'kitchen') {
      throw redirect({ to: '/kitchen' })
    }
    if (user.staffType === 'waiter') {
      throw redirect({ to: '/waiter' })
    }
    throw redirect({ to: '/admin/dashboard' })
  },
  component: () => null,
})
