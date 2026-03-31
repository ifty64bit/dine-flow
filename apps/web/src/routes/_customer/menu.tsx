import { createFileRoute, Link } from '@tanstack/react-router'
import { z } from 'zod'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { useCart } from '../../store/cart'
import type { ResolvedCategory, ResolvedMenuItem } from '@dineflow/db'

const searchSchema = z.object({
  sessionId: z.string(),
  tableId: z.string(),
})

export const Route = createFileRoute('/_customer/menu')({
  validateSearch: searchSchema,
  component: MenuPage,
})

function MenuPage() {
  const { sessionId, tableId } = Route.useSearch()
  const { dispatch, itemCount, total } = useCart()
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  // Fetch session to get branchId
  const sessionQ = useQuery({
    queryKey: ['session', sessionId],
    queryFn: () => api.get<{ data: { table: { floor: { branchId: string } } } }>(`/api/v1/customer/session/${sessionId}`),
    staleTime: Infinity,
  })

  const branchId = sessionQ.data?.data.table.floor.branchId ?? ''

  const menuQ = useQuery({
    queryKey: ['customer-menu', branchId, tableId],
    queryFn: () =>
      api.get<{ data: ResolvedCategory[] }>(`/api/v1/customer/menu/${branchId}?table=${tableId}`),
    enabled: !!branchId,
  })

  const categories = menuQ.data?.data ?? []
  const displayed = activeCategory
    ? categories.filter((c) => c.id === activeCategory)
    : categories

  const addToCart = (item: ResolvedMenuItem) => {
    dispatch({
      type: 'ADD_ITEM',
      item: {
        menuItemId: item.id,
        name: item.name,
        quantity: 1,
        unitPrice: item.resolvedPrice,
        modifiers: [],
      },
    })
  }

  if (menuQ.isLoading || sessionQ.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto pb-24">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-200 z-10 px-4 py-3">
        <h1 className="text-lg font-bold text-gray-900">Menu</h1>

        {/* Category tabs */}
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1 scrollbar-hide">
          <button
            onClick={() => setActiveCategory(null)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              !activeCategory ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                activeCategory === cat.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Menu items */}
      <div className="px-4 py-4 space-y-8">
        {displayed.map((category) => (
          <div key={category.id}>
            <h2 className="text-base font-semibold text-gray-900 mb-3">{category.name}</h2>
            <div className="space-y-3">
              {category.items.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-xl border border-gray-200 p-4 flex gap-4"
                >
                  {item.imageUrl && (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-medium text-gray-900 text-sm">{item.name}</h3>
                      <span className="font-semibold text-gray-900 text-sm flex-shrink-0">
                        ৳{item.resolvedPrice.toFixed(0)}
                      </span>
                    </div>
                    {item.description && (
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{item.description}</p>
                    )}
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex gap-1 flex-wrap">
                        {item.dietaryTags.map((tag) => (
                          <span
                            key={tag}
                            className="text-xs px-1.5 py-0.5 bg-green-50 text-green-700 rounded"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                      <button
                        onClick={() => addToCart(item)}
                        className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Cart FAB */}
      {itemCount > 0 && (
        <div className="fixed bottom-4 left-4 right-4 max-w-2xl mx-auto">
          <Link
            to="/cart"
            search={{ sessionId, tableId }}
            className="flex items-center justify-between bg-blue-600 text-white px-5 py-3.5 rounded-2xl shadow-lg"
          >
            <span className="bg-blue-500 rounded-lg px-2 py-0.5 text-sm font-bold">
              {itemCount}
            </span>
            <span className="font-semibold">View cart</span>
            <span className="font-semibold">৳{total.toFixed(0)}</span>
          </Link>
        </div>
      )}
    </div>
  )
}
