import { hc } from 'hono/client'
import type { RestaurantAppType } from '@dineflow/api/restaurant-app'

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

export const client = hc<RestaurantAppType>(BASE)

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  const body = await res.json()
  if (!res.ok) throw new Error((body as { message?: string }).message ?? 'Request failed')
  return (body as { data: T }).data
}

// Typed wrappers for customer routes that use non-chained Hono style
export const api = {
  menu: {
    get: (branchId: number, tableId: number) =>
      apiFetch<import('./types').Category[]>(
        `/api/v1/customer/menu/${branchId}?table=${tableId}`
      ),
  },
  session: {
    start: (tableId: number, guestName?: string) =>
      apiFetch<import('./types').Session>(
        '/api/v1/customer/session/start',
        { method: 'POST', body: JSON.stringify({ tableId, guestName }) }
      ),
  },
  orders: {
    place: (payload: import('./types').OrderPayload) =>
      apiFetch<import('./types').OrderResult>(
        '/api/v1/customer/orders',
        { method: 'POST', body: JSON.stringify(payload) }
      ),
    list: (sessionId: number) =>
      apiFetch<import('./types').CustomerOrder[]>(
        `/api/v1/customer/orders/session/${sessionId}`
      ),
  },
  events: {
    poll: (channel: string, after: number) =>
      fetch(`${BASE}/api/v1/events?channel=${encodeURIComponent(channel)}&after=${after}`)
        .then(r => r.json() as Promise<{ data: { ts: number; event: import('./types').SessionEvent } | null }>),
  },
}
