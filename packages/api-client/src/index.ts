import { hc } from 'hono/client'

// We import the AppType lazily to avoid circular build deps.
// The actual type comes from @dineflow/api.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AppType = any

export function createApiClient(baseUrl: string) {
  return hc<AppType>(baseUrl)
}

export type ApiClient = ReturnType<typeof createApiClient>
