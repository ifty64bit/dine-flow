import { hc } from 'hono/client'
import type { OverlordAppType } from '@dineflow/api/overlord-app'
import { useAuthStore } from '#/store/auth'

const BASE = 'http://localhost:3000'

export const client = hc<OverlordAppType>(BASE, {
  headers(): Record<string, string> {
    const token = useAuthStore.getState().token
    return token ? { Authorization: `Bearer ${token}` } : {}
  },
})

export type Client = typeof client

/** Unwrap a Hono response — throws with the server error message on non-2xx */
export async function unwrap<T>(res: Response): Promise<T> {
  if (res.ok) return res.json() as Promise<T>
  const body = await res.json().catch(() => ({ message: 'Request failed' }))
  throw new Error((body as { message?: string }).message ?? 'Request failed')
}
