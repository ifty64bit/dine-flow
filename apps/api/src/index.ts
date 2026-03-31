import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { serve } from '@hono/node-server'
import { config } from 'dotenv'
import { resolve } from 'path'
import type { Server } from 'http'
import { setupWebSocket } from './ws/index.js'
import { authRoutes } from './routes/auth.js'
import { customerMenuRoutes } from './routes/customer/menu.js'
import { customerSessionRoutes } from './routes/customer/sessions.js'
import { customerOrderRoutes } from './routes/customer/orders.js'
import { adminMenuRoutes } from './routes/admin/menu.js'
import { adminTableRoutes } from './routes/admin/tables.js'
import { adminStaffRoutes } from './routes/admin/staff.js'
import { adminReservationRoutes } from './routes/admin/reservations.js'
import { adminSettingsRoutes } from './routes/admin/settings.js'
import { adminBranchRoutes } from './routes/admin/branches.js'
import { adminQrRoutes } from './routes/admin/qr.js'
import { kitchenOrderRoutes } from './routes/kitchen/orders.js'
import { waiterRoutes } from './routes/waiter/index.js'
import { AppError } from './middleware/errors.js'

config({ path: resolve(process.cwd(), '../../.env') })
config({ path: resolve(process.cwd(), '.env') })

const app = new Hono()

app.use('*', logger())
app.use(
  '*',
  cors({
    origin: (origin) => origin ?? '*',
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
)

app.get('/health', (c) =>
  c.json({ status: 'ok', timestamp: new Date().toISOString() })
)

// Auth
app.route('/auth', authRoutes)

// Customer (public)
app.route('/api/v1/customer/menu', customerMenuRoutes)
app.route('/api/v1/customer/session', customerSessionRoutes)
app.route('/api/v1/customer/orders', customerOrderRoutes)

// Admin
app.route('/api/v1/admin/menu', adminMenuRoutes)
app.route('/api/v1/admin/tables', adminTableRoutes)
app.route('/api/v1/admin/staff', adminStaffRoutes)
app.route('/api/v1/admin/reservations', adminReservationRoutes)
app.route('/api/v1/admin/settings', adminSettingsRoutes)
app.route('/api/v1/admin/branches', adminBranchRoutes)
app.route('/api/v1/admin/qr', adminQrRoutes)

// Kitchen
app.route('/api/v1/kitchen', kitchenOrderRoutes)

// Waiter
app.route('/api/v1/waiter', waiterRoutes)

// Error handling
app.onError((err, c) => {
  if (err instanceof AppError) {
    return c.json(
      { error: err.code, message: err.message, statusCode: err.statusCode },
      err.statusCode as Parameters<typeof c.json>[1]
    )
  }
  console.error('Unhandled error:', err)
  return c.json(
    { error: 'INTERNAL_ERROR', message: 'An unexpected error occurred', statusCode: 500 },
    500
  )
})

app.notFound((c) =>
  c.json({ error: 'NOT_FOUND', message: 'Route not found', statusCode: 404 }, 404)
)

export type AppType = typeof app

const port = parseInt(process.env.PORT ?? '3000', 10)

const server = serve(
  { fetch: app.fetch, port, hostname: '0.0.0.0' },
  (info) => {
    console.log(`DineFlow API running on http://0.0.0.0:${info.port}`)
  }
) as Server

setupWebSocket(server)
