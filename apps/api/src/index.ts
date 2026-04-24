import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { initDb } from './db.js'
import { initRedis } from './lib/redis.js'
import { authRoutes } from './routes/auth.js'
import { customerMenuRoutes } from './routes/customer/menu.js'
import { customerSessionRoutes } from './routes/customer/sessions.js'
import { customerOrderRoutes } from './routes/customer/orders.js'
import { customerTableRoutes } from './routes/customer/table.js'
import { adminMenuRoutes } from './routes/admin/menu.js'
import { adminTableRoutes } from './routes/admin/tables.js'
import { adminStaffRoutes } from './routes/admin/staff.js'
import { adminReservationRoutes } from './routes/admin/reservations.js'
import { adminSettingsRoutes } from './routes/admin/settings.js'
import { adminBranchRoutes } from './routes/admin/branches.js'
import { adminQrRoutes } from './routes/admin/qr.js'
import { adminOrderRoutes } from './routes/admin/orders.js'
import { kitchenOrderRoutes } from './routes/kitchen/orders.js'
import { waiterRoutes } from './routes/waiter/index.js'
import { overlordRoutes } from './routes/overlord/index.js'
import { eventsRoutes } from './routes/events.js'
import { AppError } from './middleware/errors.js'
import { initAuth } from './middleware/auth.js'

type Bindings = {
  DATABASE_URL: string
  BETTER_AUTH_SECRET: string
  NODE_ENV?: string
  REDIS_URL?: string
  UPSTASH_REDIS_REST_URL?: string
  UPSTASH_REDIS_REST_TOKEN?: string
}

const app = new Hono<{ Bindings: Bindings }>()

const allowedCorsOrigins = new Set([
  'https://dineflow-overlord.ifty64bit.workers.dev',
  'http://localhost:4000',
  'http://localhost:4001',
  'http://localhost:4002',
])

app.use('*', async (c, next) => {
  initDb(c.env.DATABASE_URL)
  initAuth(c.env.BETTER_AUTH_SECRET)
  initRedis({
    NODE_ENV: c.env.NODE_ENV,
    REDIS_URL: c.env.REDIS_URL,
    UPSTASH_REDIS_REST_URL: c.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: c.env.UPSTASH_REDIS_REST_TOKEN,
  })
  await next()
})

app.use('*', logger())
app.use(
  '*',
  cors({
    origin: (origin) => {
      if (!origin) return '*'
      return allowedCorsOrigins.has(origin) ? origin : ''
    },
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
app.route('/api/v1/customer/table', customerTableRoutes)
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
app.route('/api/v1/admin/orders', adminOrderRoutes)

// Kitchen
app.route('/api/v1/kitchen', kitchenOrderRoutes)

// Waiter
app.route('/api/v1/waiter', waiterRoutes)

// Overlord (platform admin)
app.route('/api/overlord', overlordRoutes)

// Long polling event stream
app.route('/api/v1/events', eventsRoutes)

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
    {
      error: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      statusCode: 500,
    },
    500
  )
})

app.notFound((c) =>
  c.json(
    { error: 'NOT_FOUND', message: 'Route not found', statusCode: 404 },
    404
  )
)

export type AppType = typeof app

export default app
