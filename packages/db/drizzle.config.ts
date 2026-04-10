import { defineConfig } from 'drizzle-kit'
import { config } from 'dotenv'

config({ path: '../../.env' })

export default defineConfig({
  schema: './dist/schema/index.js',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
})
