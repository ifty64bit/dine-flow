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

// In-memory session store (sufficient for single-server MVP)
const sessions = new Map<string, { userId: number; expiresAt: number }>()

export function createSessionToken(userId: number): string {
  const token = Buffer.from(`${userId}:${Date.now()}:${Math.random()}`).toString('base64url')
  sessions.set(token, { userId, expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000 })
  return token
}

export function invalidateSession(token: string): void {
  sessions.delete(token)
}

export async function resolveSession(token: string): Promise<AuthUser | null> {
  const session = sessions.get(token)
  if (!session) return null
  if (session.expiresAt < Date.now()) {
    sessions.delete(token)
    return null
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.userId),
  })
  if (!user || !user.isActive) return null

  // Get role/branch from their first active organization membership
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
