import { pgEnum } from 'drizzle-orm/pg-core'

// SaaS enums
export const subscriptionStatusEnum = pgEnum('subscription_status', ['trialing', 'active', 'past_due', 'cancelled', 'paused'])
export const orgMemberRoleEnum = pgEnum('org_member_role', ['owner', 'admin', 'manager', 'staff'])

export const userRoleEnum = pgEnum('user_role', ['admin', 'manager', 'staff'])
export const staffTypeEnum = pgEnum('staff_type', ['waiter', 'kitchen', 'cashier'])
export const tableStatusEnum = pgEnum('table_status', ['vacant', 'occupied', 'reserved', 'cleaning', 'merged'])
export const tableShapeEnum = pgEnum('table_shape', ['round', 'square', 'rectangle'])
export const orderStatusEnum = pgEnum('order_status', ['placed', 'confirmed', 'preparing', 'ready', 'served', 'cancelled'])
export const orderItemStatusEnum = pgEnum('order_item_status', ['queued', 'preparing', 'ready', 'served'])
export const orderCreatedByEnum = pgEnum('order_created_by', ['customer', 'waiter'])
export const visibilityModeEnum = pgEnum('visibility_mode', ['all', 'include', 'exclude'])
export const classRuleTypeEnum = pgEnum('class_rule_type', ['include', 'exclude'])
export const kitchenStationEnum = pgEnum('kitchen_station', ['grill', 'fryer', 'salad', 'drinks', 'dessert', 'general'])
export const reservationStatusEnum = pgEnum('reservation_status', ['pending', 'confirmed', 'seated', 'completed', 'no_show', 'cancelled'])

// Future enums — created now so future features don't need enum migrations
export const paymentMethodEnum = pgEnum('payment_method', ['cash', 'bkash', 'nagad', 'card'])
export const paymentStatusEnum = pgEnum('payment_status', ['pending', 'completed', 'refunded', 'failed'])
export const waiterCallReasonEnum = pgEnum('waiter_call_reason', ['water', 'napkins', 'assistance', 'bill', 'other'])
export const waiterCallStatusEnum = pgEnum('waiter_call_status', ['pending', 'acknowledged', 'resolved'])
