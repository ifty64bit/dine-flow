import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { eq, and } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { db } from '../../db.js'
import { users, organizationMembers } from '@dineflow/db'
import { createUserSchema, updateUserSchema } from '@dineflow/shared'
import { requireAuth, roleGuard } from '../../middleware/auth.js'
import { NotFoundError, ConflictError } from '../../middleware/errors.js'

export const adminStaffRoutes = new Hono()
  .use('*', requireAuth, roleGuard('manager'))
  .get('/', async (c) => {
    const user = c.get('user')
    const organizationId = user.organizationId
    if (!organizationId) return c.json({ data: [] })

    const members = await db.query.organizationMembers.findMany({
      where: eq(organizationMembers.organizationId, organizationId),
      with: { user: true, branch: true },
      orderBy: (m, { asc }) => [asc(m.createdAt)],
    })

    const staff = members.map((m) => ({
      id: m.user.id,
      name: m.user.name,
      email: m.user.email,
      role: m.role,
      staffType: m.staffType,
      branchId: m.branchId,
      branchName: m.branch?.name ?? null,
      isActive: m.isActive,
      joinedAt: m.joinedAt,
    }))

    return c.json({ data: staff })
  })
  .post('/', zValidator('json', createUserSchema), async (c) => {
    const authUser = c.get('user')
    const organizationId = authUser.organizationId
    if (!organizationId) throw new NotFoundError('Organization')

    const body = c.req.valid('json')

    const existing = await db.query.users.findFirst({
      where: eq(users.email, body.email.toLowerCase()),
    })
    if (existing) throw new ConflictError('Email already in use')

    const passwordHash = await bcrypt.hash(body.password, 10)
    const [newUser] = await db
      .insert(users)
      .values({
        email: body.email.toLowerCase(),
        passwordHash,
        name: body.name,
        isActive: body.isActive ?? true,
      })
      .returning({ id: users.id, email: users.email, name: users.name, isActive: users.isActive })

    const [membership] = await db
      .insert(organizationMembers)
      .values({
        organizationId,
        userId: newUser.id,
        role: body.role,
        staffType: body.staffType ?? null,
        branchId: body.branchId ?? null,
        isActive: body.isActive ?? true,
      })
      .returning()

    return c.json({
      data: {
        ...newUser,
        role: membership.role,
        staffType: membership.staffType,
        branchId: membership.branchId,
      },
    }, 201)
  })
  .get('/:id', async (c) => {
    const id = Number(c.req.param('id'))
    const authUser = c.get('user')
    const organizationId = authUser.organizationId

    const user = await db.query.users.findFirst({
      where: eq(users.id, id),
    })
    if (!user) throw new NotFoundError('User')

    const membership = organizationId
      ? await db.query.organizationMembers.findFirst({
          where: and(
            eq(organizationMembers.userId, id),
            eq(organizationMembers.organizationId, organizationId)
          ),
          with: { branch: true },
        })
      : null

    return c.json({
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        isActive: user.isActive,
        role: membership?.role ?? 'staff',
        staffType: membership?.staffType ?? null,
        branchId: membership?.branchId ?? null,
      },
    })
  })
  .put('/:id', zValidator('json', updateUserSchema), async (c) => {
    const id = Number(c.req.param('id'))
    const authUser = c.get('user')
    const organizationId = authUser.organizationId
    const body = c.req.valid('json')

    const userUpdate: Record<string, unknown> = { updatedAt: new Date() }
    if (body.name !== undefined) userUpdate.name = body.name
    if (body.email !== undefined) userUpdate.email = body.email.toLowerCase()
    if (body.isActive !== undefined) userUpdate.isActive = body.isActive
    if (body.password) userUpdate.passwordHash = await bcrypt.hash(body.password, 10)

    const [updatedUser] = await db
      .update(users)
      .set(userUpdate)
      .where(eq(users.id, id))
      .returning({ id: users.id, email: users.email, name: users.name, isActive: users.isActive })
    if (!updatedUser) throw new NotFoundError('User')

    if (organizationId && (body.role !== undefined || body.staffType !== undefined || body.branchId !== undefined)) {
      const memberUpdate: Record<string, unknown> = {}
      if (body.role !== undefined) memberUpdate.role = body.role
      if (body.staffType !== undefined) memberUpdate.staffType = body.staffType
      if (body.branchId !== undefined) memberUpdate.branchId = body.branchId

      await db
        .update(organizationMembers)
        .set(memberUpdate)
        .where(
          and(
            eq(organizationMembers.userId, id),
            eq(organizationMembers.organizationId, organizationId)
          )
        )
    }

    return c.json({ data: updatedUser })
  })
  .delete('/:id', roleGuard('admin'), async (c) => {
    const id = Number(c.req.param('id'))
    const authUser = c.get('user')
    const organizationId = authUser.organizationId

    await db.update(users).set({ isActive: false, updatedAt: new Date() }).where(eq(users.id, id))

    if (organizationId) {
      await db
        .update(organizationMembers)
        .set({ isActive: false })
        .where(
          and(
            eq(organizationMembers.userId, id),
            eq(organizationMembers.organizationId, organizationId)
          )
        )
    }

    return c.json({ data: { success: true } })
  })
