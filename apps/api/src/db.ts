import { createDb } from '@dineflow/db'
import { config } from 'dotenv'
import { resolve } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

config({ path: resolve(process.cwd(), '../../.env') })
config({ path: resolve(process.cwd(), '.env') })

const url = process.env.DATABASE_URL
if (!url) throw new Error('DATABASE_URL is required')

export const db = createDb(url)
