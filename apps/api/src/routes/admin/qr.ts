import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { db } from '../../db.js'
import { tables } from '@dineflow/db'
import { requireAuth, roleGuard } from '../../middleware/auth.js'
import { NotFoundError } from '../../middleware/errors.js'

export const adminQrRoutes = new Hono()
  .use('*', requireAuth, roleGuard('manager'))
  .post('/generate/:tableId', async (c) => {
    const tableId = Number(c.req.param('tableId'))
    const baseUrl = c.req.query('baseUrl') ?? 'http://menu.local'

    const table = await db.query.tables.findFirst({ where: eq(tables.id, tableId) })
    if (!table) throw new NotFoundError('Table')

    const qrUrl = `${baseUrl}/table/${tableId}`
    await db
      .update(tables)
      .set({ qrCodeUrl: qrUrl, updatedAt: new Date() })
      .where(eq(tables.id, tableId))

    return c.json({
      data: {
        tableId,
        tableNumber: table.number,
        qrUrl,
        qrImageUrl: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrUrl)}`,
      },
    })
  })
