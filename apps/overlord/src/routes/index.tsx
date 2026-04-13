import { createFileRoute, redirect } from '@tanstack/react-router'
import { useAuthStore } from '@/store/auth'

export const Route = createFileRoute('/')({
  beforeLoad: () => {
    const token = useAuthStore.getState().token
    throw redirect({ to: token ? '/dashboard' : '/login' })
  },
})
