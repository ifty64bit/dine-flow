import { Hono } from 'hono'
import { overlordAuthRoutes } from './auth.js'
import { overlordStatsRoutes } from './stats.js'
import { overlordOrgRoutes } from './organizations.js'
import { overlordPlanRoutes } from './plans.js'
import { overlordUserRoutes } from './users.js'

export const overlordRoutes = new Hono()
  .route('/auth',          overlordAuthRoutes)
  .route('/stats',         overlordStatsRoutes)
  .route('/organizations', overlordOrgRoutes)
  .route('/plans',         overlordPlanRoutes)
  .route('/users',         overlordUserRoutes)
