import { createFileRoute, redirect } from '@tanstack/react-router'
import { useAuthStore } from '@/store/auth'

export const Route = createFileRoute('/')({
  beforeLoad: () => {
    if (useAuthStore.getState().token) {
      throw redirect({ to: '/dashboard' })
    }
    throw redirect({ to: '/login' })
  },
  component: () => null,
})
