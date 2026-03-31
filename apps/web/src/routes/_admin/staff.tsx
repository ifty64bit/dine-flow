import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { USER_ROLES, STAFF_TYPES } from '@dineflow/shared'

export const Route = createFileRoute('/_admin/staff')({
  component: StaffPage,
})

interface StaffMember {
  id: string
  name: string
  email: string
  role: string
  staffType: string | null
  isActive: boolean
  branch: { id: string; name: string } | null
}

const EMPTY_FORM = {
  name: '',
  email: '',
  password: '',
  role: 'staff' as string,
  staffType: '' as string,
  branchId: '',
  isActive: true,
}

function StaffPage() {
  const qc = useQueryClient()
  const [editing, setEditing] = useState<StaffMember | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)

  const staffQ = useQuery({
    queryKey: ['staff'],
    queryFn: () => api.get<{ data: StaffMember[] }>('/api/v1/admin/staff'),
  })

  const branchesQ = useQuery({
    queryKey: ['branches'],
    queryFn: () => api.get<{ data: { id: string; name: string }[] }>('/api/v1/admin/branches'),
  })

  const save = useMutation({
    mutationFn: () => {
      const body = {
        ...form,
        staffType: form.staffType || undefined,
        branchId: form.branchId || undefined,
      }
      return editing
        ? api.put(`/api/v1/admin/staff/${editing.id}`, body)
        : api.post('/api/v1/admin/staff', body)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['staff'] })
      setShowForm(false)
      setEditing(null)
      setForm(EMPTY_FORM)
    },
  })

  const deactivate = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/admin/staff/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['staff'] }),
  })

  const openEdit = (s: StaffMember) => {
    setEditing(s)
    setForm({
      name: s.name,
      email: s.email,
      password: '',
      role: s.role,
      staffType: s.staffType ?? '',
      branchId: s.branch?.id ?? '',
      isActive: s.isActive,
    })
    setShowForm(true)
  }

  const staff = staffQ.data?.data ?? []
  const branches = branchesQ.data?.data ?? []
  const f = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((s) => ({ ...s, [key]: e.target.value }))

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Staff</h1>
        <button
          onClick={() => { setEditing(null); setForm(EMPTY_FORM); setShowForm(true) }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          + Add staff
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left px-4 py-3 font-medium text-gray-700">Name</th>
              <th className="text-left px-4 py-3 font-medium text-gray-700">Email</th>
              <th className="text-left px-4 py-3 font-medium text-gray-700">Role</th>
              <th className="text-left px-4 py-3 font-medium text-gray-700">Branch</th>
              <th className="text-left px-4 py-3 font-medium text-gray-700">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {staff.map((s) => (
              <tr key={s.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{s.name}</td>
                <td className="px-4 py-3 text-gray-600">{s.email}</td>
                <td className="px-4 py-3">
                  <span className="capitalize text-gray-700">{s.role}</span>
                  {s.staffType && (
                    <span className="ml-1 text-xs text-gray-400">({s.staffType})</span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-600">{s.branch?.name ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    s.isActive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {s.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-3 justify-end">
                    <button onClick={() => openEdit(s)} className="text-blue-600 hover:text-blue-800">Edit</button>
                    {s.isActive && (
                      <button
                        onClick={() => { if (confirm(`Deactivate ${s.name}?`)) deactivate.mutate(s.id) }}
                        className="text-red-500 hover:text-red-700"
                      >
                        Deactivate
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              {editing ? 'Edit staff' : 'Add staff member'}
            </h2>
            <div className="space-y-3">
              {[
                { label: 'Full name', key: 'name', type: 'text' },
                { label: 'Email', key: 'email', type: 'email' },
                { label: editing ? 'New password (leave blank to keep)' : 'Password', key: 'password', type: 'password' },
              ].map(({ label, key, type }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                  <input
                    type={type}
                    value={(form as Record<string, string>)[key]}
                    onChange={f(key)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select value={form.role} onChange={f('role')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none">
                  {USER_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Staff type</label>
                <select value={form.staffType} onChange={f('staffType')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none">
                  <option value="">None (manager/admin)</option>
                  {STAFF_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
                <select value={form.branchId} onChange={f('branchId')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none">
                  <option value="">All branches (admin)</option>
                  {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button
                onClick={() => save.mutate()}
                disabled={save.isPending || !form.name || !form.email || (!editing && !form.password)}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {save.isPending ? 'Saving…' : 'Save'}
              </button>
              <button
                onClick={() => { setShowForm(false); setEditing(null) }}
                className="flex-1 py-2 text-gray-700 rounded-lg text-sm hover:bg-gray-100"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
