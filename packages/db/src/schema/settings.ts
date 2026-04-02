import { pgTable, bigserial, varchar, numeric, boolean, jsonb, timestamp } from 'drizzle-orm/pg-core'

export const settings = pgTable('settings', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  restaurantName: varchar('restaurant_name', { length: 255 }).notNull().default('My Restaurant'),
  logoUrl: varchar('logo_url', { length: 500 }),
  currency: varchar('currency', { length: 10 }).notNull().default('BDT'),
  timezone: varchar('timezone', { length: 100 }).notNull().default('Asia/Dhaka'),
  taxRate: numeric('tax_rate', { precision: 5, scale: 2 }).notNull().default('0'),
  serviceChargeRate: numeric('service_charge_rate', { precision: 5, scale: 2 }).notNull().default('0'),
  taxInclusive: boolean('tax_inclusive').notNull().default(true),
  branding: jsonb('branding').notNull().default({}),
  licenseKey: varchar('license_key', { length: 500 }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})
