import { createMiddleware } from 'hono/factory'
import { db } from '../db.js'
import { redis } from '../lib/redis.js'
import { overlordAdmins } from '@dineflow/db'
import { eq } from 'drizzle-orm'
import { UnauthorizedError } from './errors.js'

export interface OverlordAdmin {
  id: number
  email: string
  name: string
}

declare module 'hono' {
  interface ContextVariableMap {
    overlordAdmin: OverlordAdmin
    overlordToken: string
  }
}

const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60 // 7 days

function sessionKey(token: string): string {
  return `overlord:session:${token}`
}

export async function createOverlordToken(adminId: number): Promise<string> {
  const token = Buffer.from(`overlord:${adminId}:${Date.now()}:${Math.random()}`).toString('base64url')
  await redis.set(
    sessionKey(token),
    JSON.stringify({ adminId, expiresAt: Date.now() + SESSION_TTL_SECONDS * 1000 }),
    { ex: SESSION_TTL_SECONDS }
  )
  return token
}

export async function invalidateOverlordToken(token: string): Promise<void> {
  await redis.del(sessionKey(token))
}

export const requireOverlordAuth = createMiddleware(async (c, next) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '')
  if (!token) throw new UnauthorizedError('No token provided')

  const data = await redis.get(sessionKey(token))
  if (!data) {
    throw new UnauthorizedError('Invalid or expired session')
  }

  let session: { adminId: number; expiresAt: number }
  try {
    session = JSON.parse(data)
  } catch {
    throw new UnauthorizedError('Invalid session data')
  }

  if (session.expiresAt < Date.now()) {
    await redis.del(sessionKey(token))
    throw new UnauthorizedError('Session expired')
  }

  const admin = await db.query.overlordAdmins.findFirst({
    where: eq(overlordAdmins.id, session.adminId),
  })
  if (!admin || !admin.isActive) throw new UnauthorizedError('Admin not found or inactive')

  c.set('overlordAdmin', { id: admin.id, email: admin.email, name: admin.name })
  c.set('overlordToken', token)
  await next()
})
