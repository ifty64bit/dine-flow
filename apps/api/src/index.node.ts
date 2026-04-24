/**
 * Node.js entry point — runs as a plain Node.js server.
 * Uses Neon HTTP driver so it works with Neon serverless Postgres.
 * For Cloudflare Workers, use index.ts instead.
 */
import { config } from 'dotenv'
import { resolve } from 'path'
import { serve } from '@hono/node-server'
import { createDb } from '@dineflow/db'
import { initDb } from './db.js'
import { initRedis } from './lib/redis.js'
import { initAuth } from './middleware/auth.js'
import app from './index.js'

config({ path: resolve(process.cwd(), '../../.env') })
config({ path: resolve(process.cwd(), '.env') })

const dbUrl = process.env.DATABASE_URL
if (!dbUrl) throw new Error('DATABASE_URL is required')

const authSecret = process.env.BETTER_AUTH_SECRET ?? 'dev-secret-change-me'

initDb(dbUrl, createDb)
initAuth(authSecret)
initRedis({
  NODE_ENV: process.env.NODE_ENV,
  REDIS_URL: process.env.REDIS_URL,
})

const port = parseInt(process.env.PORT ?? '3000', 10)
serve({ fetch: app.fetch, port, hostname: '0.0.0.0' }, (info) => {
  console.log(`DineFlow API running on http://0.0.0.0:${info.port}`)
})
