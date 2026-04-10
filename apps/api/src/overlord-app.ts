/**
 * Minimal Hono app containing ONLY the overlord routes.
 * Used exclusively for TypeScript declaration generation — never imported at runtime.
 * Run `bun run gen-types` to regenerate dist/overlord-app.d.ts after route changes.
 */
import { Hono } from 'hono'
import { overlordRoutes } from './routes/overlord/index.js'

const overlordApp = new Hono().route('/api/overlord', overlordRoutes)

export type OverlordAppType = typeof overlordApp
