import { hc } from 'hono/client'
import type { OverlordAppType } from '@dineflow/api/overlord-app'
import { useAuthStore } from '@/store/auth'

const BASE = 'http://localhost:3000'
const AUTH_STORAGE_KEY = 'overlord-auth'

function clearAuthOnUnauthorized() {
  useAuthStore.getState().logout()
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(AUTH_STORAGE_KEY)
    if (window.location.pathname !== '/login') {
      window.location.replace('/login')
    }
  }
}

export const client = hc<OverlordAppType>(BASE, {
  headers(): Record<string, string> {
    const token = useAuthStore.getState().token
    return token ? { Authorization: `Bearer ${token}` } : {}
  },
  async fetch(input: RequestInfo | URL, init?: RequestInit) {
    const res = await fetch(input, init)
    if (res.status === 401) clearAuthOnUnauthorized()
    return res
  },
})

export type Client = typeof client

/** Unwrap a Hono response — throws with the server error message on non-2xx */
export async function unwrap<T>(res: Response): Promise<T> {
  if (res.ok) return res.json() as Promise<T>
  const body = await res.json().catch(() => ({ message: 'Request failed' }))
  throw new Error((body as { message?: string }).message ?? 'Request failed')
}
