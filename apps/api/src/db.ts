import { createDb } from '@dineflow/db'
import type { Db } from '@dineflow/db'

let _db: Db | null = null

export function initDb(url: string) {
  if (!_db) _db = createDb(url)
}

// Proxy so all existing `import { db }` across routes keep working unchanged.
// Throws clearly if initDb() wasn't called before first use.
export const db = new Proxy({} as Db, {
  get(_, prop) {
    if (!_db) throw new Error('DB not initialized — initDb(url) must be called first')
    return (_db as any)[prop]
  },
})
