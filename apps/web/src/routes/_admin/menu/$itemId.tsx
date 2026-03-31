import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { z } from 'zod'
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../../lib/api'
import { KITCHEN_STATIONS, DIETARY_TAGS, VISIBILITY_MODES } from '@dineflow/shared'

const searchSchema = z.object({ categoryId: z.string().optional() })

export const Route = createFileRoute('/_admin/menu/$itemId')({
  validateSearch: searchSchema,
  component: MenuItemPage,
})

interface ClassRule {
  id: string
  tableClassId: string
  ruleType: 'include' | 'exclude'
  priceOverride: string | null
  tableClass: { id: string; name: string; badgeColor: string }
}

function MenuItemPage() {
  const { itemId } = Route.useParams()
  const { categoryId } = Route.useSearch()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const isNew = itemId === 'new'

  const [form, setForm] = useState({
    name: '',
    description: '',
    basePrice: '',
    categoryId: categoryId ?? '',
    prepTimeMin: 15,
    dietaryTags: [] as string[],
    station: '' as string,
    visibilityMode: 'all' as string,
    isAvailable: true,
    sortOrder: 0,
  })
  const [error, setError] = useState('')

  const itemQ = useQuery({
    queryKey: ['admin-menu-item', itemId],
    queryFn: () => api.get<{ data: Record<string, unknown> }>(`/api/v1/admin/menu/items/${itemId}`),
    enabled: !isNew,
  })

  const classesQ = useQuery({
    queryKey: ['table-classes'],
    queryFn: () => api.get<{ data: { id: string; name: string; badgeColor: string }[] }>('/api/v1/admin/tables/classes'),
  })

  useEffect(() => {
    if (itemQ.data?.data) {
      const d = itemQ.data.data as Record<string, unknown>
      setForm({
        name: (d.name as string) ?? '',
        description: (d.description as string) ?? '',
        basePrice: (d.basePrice as string) ?? '',
        categoryId: (d.categoryId as string) ?? '',
        prepTimeMin: (d.prepTimeMin as number) ?? 15,
        dietaryTags: (d.dietaryTags as string[]) ?? [],
        station: (d.station as string) ?? '',
        visibilityMode: (d.visibilityMode as string) ?? 'all',
        isAvailable: (d.isAvailable as boolean) ?? true,
        sortOrder: (d.sortOrder as number) ?? 0,
      })
    }
  }, [itemQ.data])

  const save = useMutation({
    mutationFn: () => {
      const body = {
        ...form,
        station: form.station || undefined,
        description: form.description || undefined,
      }
      return isNew
        ? api.post('/api/v1/admin/menu/items', body)
        : api.put(`/api/v1/admin/menu/items/${itemId}`, body)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-categories'] })
      navigate({ to: '/admin/menu' })
    },
    onError: (err: Error) => setError(err.message),
  })

  const addClassRule = useMutation({
    mutationFn: (rule: { tableClassId: string; ruleType: 'include' | 'exclude'; priceOverride?: string }) =>
      api.post(`/api/v1/admin/menu/items/${itemId}/class-rules`, rule),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-menu-item', itemId] }),
  })

  const deleteClassRule = useMutation({
    mutationFn: (ruleId: string) =>
      api.delete(`/api/v1/admin/menu/items/${itemId}/class-rules/${ruleId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-menu-item', itemId] }),
  })

  const item = itemQ.data?.data as (Record<string, unknown> & { classRules?: ClassRule[] }) | undefined
  const classRules = item?.classRules ?? []
  const tableClasses = classesQ.data?.data ?? []

  const f = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((s) => ({ ...s, [field]: e.target.value }))

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate({ to: '/admin/menu' })} className="text-blue-600 text-sm">
          ← Menu
        </button>
        <h1 className="text-2xl font-bold text-gray-900">{isNew ? 'New item' : 'Edit item'}</h1>
      </div>

      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input
              value={form.name}
              onChange={f('name')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Base price (৳) *</label>
            <input
              type="number"
              value={form.basePrice}
              onChange={f('basePrice')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Prep time (min)</label>
            <input
              type="number"
              value={form.prepTimeMin}
              onChange={f('prepTimeMin')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Station</label>
            <select
              value={form.station}
              onChange={f('station')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="">None</option>
              {KITCHEN_STATIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Visibility mode</label>
            <select
              value={form.visibilityMode}
              onChange={f('visibilityMode')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              {VISIBILITY_MODES.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            value={form.description}
            onChange={f('description')}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Dietary tags</label>
          <div className="flex flex-wrap gap-2">
            {DIETARY_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() =>
                  setForm((s) => ({
                    ...s,
                    dietaryTags: s.dietaryTags.includes(tag)
                      ? s.dietaryTags.filter((t) => t !== tag)
                      : [...s.dietaryTags, tag],
                  }))
                }
                className={`px-3 py-1 rounded-full text-sm ${
                  form.dietaryTags.includes(tag)
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <input
            id="available"
            type="checkbox"
            checked={form.isAvailable}
            onChange={(e) => setForm((s) => ({ ...s, isAvailable: e.target.checked }))}
            className="w-4 h-4"
          />
          <label htmlFor="available" className="text-sm font-medium text-gray-700">Available</label>
        </div>

        {/* Class Rules (only for existing items) */}
        {!isNew && (
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Class visibility rules</h3>
            <div className="space-y-2 mb-3">
              {classRules.map((rule) => (
                <div key={rule.id} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: rule.tableClass.badgeColor }}
                    />
                    <span className="text-sm text-gray-800">{rule.tableClass.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      rule.ruleType === 'include' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                    }`}>
                      {rule.ruleType}
                    </span>
                    {rule.priceOverride && (
                      <span className="text-xs text-gray-500">৳{parseFloat(rule.priceOverride).toFixed(0)} override</span>
                    )}
                  </div>
                  <button
                    onClick={() => deleteClassRule.mutate(rule.id)}
                    className="text-xs text-red-500 hover:text-red-700"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <select
                id="newRuleClass"
                className="flex-1 px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none"
              >
                {tableClasses.map((tc) => (
                  <option key={tc.id} value={tc.id}>{tc.name}</option>
                ))}
              </select>
              <select
                id="newRuleType"
                className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none"
              >
                <option value="include">include</option>
                <option value="exclude">exclude</option>
              </select>
              <button
                onClick={() => {
                  const sel = document.getElementById('newRuleClass') as HTMLSelectElement
                  const type = document.getElementById('newRuleType') as HTMLSelectElement
                  addClassRule.mutate({ tableClassId: sel.value, ruleType: type.value as 'include' | 'exclude' })
                }}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
              >
                Add rule
              </button>
            </div>
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-3 pt-2">
          <button
            onClick={() => save.mutate()}
            disabled={save.isPending || !form.name || !form.basePrice}
            className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {save.isPending ? 'Saving…' : 'Save item'}
          </button>
          <button
            onClick={() => navigate({ to: '/admin/menu' })}
            className="px-5 py-2 text-gray-700 rounded-lg text-sm hover:bg-gray-100"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
