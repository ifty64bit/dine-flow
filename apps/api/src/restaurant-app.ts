/**
 * Minimal Hono app containing only the restaurant-facing routes.
 * Used exclusively for TypeScript declaration generation — never imported at runtime.
 * Run `bun run gen-types` to regenerate dist/restaurant-app.d.ts after route changes.
 */
import { Hono } from 'hono'
import { authRoutes } from './routes/auth.js'
import { adminMenuRoutes } from './routes/admin/menu.js'
import { adminTableRoutes } from './routes/admin/tables.js'
import { adminStaffRoutes } from './routes/admin/staff.js'
import { adminReservationRoutes } from './routes/admin/reservations.js'
import { adminSettingsRoutes } from './routes/admin/settings.js'
import { adminBranchRoutes } from './routes/admin/branches.js'
import { adminQrRoutes } from './routes/admin/qr.js'
import { kitchenOrderRoutes } from './routes/kitchen/orders.js'
import { waiterRoutes } from './routes/waiter/index.js'

const restaurantApp = new Hono()
  .route('/auth', authRoutes)
  .route('/api/v1/admin/menu', adminMenuRoutes)
  .route('/api/v1/admin/tables', adminTableRoutes)
  .route('/api/v1/admin/staff', adminStaffRoutes)
  .route('/api/v1/admin/reservations', adminReservationRoutes)
  .route('/api/v1/admin/settings', adminSettingsRoutes)
  .route('/api/v1/admin/branches', adminBranchRoutes)
  .route('/api/v1/admin/qr', adminQrRoutes)
  .route('/api/v1/kitchen', kitchenOrderRoutes)
  .route('/api/v1/waiter', waiterRoutes)

export type RestaurantAppType = typeof restaurantApp
