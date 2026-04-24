import { drizzle } from 'drizzle-orm/neon-serverless'
import { migrate } from 'drizzle-orm/migrator'
import { Pool } from '@neondatabase/serverless'
import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '../../.env') })
config({ path: resolve(process.cwd(), '.env') })

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required')
}

const pool = new Pool({ connectionString })
const db = drizzle(pool)

async function runMigrations() {
  console.log('Running migrations...')
  await migrate(db, { migrationsFolder: './migrations' })
  console.log('Migrations complete!')
}

runMigrations()
  .catch((error) => {
    console.error('Migration failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await pool.end()
  })
