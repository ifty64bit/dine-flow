export const ROLE_HIERARCHY = {
  admin: 3,
  manager: 2,
  staff: 1,
} as const

export type UserRole = keyof typeof ROLE_HIERARCHY

export function hasPermission(userRole: string, required: string): boolean {
  return (
    (ROLE_HIERARCHY[userRole as UserRole] ?? 0) >=
    (ROLE_HIERARCHY[required as UserRole] ?? Infinity)
  )
}

export function isAdmin(role: string): boolean {
  return role === 'admin'
}

export function isManagerOrAbove(role: string): boolean {
  return hasPermission(role, 'manager')
}

export function isStaffOrAbove(role: string): boolean {
  return hasPermission(role, 'staff')
}
