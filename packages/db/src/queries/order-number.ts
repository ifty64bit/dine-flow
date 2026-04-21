import { sql } from 'drizzle-orm'
import type { Db } from '../client.js'

export async function getNextOrderNumber(db: Db, branchId: number): Promise<string> {
  const result = await db.execute(
    sql`
      INSERT INTO order_counters (branch_id, start_from, current_value)
      VALUES (${branchId}, 1000, 1)
      ON CONFLICT (branch_id)
      DO UPDATE SET current_value = order_counters.current_value + 1
      RETURNING current_value
    `
  )
  const rows = result as unknown as { current_value: number }[]
  const value = rows[0]?.current_value ?? 1
  return `#${String(value).padStart(4, '0')}`
}
