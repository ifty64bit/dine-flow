import { drizzle as drizzleNeon } from 'drizzle-orm/neon-http'
import { drizzle as drizzleNode } from 'drizzle-orm/postgres-js'
import { neon } from '@neondatabase/serverless'
import * as schema from './schema/index.js'

/** For Cloudflare Workers (production) — uses Neon HTTP transport */
export function createDb(url: string) {
  const sql = neon(url)
  return drizzleNeon(sql, { schema })
}

/** For Node.js (local dev) — uses standard TCP postgres connection */
export function createDbNode(url: string) {
  // Dynamic import so CF Workers bundler never tries to bundle postgres
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const postgres = require('postgres')
  const client = postgres(url)
  return drizzleNode(client, { schema })
}

export type Db = ReturnType<typeof createDb>
