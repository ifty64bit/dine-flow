import { config } from 'dotenv'
import { resolve } from 'path'
import bcrypt from 'bcryptjs'
import { sql } from 'drizzle-orm'
import { createDbPool } from './client.js'
import { overlordAdmins } from './schema/index.js'

config({ path: resolve(process.cwd(), '../../.env') })
config({ path: resolve(process.cwd(), '.env') })

const connectionString = process.env.DATABASE_URL
if (!connectionString) throw new Error('DATABASE_URL is required')

const db = createDbPool(connectionString)

async function seedSuperadmin() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS overlord_admins (
      id BIGSERIAL PRIMARY KEY,
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      name VARCHAR(255) NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)

  const email = (process.env.SUPERADMIN_EMAIL ?? 'superadmin@dineflow.local')
    .toLowerCase()
    .trim()
  const password = process.env.SUPERADMIN_PASSWORD ?? 'superadmin123'
  const name = (process.env.SUPERADMIN_NAME ?? 'Super Admin').trim()

  if (!password.trim()) {
    throw new Error('SUPERADMIN_PASSWORD cannot be empty')
  }

  const passwordHash = await bcrypt.hash(password, 10)

  const [admin] = await db
    .insert(overlordAdmins)
    .values({
      email,
      passwordHash,
      name,
      isActive: true,
    })
    .onConflictDoUpdate({
      target: overlordAdmins.email,
      set: {
        passwordHash,
        name,
        isActive: true,
        updatedAt: new Date(),
      },
    })
    .returning({
      id: overlordAdmins.id,
      email: overlordAdmins.email,
      name: overlordAdmins.name,
    })

  console.log(
    `Superadmin seeded: ${admin.email} (id=${admin.id}, name=${admin.name})`
  )
}

seedSuperadmin()
  .catch((error) => {
    console.error('Failed to seed superadmin:', error)
    process.exit(1)
  })
  .finally(() => process.exit(0))
