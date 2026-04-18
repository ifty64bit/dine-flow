import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { db } from '../../db.js'
import { tables, branches, organizations } from '@dineflow/db'
import { NotFoundError } from '../../middleware/errors.js'

export const customerTableRoutes = new Hono()
  .get('/:tableId', async (c) => {
    const tableId = Number(c.req.param('tableId'))

    const table = await db.query.tables.findFirst({
      where: eq(tables.id, tableId),
      with: {
        tableClass: true,
        branch: true,
      },
    })
    if (!table) throw new NotFoundError('Table')

    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, table.branch.organizationId),
    })
    if (!org) throw new NotFoundError('Organization')

    return c.json({
      data: {
        tableId: table.id,
        tableNumber: table.number,
        capacity: table.capacity,
        tableClassName: table.tableClass.name,
        branchId: table.branchId,
        branchName: table.branch.name,
        orgName: org.name,
        orgSlug: org.slug,
        currency: org.currency,
      },
    })
  })
