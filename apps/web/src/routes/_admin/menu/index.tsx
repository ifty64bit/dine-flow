import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../../lib/api'

export const Route = createFileRoute('/_admin/menu/')({
  component: MenuIndexPage,
})

interface Category {
  id: string
  name: string
  isActive: boolean
  sortOrder: number
  items: MenuItem[]
}

interface MenuItem {
  id: string
  name: string
  basePrice: string
  isAvailable: boolean
  station: string | null
  dietaryTags: string[]
}

function MenuIndexPage() {
  const qc = useQueryClient()
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [newCatName, setNewCatName] = useState('')
  const [showNewCat, setShowNewCat] = useState(false)

  const catsQ = useQuery({
    queryKey: ['admin-categories'],
    queryFn: () => api.get<{ data: Category[] }>('/api/v1/admin/menu/categories'),
  })

  const addCat = useMutation({
    mutationFn: (name: string) =>
      api.post('/api/v1/admin/menu/categories', { name }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-categories'] })
      setNewCatName('')
      setShowNewCat(false)
    },
  })

  const deleteCat = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/admin/menu/categories/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-categories'] }),
  })

  const toggleAvail = useMutation({
    mutationFn: ({ id, isAvailable }: { id: string; isAvailable: boolean }) =>
      api.put(`/api/v1/admin/menu/items/${id}`, { isAvailable }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-categories'] }),
  })

  const categories = catsQ.data?.data ?? []
  const toggle = (id: string) =>
    setExpanded((s) => {
      const n = new Set(s)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Menu</h1>
        <button
          onClick={() => setShowNewCat(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          + Category
        </button>
      </div>

      {showNewCat && (
        <div className="mb-4 flex gap-2">
          <input
            autoFocus
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            placeholder="Category name"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            onKeyDown={(e) => {
              if (e.key === 'Enter') addCat.mutate(newCatName)
              if (e.key === 'Escape') setShowNewCat(false)
            }}
          />
          <button
            onClick={() => addCat.mutate(newCatName)}
            disabled={!newCatName.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50"
          >
            Add
          </button>
          <button onClick={() => setShowNewCat(false)} className="px-4 py-2 text-gray-700 rounded-lg text-sm">
            Cancel
          </button>
        </div>
      )}

      <div className="space-y-3">
        {categories.map((cat) => (
          <div key={cat.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div
              className="flex items-center justify-between px-4 py-3 cursor-pointer select-none"
              onClick={() => toggle(cat.id)}
            >
              <div className="flex items-center gap-3">
                <span className="text-gray-400">{expanded.has(cat.id) ? '▼' : '▶'}</span>
                <span className="font-medium text-gray-900">{cat.name}</span>
                <span className="text-xs text-gray-500">{cat.items.length} items</span>
              </div>
              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <Link
                  to="/admin/menu/$itemId"
                  params={{ itemId: 'new' }}
                  search={{ categoryId: cat.id }}
                  className="text-xs px-3 py-1 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  + Item
                </Link>
                <button
                  onClick={() => {
                    if (confirm(`Delete "${cat.name}"?`)) deleteCat.mutate(cat.id)
                  }}
                  className="text-xs px-2 py-1 text-red-500 hover:text-red-700"
                >
                  Delete
                </button>
              </div>
            </div>

            {expanded.has(cat.id) && (
              <div className="border-t border-gray-100 divide-y divide-gray-50">
                {cat.items.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-gray-400">No items yet</p>
                ) : (
                  cat.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{item.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          ৳{parseFloat(item.basePrice).toFixed(0)}
                          {item.station && ` · ${item.station}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() =>
                            toggleAvail.mutate({ id: item.id, isAvailable: !item.isAvailable })
                          }
                          className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                            item.isAvailable
                              ? 'bg-green-50 text-green-700'
                              : 'bg-red-50 text-red-600'
                          }`}
                        >
                          {item.isAvailable ? 'Available' : 'Unavailable'}
                        </button>
                        <Link
                          to="/admin/menu/$itemId"
                          params={{ itemId: item.id }}
                          className="text-xs text-blue-600 hover:text-blue-800"
                        >
                          Edit
                        </Link>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
