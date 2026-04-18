import { createDb } from '@dineflow/db'
import type { Db } from '@dineflow/db'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DbFactory = (url: string) => any

let _db: Db | null = null

/** Call once before handling requests. Pass a custom factory for non-CF runtimes (e.g. createDbNode for local dev). */
export function initDb(url: string, factory: DbFactory = createDb) {
  if (!_db) _db = factory(url)
}

// Proxy so all existing `import { db }` across routes keep working unchanged.
export const db: Db = new Proxy({} as Db, {
  get(_, prop) {
    if (!_db) throw new Error('DB not initialized — call initDb(url) first')
    return (_db as any)[prop]
  },
})
