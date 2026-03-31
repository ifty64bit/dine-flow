import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { z } from 'zod'
import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { useCart } from '../../store/cart'

const searchSchema = z.object({
  sessionId: z.string(),
  tableId: z.string(),
})

export const Route = createFileRoute('/_customer/cart')({
  validateSearch: searchSchema,
  component: CartPage,
})

function CartPage() {
  const { sessionId, tableId } = Route.useSearch()
  const navigate = useNavigate()
  const { state, dispatch, total, itemCount } = useCart()
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')

  const placeOrder = useMutation({
    mutationFn: () =>
      api.post('/api/v1/customer/orders', {
        sessionId,
        items: state.items.map((item) => ({
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          modifiers: item.modifiers,
          specialInstructions: item.specialInstructions,
        })),
        notes: notes || undefined,
      }),
    onSuccess: () => {
      dispatch({ type: 'CLEAR' })
      navigate({ to: '/orders', search: { sessionId } })
    },
    onError: (err: Error) => setError(err.message),
  })

  if (state.items.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center">
        <div className="text-5xl mb-4">🛒</div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Your cart is empty</h2>
        <p className="text-gray-500 mb-6">Add items from the menu to get started.</p>
        <Link
          to="/menu"
          search={{ sessionId, tableId }}
          className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-medium"
        >
          Browse menu
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto pb-32">
      <div className="sticky top-0 bg-white border-b border-gray-200 z-10 px-4 py-3 flex items-center gap-3">
        <Link to="/menu" search={{ sessionId, tableId }} className="text-blue-600 text-sm">
          ← Menu
        </Link>
        <h1 className="text-lg font-bold text-gray-900">Your cart</h1>
      </div>

      <div className="px-4 py-4 space-y-3">
        {state.items.map((item) => (
          <div key={item.menuItemId} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <h3 className="font-medium text-gray-900">{item.name}</h3>
                {item.modifiers.length > 0 && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    {item.modifiers.map((m) => m.name).join(', ')}
                  </p>
                )}
              </div>
              <span className="font-semibold text-gray-900">
                ৳{(item.unitPrice * item.quantity).toFixed(0)}
              </span>
            </div>

            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    dispatch({
                      type: 'UPDATE_QUANTITY',
                      menuItemId: item.menuItemId,
                      quantity: item.quantity - 1,
                    })
                  }
                  className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  −
                </button>
                <span className="w-6 text-center font-medium">{item.quantity}</span>
                <button
                  onClick={() =>
                    dispatch({
                      type: 'UPDATE_QUANTITY',
                      menuItemId: item.menuItemId,
                      quantity: item.quantity + 1,
                    })
                  }
                  className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  +
                </button>
              </div>
              <button
                onClick={() =>
                  dispatch({ type: 'REMOVE_ITEM', menuItemId: item.menuItemId })
                }
                className="text-sm text-red-500 hover:text-red-700"
              >
                Remove
              </button>
            </div>
          </div>
        ))}

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Order notes (optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Any allergies, preferences…"
            className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>
      </div>

      {/* Order summary + CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>Subtotal ({itemCount} items)</span>
            <span>৳{total.toFixed(0)}</span>
          </div>

          {error && (
            <p className="text-sm text-red-600 mb-2">{error}</p>
          )}

          <button
            onClick={() => placeOrder.mutate()}
            disabled={placeOrder.isPending}
            className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {placeOrder.isPending ? 'Placing order…' : `Place order · ৳${total.toFixed(0)}`}
          </button>
        </div>
      </div>
    </div>
  )
}
