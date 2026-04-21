import { Hono } from 'hono'
import { eq, and, inArray } from 'drizzle-orm'
import { db } from '../../db.js'
import { orders, branches } from '@dineflow/db'
import { requireAuth } from '../../middleware/auth.js'

export const adminOrderRoutes = new Hono().use('*', requireAuth).get('/', async (c) => {
  const user = c.get('user')

  // Determine which branches this user can see
  let branchIds: number[] = []

  if (user.role === 'owner' || user.role === 'admin') {
    // Owners/admins see all branches in their organization
    const orgBranches = await db.query.branches.findMany({
      where: eq(branches.organizationId, user.organizationId!),
    })
    branchIds = orgBranches.map((b) => b.id)
  } else if (user.branchId) {
    // Managers/staff see only their assigned branch
    branchIds = [user.branchId]
  }

  if (branchIds.length === 0) {
    return c.json({ data: { placed: [], confirmed: [], preparing: [], ready: [], served: [] } })
  }

  const activeOrders = await db.query.orders.findMany({
    where: and(inArray(orders.branchId, branchIds), inArray(orders.status, ['placed', 'confirmed', 'preparing', 'ready', 'served'])),
    with: {
      items: {
        with: { menuItem: true },
        orderBy: (i, { asc }) => [asc(i.createdAt)],
      },
      session: {
        with: { table: true },
      },
    },
    orderBy: (o, { desc }) => [desc(o.createdAt)],
  })

  return c.json({
    data: {
      placed: activeOrders.filter((o) => o.status === 'placed'),
      confirmed: activeOrders.filter((o) => o.status === 'confirmed'),
      preparing: activeOrders.filter((o) => o.status === 'preparing'),
      ready: activeOrders.filter((o) => o.status === 'ready'),
      served: activeOrders.filter((o) => o.status === 'served'),
    },
  })
})
