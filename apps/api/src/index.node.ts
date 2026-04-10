/**
 * Local development entry point — runs as a plain Node.js server.
 * Uses postgres-js driver so it works with a local Docker postgres instance.
 * For production (Cloudflare Workers), use index.ts instead.
 */
import { config } from 'dotenv'
import { resolve } from 'path'
import { serve } from '@hono/node-server'
import { createDbNode } from '@dineflow/db'
import { initDb } from './db.js'
import app from './index.js'

config({ path: resolve(process.cwd(), '../../.env') })
config({ path: resolve(process.cwd(), '.env') })

const url = process.env.DATABASE_URL
if (!url) throw new Error('DATABASE_URL is required')

initDb(url, createDbNode)

const port = parseInt(process.env.PORT ?? '3000', 10)
serve({ fetch: app.fetch, port, hostname: '0.0.0.0' }, (info) => {
  console.log(`DineFlow API (dev) running on http://0.0.0.0:${info.port}`)
})
