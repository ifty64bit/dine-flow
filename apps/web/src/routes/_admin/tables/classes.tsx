import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../../lib/api'

export const Route = createFileRoute('/_admin/tables/classes')({
  component: TableClassesPage,
})

interface TableClass {
  id: string
  name: string
  slug: string
  description: string | null
  badgeColor: string
  priceMultiplier: string
  isDefault: boolean
  isActive: boolean
  sortOrder: number
}

const EMPTY_FORM = {
  name: '',
  slug: '',
  description: '',
  badgeColor: '#6B7280',
  priceMultiplier: '1.00',
  sortOrder: 0,
  isDefault: false,
  isActive: true,
}

function TableClassesPage() {
  const qc = useQueryClient()
  const [editing, setEditing] = useState<TableClass | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [showForm, setShowForm] = useState(false)

  const classesQ = useQuery({
    queryKey: ['table-classes'],
    queryFn: () => api.get<{ data: TableClass[] }>('/api/v1/admin/tables/classes'),
  })

  const save = useMutation({
    mutationFn: () =>
      editing
        ? api.put(`/api/v1/admin/tables/classes/${editing.id}`, form)
        : api.post('/api/v1/admin/tables/classes', form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['table-classes'] })
      setEditing(null)
      setForm(EMPTY_FORM)
      setShowForm(false)
    },
  })

  const deleteClass = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/admin/tables/classes/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['table-classes'] }),
  })

  const openEdit = (tc: TableClass) => {
    setEditing(tc)
    setForm({
      name: tc.name,
      slug: tc.slug,
      description: tc.description ?? '',
      badgeColor: tc.badgeColor,
      priceMultiplier: tc.priceMultiplier,
      sortOrder: tc.sortOrder,
      isDefault: tc.isDefault,
      isActive: tc.isActive,
    })
    setShowForm(true)
  }

  const classes = classesQ.data?.data ?? []

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Table Classes</h1>
        <button
          onClick={() => { setEditing(null); setForm(EMPTY_FORM); setShowForm(true) }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          + New class
        </button>
      </div>

      <div className="grid gap-3">
        {classes.map((tc) => (
          <div key={tc.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-4 h-4 rounded-full flex-shrink-0"
                style={{ backgroundColor: tc.badgeColor }}
              />
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium text-gray-900">{tc.name}</p>
                  {tc.isDefault && (
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">Default</span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  {tc.priceMultiplier}× price · slug: {tc.slug}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => openEdit(tc)}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Edit
              </button>
              {!tc.isDefault && (
                <button
                  onClick={() => { if (confirm(`Delete "${tc.name}"?`)) deleteClass.mutate(tc.id) }}
                  className="text-sm text-red-500 hover:text-red-700"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              {editing ? 'Edit class' : 'New table class'}
            </h2>
            <div className="space-y-3">
              {[
                { label: 'Name', key: 'name', type: 'text' },
                { label: 'Slug (e.g. vip)', key: 'slug', type: 'text' },
                { label: 'Price multiplier (e.g. 1.20)', key: 'priceMultiplier', type: 'text' },
                { label: 'Sort order', key: 'sortOrder', type: 'number' },
              ].map(({ label, key, type }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                  <input
                    type={type}
                    value={(form as Record<string, unknown>)[key] as string}
                    onChange={(e) => setForm((s) => ({ ...s, [key]: type === 'number' ? parseInt(e.target.value) : e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Badge color</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={form.badgeColor}
                    onChange={(e) => setForm((s) => ({ ...s, badgeColor: e.target.value }))}
                    className="w-10 h-10 border border-gray-300 rounded-lg cursor-pointer"
                  />
                  <input
                    type="text"
                    value={form.badgeColor}
                    onChange={(e) => setForm((s) => ({ ...s, badgeColor: e.target.value }))}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="cls-active"
                  checked={form.isActive}
                  onChange={(e) => setForm((s) => ({ ...s, isActive: e.target.checked }))}
                  className="w-4 h-4"
                />
                <label htmlFor="cls-active" className="text-sm text-gray-700">Active</label>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button
                onClick={() => save.mutate()}
                disabled={save.isPending || !form.name || !form.slug}
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
