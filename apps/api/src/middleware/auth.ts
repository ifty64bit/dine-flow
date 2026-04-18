import { createMiddleware } from 'hono/factory'
import { getCookie } from 'hono/cookie'
import { db } from '../db.js'
import { users, organizationMembers } from '@dineflow/db'
import { eq } from 'drizzle-orm'
import { UnauthorizedError, ForbiddenError } from './errors.js'
import { hasPermission } from '@dineflow/shared'

export interface AuthUser {
  id: number
  email: string
  name: string
  role: string
  staffType: string | null
  branchId: number | null
  organizationId: number | null
}

declare module 'hono' {
  interface ContextVariableMap {
    user: AuthUser
    sessionToken: string
  }
}

let _secret = ''

export function initAuth(secret: string): void {
  _secret = secret
}

const enc = new TextEncoder()
const SESSION_TTL = 7 * 24 * 60 * 60 // seconds

function bufToBase64Url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

async function hmacSign(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(_secret || 'dev-secret'),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(payload))
  return bufToBase64Url(sig)
}

export async function createSessionToken(userId: number): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL
  const payload = btoa(JSON.stringify({ userId, exp }))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  const sig = await hmacSign(payload)
  return `${payload}.${sig}`
}

// Stateless tokens cannot be server-side revoked; clearing the cookie on logout is sufficient.
export function invalidateSession(_token: string): void {}

export async function resolveSession(token: string): Promise<AuthUser | null> {
  const dot = token.lastIndexOf('.')
  if (dot === -1) return null
  const payload = token.slice(0, dot)
  const sig = token.slice(dot + 1)

  const expectedSig = await hmacSign(payload)
  if (expectedSig !== sig) return null

  let data: { userId: number; exp: number }
  try {
    data = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
  } catch {
    return null
  }
  if (data.exp < Math.floor(Date.now() / 1000)) return null

  const user = await db.query.users.findFirst({
    where: eq(users.id, data.userId),
  })
  if (!user || !user.isActive) return null

  const membership = await db.query.organizationMembers.findFirst({
    where: eq(organizationMembers.userId, user.id),
    orderBy: (m, { desc }) => [desc(m.createdAt)],
  })

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: membership?.role ?? 'staff',
    staffType: membership?.staffType ?? null,
    branchId: membership?.branchId ?? null,
    organizationId: membership?.organizationId ?? null,
  }
}

export const requireAuth = createMiddleware(async (c, next) => {
  const authHeader = c.req.header('Authorization')
  const cookieToken = getCookie(c, 'dineflow_session')
  const token = authHeader?.replace('Bearer ', '') ?? cookieToken

  if (!token) throw new UnauthorizedError('No session token provided')

  const user = await resolveSession(token)
  if (!user) throw new UnauthorizedError('Invalid or expired session')

  c.set('user', user)
  c.set('sessionToken', token)
  await next()
})

export function roleGuard(minimumRole: string) {
  return createMiddleware(async (c, next) => {
    const user = c.get('user')
    if (!user) throw new UnauthorizedError()
    if (!hasPermission(user.role, minimumRole)) {
      throw new ForbiddenError(`Requires ${minimumRole} role or above`)
    }
    await next()
  })
}
