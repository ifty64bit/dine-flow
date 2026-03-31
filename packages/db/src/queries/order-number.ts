import { sql } from 'drizzle-orm'
import type { Db } from '../client.js'

export async function getNextOrderNumber(db: Db): Promise<string> {
  const result = await db.execute(
    sql`UPDATE order_counters SET current_value = current_value + 1 WHERE id = 1 RETURNING current_value`
  )
  const rows = result as unknown as { current_value: number }[]
  const value = rows[0]?.current_value ?? 1
  return `#${String(value).padStart(4, '0')}`
}
