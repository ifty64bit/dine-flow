import { drizzle as drizzleNeon } from 'drizzle-orm/neon-http'
import { drizzle as drizzleNeonServerless } from 'drizzle-orm/neon-serverless'
import { neon, Pool } from '@neondatabase/serverless'
import * as schema from './schema/index.js'

/** For API runtime — uses Neon HTTP transport (works in CF Workers and Node.js) */
export function createDb(url: string) {
  const sql = neon(url)
  return drizzleNeon(sql, { schema })
}

/** For Node.js scripts — uses Neon TCP pool (migrations, seeds, etc.) */
export function createDbPool(url: string) {
  const pool = new Pool({ connectionString: url })
  return drizzleNeonServerless(pool, { schema })
}

export type Db = ReturnType<typeof createDb>
