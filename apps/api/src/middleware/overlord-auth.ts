import { createMiddleware } from 'hono/factory'
import { db } from '../db.js'
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

const sessions = new Map<string, { adminId: number; expiresAt: number }>()

export function createOverlordToken(adminId: number): string {
  const token = Buffer.from(`overlord:${adminId}:${Date.now()}:${Math.random()}`).toString('base64url')
  sessions.set(token, { adminId, expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000 })
  return token
}

export function invalidateOverlordToken(token: string): void {
  sessions.delete(token)
}

export const requireOverlordAuth = createMiddleware(async (c, next) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '')
  if (!token) throw new UnauthorizedError('No token provided')

  const session = sessions.get(token)
  if (!session || session.expiresAt < Date.now()) {
    sessions.delete(token)
    throw new UnauthorizedError('Invalid or expired session')
  }

  const admin = await db.query.overlordAdmins.findFirst({
    where: eq(overlordAdmins.id, session.adminId),
  })
  if (!admin || !admin.isActive) throw new UnauthorizedError('Admin not found or inactive')

  c.set('overlordAdmin', { id: admin.id, email: admin.email, name: admin.name })
  c.set('overlordToken', token)
  await next()
})
