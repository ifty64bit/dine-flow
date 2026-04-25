import type { OverlordAppType } from '@dineflow/api/overlord-app'
import { hc } from 'hono/client'
import { useAuthStore } from '@/store/auth'

const BASE = import.meta.env.DEV
  ? 'http://localhost:3000'
  : 'https://dineflow-api.ifty64bit.workers.dev'
const AUTH_STORAGE_KEY = 'overlord-auth'

function getTokenFromStorage(): string | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed?.state?.token ?? parsed?.token ?? null
  } catch {
    return null
  }
}

function getAuthHeaders(): Record<string, string> {
  const token = useAuthStore.getState().token ?? getTokenFromStorage()
  console.log('[overlord-client] getAuthHeaders token:', token ? token.slice(0, 10) + '...' : null)
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function clearAuthOnUnauthorized() {
  useAuthStore.getState().logout()
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(AUTH_STORAGE_KEY)
    console.error('[overlord-client] 401 — clearing auth')
    if (window.location.pathname !== '/login') {
      window.location.replace('/login')
    }
  }
}

export const client = hc<OverlordAppType>(BASE, {
  headers: getAuthHeaders,
  async fetch(input: RequestInfo | URL, init?: RequestInit) {
    console.log('[overlord-client] fetch →', input)
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
