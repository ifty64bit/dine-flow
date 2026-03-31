import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { db } from '../../db.js'
import { users } from '@dineflow/db'
import { createUserSchema, updateUserSchema } from '@dineflow/shared'
import { requireAuth, roleGuard } from '../../middleware/auth.js'
import { NotFoundError, ConflictError } from '../../middleware/errors.js'

export const adminStaffRoutes = new Hono()

adminStaffRoutes.use('*', requireAuth, roleGuard('manager'))

adminStaffRoutes.get('/', async (c) => {
  const staff = await db.query.users.findMany({
    with: { branch: true },
    orderBy: (u, { asc }) => [asc(u.name)],
    columns: { passwordHash: false },
  })
  return c.json({ data: staff })
})

adminStaffRoutes.post('/', zValidator('json', createUserSchema), async (c) => {
  const body = c.req.valid('json')

  const existing = await db.query.users.findFirst({
    where: eq(users.email, body.email.toLowerCase()),
  })
  if (existing) throw new ConflictError('Email already in use')

  const passwordHash = await bcrypt.hash(body.password, 10)
  const [user] = await db
    .insert(users)
    .values({
      email: body.email.toLowerCase(),
      passwordHash,
      name: body.name,
      role: body.role,
      staffType: body.staffType ?? null,
      branchId: body.branchId ?? null,
      isActive: body.isActive ?? true,
    })
    .returning({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      staffType: users.staffType,
      branchId: users.branchId,
      isActive: users.isActive,
      createdAt: users.createdAt,
    })

  return c.json({ data: user }, 201)
})

adminStaffRoutes.get('/:id', async (c) => {
  const id = c.req.param('id')
  const user = await db.query.users.findFirst({
    where: eq(users.id, id),
    with: { branch: true },
    columns: { passwordHash: false },
  })
  if (!user) throw new NotFoundError('User')
  return c.json({ data: user })
})

adminStaffRoutes.put('/:id', zValidator('json', updateUserSchema), async (c) => {
  const id = c.req.param('id')
  const body = c.req.valid('json')

  const updateData: Record<string, unknown> = { updatedAt: new Date() }
  if (body.name !== undefined) updateData.name = body.name
  if (body.email !== undefined) updateData.email = body.email.toLowerCase()
  if (body.role !== undefined) updateData.role = body.role
  if (body.staffType !== undefined) updateData.staffType = body.staffType
  if (body.branchId !== undefined) updateData.branchId = body.branchId
  if (body.isActive !== undefined) updateData.isActive = body.isActive
  if (body.password) updateData.passwordHash = await bcrypt.hash(body.password, 10)

  const [user] = await db
    .update(users)
    .set(updateData)
    .where(eq(users.id, id))
    .returning({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      staffType: users.staffType,
      branchId: users.branchId,
      isActive: users.isActive,
      updatedAt: users.updatedAt,
    })
  if (!user) throw new NotFoundError('User')
  return c.json({ data: user })
})

adminStaffRoutes.delete('/:id', roleGuard('admin'), async (c) => {
  const id = c.req.param('id')
  await db
    .update(users)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(users.id, id))
  return c.json({ data: { success: true } })
})
