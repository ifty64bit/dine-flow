import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import * as schema from './schema/index.js'

export function createDb(url: string) {
  const sql = neon(url)
  return drizzle(sql, { schema })
}

export type Db = ReturnType<typeof createDb>
