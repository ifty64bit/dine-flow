import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Users, AlertCircle } from 'lucide-react'
import { client } from '@/lib/client'

export const Route = createFileRoute('/_auth/staff/')({
  component: StaffPage,
})

const ROLE_STYLES: Record<string, { bg: string; text: string }> = {
  manager:       { bg: 'bg-violet-500/10', text: 'text-violet-400' },
  waiter:        { bg: 'bg-sky-500/10',    text: 'text-sky-400' },
  kitchen_staff: { bg: 'bg-orange-500/10', text: 'text-orange-400' },
  cashier:       { bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
}

function StaffPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['portal', 'staff'],
    queryFn: async () => {
      const res = await client.api.v1.admin.staff.$get()
      if (!res.ok) throw new Error('Failed to load staff')
      return res.json()
    },
  })

  const staff = data?.data ?? []

  return (
    <div className="p-6 space-y-5 max-w-5xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-zinc-100">Staff</h1>
        <p className="text-sm text-zinc-500 mt-0.5">{staff.length} members</p>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <div className="w-5 h-5 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
        </div>
      )}

      {isError && (
        <div className="flex items-center justify-center gap-2 py-16 text-red-400">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm">Failed to load staff</span>
        </div>
      )}

      {!isLoading && staff.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-2 text-zinc-600">
          <Users className="w-8 h-8" />
          <p className="text-sm">No staff members found</p>
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {(
          staff as Array<{
            id: number
            name: string
            email: string
            role: string
            staffType: string | null
            isActive: boolean
          }>
        ).map((member) => {
          const style = ROLE_STYLES[member.staffType ?? member.role] ?? {
            bg: 'bg-zinc-500/10',
            text: 'text-zinc-400',
          }
          return (
            <div
              key={member.id}
              className={`bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center gap-3 ${
                !member.isActive ? 'opacity-50' : ''
              }`}
            >
              <div className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center text-sm font-bold text-zinc-400 shrink-0">
                {member.name[0]?.toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-zinc-200 truncate">
                  {member.name}
                </p>
                <p className="text-xs text-zinc-600 truncate">{member.email}</p>
              </div>
              <span
                className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${style.bg} ${style.text}`}
              >
                {member.staffType ?? member.role}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
