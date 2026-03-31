// In dev, Vite proxies /api and /auth to localhost:3000 (empty BASE_URL = same-origin).
// In production, set VITE_API_URL to your Workers URL:
//   e.g. https://dineflow-api.your-subdomain.workers.dev
const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? ''

interface RequestOptions extends RequestInit {
  token?: string
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { token, ...init } = options
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string>),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE_URL}${path}`, { ...init, headers, credentials: 'include' })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }))
    throw new ApiError(err.message ?? 'Request failed', res.status, err.error)
  }

  return res.json() as Promise<T>
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export const api = {
  get: <T>(path: string, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: 'GET' }),
  post: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: 'PUT', body: JSON.stringify(body) }),
  patch: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: 'DELETE' }),
}
