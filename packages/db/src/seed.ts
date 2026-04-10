import { config } from 'dotenv'
import { resolve } from 'path'
import { createDbNode } from './client.js'
import { sql } from 'drizzle-orm'
import {
  settings,
  branches,
  tableClasses,
  floors,
  tables,
  users,
  menuCategories,
  menuItems,
  menuItemClassRules,
  modifierGroups,
  menuItemModifierGroups,
  modifiers,
  orderCounters,
} from './schema/index.js'
import bcrypt from 'bcryptjs'

config({ path: resolve(process.cwd(), '../../.env') })
config({ path: resolve(process.cwd(), '.env') })

const connectionString = process.env.DATABASE_URL
if (!connectionString) throw new Error('DATABASE_URL is required')

const db = createDbNode(connectionString)

async function seed() {
  console.log('Seeding database...')

  // Settings
  await db
    .insert(settings)
    .values({
      restaurantName: 'My Restaurant',
      currency: 'BDT',
      timezone: 'Asia/Dhaka',
      taxRate: '0',
      serviceChargeRate: '0',
      taxInclusive: true,
      branding: {},
    })
    .onConflictDoNothing()

  // Branch
  const [branch] = await db
    .insert(branches)
    .values({
      name: 'Main Branch',
      address: '123 Main Street, Dhaka',
      phone: '+8801700000000',
      operatingHours: {
        mon: { open: '09:00', close: '22:00' },
        tue: { open: '09:00', close: '22:00' },
        wed: { open: '09:00', close: '22:00' },
        thu: { open: '09:00', close: '22:00' },
        fri: { open: '09:00', close: '23:00' },
        sat: { open: '09:00', close: '23:00' },
        sun: { open: '09:00', close: '22:00' },
      },
      isActive: true,
    })
    .returning()
  console.log(`Branch: ${branch.name} (${branch.id})`)

  // Table classes
  const [regularClass] = await db
    .insert(tableClasses)
    .values({
      name: 'Regular',
      slug: 'regular',
      description: 'Standard seating',
      badgeColor: '#6B7280',
      priceMultiplier: '1.00',
      sortOrder: 1,
      isDefault: true,
      isActive: true,
    })
    .returning()

  const [vipClass] = await db
    .insert(tableClasses)
    .values({
      name: 'VIP',
      slug: 'vip',
      description: 'Premium VIP seating with exclusive menu',
      badgeColor: '#E94560',
      priceMultiplier: '1.20',
      sortOrder: 2,
      isDefault: false,
      isActive: true,
    })
    .returning()

  console.log(`Table classes: ${regularClass.name}, ${vipClass.name}`)

  // Floor
  const [floor] = await db
    .insert(floors)
    .values({
      branchId: branch.id,
      name: 'Ground Floor',
      sortOrder: 1,
    })
    .returning()

  // Tables
  const tableData = [
    {
      number: 1,
      capacity: 4,
      tableClassId: regularClass.id,
      positionX: '50',
      positionY: '50',
    },
    {
      number: 2,
      capacity: 4,
      tableClassId: regularClass.id,
      positionX: '200',
      positionY: '50',
    },
    {
      number: 3,
      capacity: 6,
      tableClassId: regularClass.id,
      positionX: '50',
      positionY: '200',
    },
    {
      number: 4,
      capacity: 6,
      tableClassId: regularClass.id,
      positionX: '200',
      positionY: '200',
    },
    {
      number: 5,
      capacity: 2,
      tableClassId: vipClass.id,
      positionX: '400',
      positionY: '50',
    },
    {
      number: 6,
      capacity: 4,
      tableClassId: vipClass.id,
      positionX: '400',
      positionY: '200',
    },
  ]
  const insertedTables = await db
    .insert(tables)
    .values(
      tableData.map((t) => ({
        ...t,
        floorId: floor.id,
        shape: 'square' as const,
        status: 'vacant' as const,
        qrCodeUrl: `http://menu.local/table/PLACEHOLDER`,
      }))
    )
    .returning()

  // Update QR codes with actual table IDs
  for (const t of insertedTables) {
    await db
      .update(tables)
      .set({
        qrCodeUrl: `http://menu.local/table/${t.id}`,
      })
      .where(sql`id = ${t.id}`)
  }
  console.log(`Created ${insertedTables.length} tables`)

  // Users
  const adminHash = await bcrypt.hash('admin123', 10)
  const managerHash = await bcrypt.hash('manager123', 10)
  const waiterHash = await bcrypt.hash('waiter123', 10)
  const kitchenHash = await bcrypt.hash('kitchen123', 10)

  await db.insert(users).values([
    {
      email: 'admin@restaurant.local',
      passwordHash: adminHash,
      name: 'Admin User',
      role: 'admin',
      isActive: true,
    },
    {
      email: 'manager@restaurant.local',
      passwordHash: managerHash,
      name: 'Manager User',
      role: 'manager',
      branchId: branch.id,
      isActive: true,
    },
    {
      email: 'waiter1@restaurant.local',
      passwordHash: waiterHash,
      name: 'Waiter One',
      role: 'staff',
      staffType: 'waiter',
      branchId: branch.id,
      isActive: true,
    },
    {
      email: 'kitchen1@restaurant.local',
      passwordHash: kitchenHash,
      name: 'Kitchen Staff One',
      role: 'staff',
      staffType: 'kitchen',
      branchId: branch.id,
      isActive: true,
    },
  ])
  console.log('Created users')

  // Menu Categories
  const [starters] = await db
    .insert(menuCategories)
    .values({
      name: 'Starters',
      description: 'Begin your meal with our delicious starters',
      sortOrder: 1,
      isActive: true,
    })
    .returning()

  const [mains] = await db
    .insert(menuCategories)
    .values({
      name: 'Mains',
      description: 'Our signature main courses',
      sortOrder: 2,
      isActive: true,
    })
    .returning()

  const [desserts] = await db
    .insert(menuCategories)
    .values({
      name: 'Desserts',
      description: 'Sweet endings to a perfect meal',
      sortOrder: 3,
      isActive: true,
    })
    .returning()

  const [drinks] = await db
    .insert(menuCategories)
    .values({
      name: 'Drinks',
      description: 'Refreshing beverages',
      sortOrder: 4,
      isActive: true,
    })
    .returning()

  // Modifier Groups
  const [sizeGroup] = await db
    .insert(modifierGroups)
    .values({
      name: 'Size',
      isRequired: true,
      minSelect: 1,
      maxSelect: 1,
    })
    .returning()

  const [extrasGroup] = await db
    .insert(modifierGroups)
    .values({
      name: 'Extras',
      isRequired: false,
      minSelect: 0,
      maxSelect: 3,
    })
    .returning()

  // Size modifiers
  await db.insert(modifiers).values([
    {
      groupId: sizeGroup.id,
      name: 'Small',
      priceAdjustment: '-20',
      sortOrder: 1,
    },
    {
      groupId: sizeGroup.id,
      name: 'Medium',
      priceAdjustment: '0',
      sortOrder: 2,
    },
    {
      groupId: sizeGroup.id,
      name: 'Large',
      priceAdjustment: '30',
      sortOrder: 3,
    },
  ])

  // Extras modifiers
  await db.insert(modifiers).values([
    {
      groupId: extrasGroup.id,
      name: 'Extra Cheese',
      priceAdjustment: '30',
      sortOrder: 1,
    },
    {
      groupId: extrasGroup.id,
      name: 'Extra Sauce',
      priceAdjustment: '20',
      sortOrder: 2,
    },
    {
      groupId: extrasGroup.id,
      name: 'Extra Spicy',
      priceAdjustment: '10',
      sortOrder: 3,
    },
  ])

  // Menu Items — Starters
  const starterItems = await db
    .insert(menuItems)
    .values([
      {
        categoryId: starters.id,
        name: 'Vegetable Spring Rolls',
        description:
          'Crispy spring rolls filled with seasonal vegetables and glass noodles',
        basePrice: '150',
        prepTimeMin: 10,
        dietaryTags: ['vegetarian'],
        isAvailable: true,
        station: 'fryer',
        visibilityMode: 'all',
        sortOrder: 1,
      },
      {
        categoryId: starters.id,
        name: 'Chicken Tikka',
        description:
          'Tender chicken marinated in yogurt and spices, grilled to perfection',
        basePrice: '280',
        prepTimeMin: 20,
        dietaryTags: [],
        isAvailable: true,
        station: 'grill',
        visibilityMode: 'all',
        sortOrder: 2,
      },
      {
        categoryId: starters.id,
        name: 'Truffle Fries',
        description: 'Premium crispy fries tossed in truffle oil with parmesan',
        basePrice: '450',
        prepTimeMin: 15,
        dietaryTags: ['vegetarian'],
        isAvailable: true,
        station: 'fryer',
        visibilityMode: 'include',
        sortOrder: 3,
      },
    ])
    .returning()

  // Starters: Truffle Fries is VIP-only (include rule for VIP)
  await db.insert(menuItemClassRules).values({
    menuItemId: starterItems[2].id,
    tableClassId: vipClass.id,
    ruleType: 'include',
    priceOverride: null,
  })

  // Menu Items — Mains
  const mainItems = await db
    .insert(menuItems)
    .values([
      {
        categoryId: mains.id,
        name: 'Grilled Chicken Burger',
        description:
          'Juicy grilled chicken with lettuce, tomato, and special sauce',
        basePrice: '350',
        prepTimeMin: 20,
        dietaryTags: [],
        isAvailable: true,
        station: 'grill',
        visibilityMode: 'all',
        sortOrder: 1,
      },
      {
        categoryId: mains.id,
        name: 'Budget Combo',
        description: 'Value meal with rice, lentil soup, and salad',
        basePrice: '180',
        prepTimeMin: 15,
        dietaryTags: ['vegetarian'],
        isAvailable: true,
        station: 'general',
        visibilityMode: 'exclude',
        sortOrder: 2,
      },
      {
        categoryId: mains.id,
        name: 'Wagyu Burger',
        description:
          'Premium A5 Wagyu beef patty with caramelized onions and truffle mayo',
        basePrice: '1200',
        prepTimeMin: 25,
        dietaryTags: [],
        isAvailable: true,
        station: 'grill',
        visibilityMode: 'include',
        sortOrder: 3,
      },
    ])
    .returning()

  // Budget Combo: excluded from VIP
  await db.insert(menuItemClassRules).values({
    menuItemId: mainItems[1].id,
    tableClassId: vipClass.id,
    ruleType: 'exclude',
    priceOverride: null,
  })

  // Wagyu Burger: VIP-only
  await db.insert(menuItemClassRules).values({
    menuItemId: mainItems[2].id,
    tableClassId: vipClass.id,
    ruleType: 'include',
    priceOverride: null,
  })

  // Menu Items — Desserts
  const dessertItems = await db
    .insert(menuItems)
    .values([
      {
        categoryId: desserts.id,
        name: 'Chocolate Lava Cake',
        description:
          'Warm chocolate cake with a gooey molten center, served with vanilla ice cream',
        basePrice: '250',
        prepTimeMin: 15,
        dietaryTags: ['vegetarian'],
        isAvailable: true,
        station: 'dessert',
        visibilityMode: 'all',
        sortOrder: 1,
      },
      {
        categoryId: desserts.id,
        name: 'Rasgolla',
        description:
          'Traditional Bengali soft cottage cheese balls in light sugar syrup',
        basePrice: '120',
        prepTimeMin: 5,
        dietaryTags: ['vegetarian'],
        isAvailable: true,
        station: 'dessert',
        visibilityMode: 'all',
        sortOrder: 2,
      },
      {
        categoryId: desserts.id,
        name: 'Mango Kulfi',
        description:
          'Creamy frozen dessert made with reduced milk and fresh Alphonso mango',
        basePrice: '150',
        prepTimeMin: 3,
        dietaryTags: ['vegetarian'],
        isAvailable: true,
        station: 'dessert',
        visibilityMode: 'all',
        sortOrder: 3,
      },
    ])
    .returning()

  // Menu Items — Drinks
  const drinkItems = await db
    .insert(menuItems)
    .values([
      {
        categoryId: drinks.id,
        name: 'Fresh Lime Soda',
        description:
          'Freshly squeezed lime with sparkling water and a hint of mint',
        basePrice: '80',
        prepTimeMin: 5,
        dietaryTags: ['vegan', 'gluten-free'],
        isAvailable: true,
        station: 'drinks',
        visibilityMode: 'all',
        sortOrder: 1,
      },
      {
        categoryId: drinks.id,
        name: 'Mango Lassi',
        description:
          'Thick and creamy yogurt blended with sweet Alphonso mango',
        basePrice: '120',
        prepTimeMin: 5,
        dietaryTags: ['vegetarian', 'gluten-free'],
        isAvailable: true,
        station: 'drinks',
        visibilityMode: 'all',
        sortOrder: 2,
      },
      {
        categoryId: drinks.id,
        name: 'Masala Chai',
        description:
          'Aromatic spiced tea brewed with cardamom, ginger, and cinnamon',
        basePrice: '60',
        prepTimeMin: 8,
        dietaryTags: ['vegetarian', 'gluten-free'],
        isAvailable: true,
        station: 'drinks',
        visibilityMode: 'all',
        sortOrder: 3,
      },
    ])
    .returning()

  // Attach modifier groups to select items
  const itemsWithModifiers = [
    ...starterItems.slice(0, 2),
    mainItems[0],
    ...drinkItems.slice(0, 2),
  ]
  for (const item of itemsWithModifiers) {
    await db
      .insert(menuItemModifierGroups)
      .values([
        { menuItemId: item.id, modifierGroupId: sizeGroup.id },
        { menuItemId: item.id, modifierGroupId: extrasGroup.id },
      ])
      .onConflictDoNothing()
  }

  // Order counter
  await db
    .insert(orderCounters)
    .values({ id: 1, currentValue: 0 })
    .onConflictDoNothing()

  console.log('Seed complete!')
  console.log('\nDefault logins:')
  console.log('  admin@restaurant.local / admin123')
  console.log('  manager@restaurant.local / manager123')
  console.log('  waiter1@restaurant.local / waiter123')
  console.log('  kitchen1@restaurant.local / kitchen123')
  process.exit(0)
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
