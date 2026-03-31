import { createMiddleware } from 'hono/factory'
import { getCookie } from 'hono/cookie'
import { db } from '../db.js'
import { users } from '@dineflow/db'
import { eq } from 'drizzle-orm'
import { UnauthorizedError, ForbiddenError } from './errors.js'
import { hasPermission } from '@dineflow/shared'

export interface AuthUser {
  id: string
  email: string
  name: string
  role: string
  staffType: string | null
  branchId: string | null
}

declare module 'hono' {
  interface ContextVariableMap {
    user: AuthUser
    sessionToken: string
  }
}

// In-memory session store (sufficient for single-server MVP)
const sessions = new Map<string, { userId: string; expiresAt: number }>()

export function createSessionToken(userId: string): string {
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

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    staffType: user.staffType,
    branchId: user.branchId,
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
