import { hc } from 'hono/client'
import type { AppType } from '@dineflow/api'

export function createApiClient(baseUrl: string) {
  return hc<AppType>(baseUrl)
}

export type ApiClient = ReturnType<typeof createApiClient>
