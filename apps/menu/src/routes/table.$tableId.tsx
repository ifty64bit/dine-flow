import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation } from '@tanstack/react-query'
import {
  UtensilsCrossed,
  ShoppingCart,
  Plus,
  Minus,
  X,
  ChevronLeft,
  Loader2,
  CheckCircle,
  AlertCircle,
  ClipboardList,
} from 'lucide-react'
import { useState, useRef } from 'react'
import { client, api } from '@/lib/client'
import type { MenuItem, Session } from '@/lib/types'

export const Route = createFileRoute('/table/$tableId')({
  component: TablePage,
})

// ─── Types ────────────────────────────────────────────────────────────────────

interface TableInfo {
  tableId: number
  tableNumber: number
  capacity: number
  tableClassName: string
  branchId: number
  branchName: string
  orgName: string
  orgSlug: string
  currency: string
}

interface CartItem {
  menuItemId: number
  name: string
  resolvedPrice: number
  quantity: number
  modifiers: { modifierId: number; modifierGroupId: number }[]
  modifierLabels: string[]
  specialInstructions?: string
}

type ViewState = 'welcome' | 'menu' | 'placed'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(currency: string, amount: number) {
  if (currency === 'BDT') return `৳${amount.toFixed(0)}`
  return `${currency} ${amount.toFixed(2)}`
}

function cartTotal(cart: CartItem[]) {
  return cart.reduce((sum, i) => sum + i.resolvedPrice * i.quantity, 0)
}

// ─── Item Detail Modal ────────────────────────────────────────────────────────

function ItemModal({
  item,
  currency,
  onClose,
  onAdd,
}: {
  item: MenuItem
  currency: string
  onClose: () => void
  onAdd: (cartItem: CartItem) => void
}) {
  const [qty, setQty] = useState(1)
  const [selectedMods, setSelectedMods] = useState<Record<number, number[]>>({})
  const [note, setNote] = useState('')

  function toggleMod(groupId: number, modId: number, maxSelect: number) {
    setSelectedMods(prev => {
      const current = prev[groupId] ?? []
      if (current.includes(modId)) {
        return { ...prev, [groupId]: current.filter(id => id !== modId) }
      }
      if (maxSelect === 1) return { ...prev, [groupId]: [modId] }
      if (current.length >= maxSelect) return prev
      return { ...prev, [groupId]: [...current, modId] }
    })
  }

  function handleAdd() {
    const modifiers: CartItem['modifiers'] = []
    const modifierLabels: string[] = []
    for (const group of item.modifierGroups) {
      const chosen = selectedMods[group.id] ?? []
      for (const modId of chosen) {
        modifiers.push({ modifierId: modId, modifierGroupId: group.id })
        const mod = group.modifiers.find(m => m.id === modId)
        if (mod) modifierLabels.push(mod.name)
      }
    }

    const extraCost = item.modifierGroups.flatMap(g =>
      (selectedMods[g.id] ?? []).map(modId => {
        const mod = g.modifiers.find(m => m.id === modId)
        return mod?.priceAdjustment ?? 0
      })
    ).reduce((a, b) => a + b, 0)

    onAdd({
      menuItemId: item.id,
      name: item.name,
      resolvedPrice: item.resolvedPrice + extraCost,
      quantity: qty,
      modifiers,
      modifierLabels,
      specialInstructions: note || undefined,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70">
      <div className="w-full sm:max-w-md bg-zinc-900 rounded-t-3xl sm:rounded-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-5 pb-3">
          <div className="flex-1 pr-4">
            <h3 className="text-base font-bold text-zinc-100">{item.name}</h3>
            {item.description && (
              <p className="text-xs text-zinc-500 mt-1">{item.description}</p>
            )}
            <p className="text-sm font-semibold text-orange-400 mt-2">
              {fmt(currency, item.resolvedPrice)}
            </p>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 pb-2 space-y-5">
          {/* Modifier Groups */}
          {item.modifierGroups.map(group => (
            <div key={group.id}>
              <div className="flex items-center gap-2 mb-2">
                <p className="text-xs font-semibold text-zinc-300 uppercase tracking-wide">{group.name}</p>
                {group.isRequired && (
                  <span className="text-xs bg-orange-500/15 text-orange-400 px-1.5 py-0.5 rounded">Required</span>
                )}
              </div>
              <div className="space-y-1">
                {group.modifiers.filter(m => m.isAvailable).map(mod => {
                  const chosen = (selectedMods[group.id] ?? []).includes(mod.id)
                  return (
                    <button
                      key={mod.id}
                      onClick={() => toggleMod(group.id, mod.id, group.maxSelect)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-colors ${
                        chosen
                          ? 'bg-orange-500/15 border border-orange-500/30 text-orange-300'
                          : 'bg-zinc-800 border border-zinc-700 text-zinc-300'
                      }`}
                    >
                      <span>{mod.name}</span>
                      {mod.priceAdjustment !== 0 && (
                        <span className="text-xs text-zinc-500">
                          {mod.priceAdjustment > 0 ? '+' : ''}{fmt(currency, mod.priceAdjustment)}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}

          {/* Special instructions */}
          <div>
            <p className="text-xs font-semibold text-zinc-300 uppercase tracking-wide mb-2">Special Instructions</p>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Allergies, preferences…"
              rows={2}
              className="w-full bg-zinc-800 border border-zinc-700 text-zinc-100 placeholder-zinc-600 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-orange-500 resize-none"
            />
          </div>
        </div>

        {/* Footer: qty + add */}
        <div className="p-5 pt-3 border-t border-zinc-800 flex items-center gap-3">
          <div className="flex items-center gap-3 bg-zinc-800 rounded-xl px-3 py-2">
            <button onClick={() => setQty(q => Math.max(1, q - 1))} className="text-zinc-400 hover:text-zinc-200">
              <Minus className="w-4 h-4" />
            </button>
            <span className="text-sm font-semibold text-zinc-100 w-4 text-center">{qty}</span>
            <button onClick={() => setQty(q => q + 1)} className="text-zinc-400 hover:text-zinc-200">
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={handleAdd}
            className="flex-1 bg-orange-500 hover:bg-orange-400 text-white text-sm font-semibold rounded-xl py-2.5 transition-colors"
          >
            Add · {fmt(currency, (item.resolvedPrice) * qty)}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Cart Drawer ──────────────────────────────────────────────────────────────

function CartDrawer({
  cart,
  currency,
  onClose,
  onRemove,
  onChangeQty,
  onPlaceOrder,
  placing,
}: {
  cart: CartItem[]
  currency: string
  onClose: () => void
  onRemove: (idx: number) => void
  onChangeQty: (idx: number, qty: number) => void
  onPlaceOrder: () => void
  placing: boolean
}) {
  const total = cartTotal(cart)

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70">
      <div className="w-full sm:max-w-md bg-zinc-900 rounded-t-3xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-5 pb-3 border-b border-zinc-800">
          <h3 className="text-sm font-bold text-zinc-100">Your Order</h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-3 space-y-3">
          {cart.map((item, idx) => (
            <div key={idx} className="flex items-start gap-3">
              <div className="flex items-center gap-2 bg-zinc-800 rounded-lg px-2 py-1.5 shrink-0">
                <button onClick={() => onChangeQty(idx, item.quantity - 1)} className="text-zinc-400 hover:text-zinc-200">
                  <Minus className="w-3 h-3" />
                </button>
                <span className="text-xs font-bold text-zinc-100 w-4 text-center">{item.quantity}</span>
                <button onClick={() => onChangeQty(idx, item.quantity + 1)} className="text-zinc-400 hover:text-zinc-200">
                  <Plus className="w-3 h-3" />
                </button>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-200 truncate">{item.name}</p>
                {item.modifierLabels.length > 0 && (
                  <p className="text-xs text-zinc-500 truncate">{item.modifierLabels.join(', ')}</p>
                )}
                {item.specialInstructions && (
                  <p className="text-xs text-zinc-600 truncate italic">{item.specialInstructions}</p>
                )}
              </div>
              <div className="shrink-0 flex flex-col items-end gap-1">
                <span className="text-sm font-medium text-zinc-300">
                  {fmt(currency, item.resolvedPrice * item.quantity)}
                </span>
                <button onClick={() => onRemove(idx)} className="text-zinc-600 hover:text-red-400">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="p-5 border-t border-zinc-800 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-400">Total</span>
            <span className="font-bold text-zinc-100">{fmt(currency, total)}</span>
          </div>
          <button
            onClick={onPlaceOrder}
            disabled={placing || cart.length === 0}
            className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white font-semibold text-sm rounded-xl py-3 transition-colors"
          >
            {placing && <Loader2 className="w-4 h-4 animate-spin" />}
            {placing ? 'Placing order…' : 'Place Order'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function TablePage() {
  const { tableId } = Route.useParams()
  const tableIdNum = Number(tableId)

  const [view, setView] = useState<ViewState>('welcome')
  const [guestName, setGuestName] = useState('')
  const [sessionId, setSessionId] = useState<number | null>(null)
  const [activeCategory, setActiveCategory] = useState<number | null>(null)
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null)
  const [cart, setCart] = useState<CartItem[]>([])
  const [cartOpen, setCartOpen] = useState(false)
  const [orderError, setOrderError] = useState<string | null>(null)
  const [lastOrderNumber, setLastOrderNumber] = useState<number | null>(null)
  const categoryRefs = useRef<Record<number, HTMLDivElement | null>>({})

  // ── Queries ──────────────────────────────────────────────────────────────

  const tableQuery = useQuery({
    queryKey: ['menu', 'table', tableIdNum],
    queryFn: async () => {
      const res = await client.api.v1.customer.table[':tableId'].$get({
        param: { tableId: tableId },
      })
      if (!res.ok) throw new Error('Table not found')
      const json = await res.json()
      return json.data as TableInfo
    },
  })

  const menuQuery = useQuery({
    queryKey: ['menu', 'categories', tableIdNum],
    queryFn: () => api.menu.get(tableQuery.data!.branchId, tableIdNum),
    enabled: view === 'menu' && !!tableQuery.data,
  })

  const categories = menuQuery.data ?? []
  const tableInfo = tableQuery.data
  const currency = tableInfo?.currency ?? 'BDT'

  // ── Session mutation ──────────────────────────────────────────────────────

  const startSession = useMutation({
    mutationFn: (): Promise<Session> =>
      api.session.start(tableIdNum, guestName || undefined),
    onSuccess: (data) => {
      setSessionId(data.id)
      setView('menu')
      if (categories.length > 0) setActiveCategory(categories[0].id)
    },
  })

  // ── Order mutation ────────────────────────────────────────────────────────

  const placeOrder = useMutation({
    mutationFn: async () => {
      if (!sessionId) throw new Error('No active session')
      setOrderError(null)
      return api.orders.place({
        sessionId,
        items: cart.map(i => ({
          menuItemId: i.menuItemId,
          quantity: i.quantity,
          modifiers: i.modifiers,
          specialInstructions: i.specialInstructions,
        })),
      })
    },
    onSuccess: (data) => {
      setLastOrderNumber(data.order.orderNumber)
      setCart([])
      setCartOpen(false)
      setView('placed')
    },
    onError: (err) => {
      setOrderError(err instanceof Error ? err.message : 'Order failed')
      setCartOpen(false)
    },
  })

  // ── Cart helpers ──────────────────────────────────────────────────────────

  function addToCart(item: CartItem) {
    setCart(prev => {
      const existing = prev.findIndex(
        c => c.menuItemId === item.menuItemId &&
          JSON.stringify(c.modifiers) === JSON.stringify(item.modifiers)
      )
      if (existing >= 0) {
        const next = [...prev]
        next[existing] = { ...next[existing], quantity: next[existing].quantity + item.quantity }
        return next
      }
      return [...prev, item]
    })
  }

  function removeFromCart(idx: number) {
    setCart(prev => prev.filter((_, i) => i !== idx))
  }

  function changeQty(idx: number, qty: number) {
    if (qty <= 0) { removeFromCart(idx); return }
    setCart(prev => prev.map((item, i) => i === idx ? { ...item, quantity: qty } : item))
  }

  function scrollToCategory(catId: number) {
    setActiveCategory(catId)
    categoryRefs.current[catId]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const cartCount = cart.reduce((n, i) => n + i.quantity, 0)

  // ── Loading / Error states ────────────────────────────────────────────────

  if (tableQuery.isLoading) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
      </div>
    )
  }

  if (tableQuery.isError || !tableInfo) {
    return (
      <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center gap-3 px-6 text-center">
        <AlertCircle className="w-8 h-8 text-red-400" />
        <p className="text-zinc-300 font-medium">Table not found</p>
        <p className="text-zinc-600 text-sm">Please scan the QR code again.</p>
      </div>
    )
  }

  // ── Welcome screen ────────────────────────────────────────────────────────

  if (view === 'welcome') {
    return (
      <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm space-y-8">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-2xl bg-orange-500 flex items-center justify-center mx-auto mb-4">
              <UtensilsCrossed className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-zinc-100">{tableInfo.orgName}</h1>
            <p className="text-zinc-500 text-sm">{tableInfo.branchName}</p>
            <div className="inline-flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-full px-4 py-1.5 text-sm text-zinc-300">
              Table {tableInfo.tableNumber}
              <span className="text-zinc-600">·</span>
              <span className="text-zinc-500">{tableInfo.tableClassName}</span>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400">Your name (optional)</label>
              <input
                type="text"
                value={guestName}
                onChange={e => setGuestName(e.target.value)}
                placeholder="e.g. Ahmed"
                className="w-full bg-zinc-800 border border-zinc-700 text-zinc-100 placeholder-zinc-600 rounded-xl px-4 py-3 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/50 transition-colors"
              />
            </div>
            <button
              onClick={() => startSession.mutate()}
              disabled={startSession.isPending}
              className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white font-semibold rounded-xl py-3 transition-colors"
            >
              {startSession.isPending
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Starting…</>
                : 'View Menu'}
            </button>
            {startSession.isError && (
              <p className="text-xs text-red-400 text-center">{(startSession.error as Error).message}</p>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── Order placed confirmation ─────────────────────────────────────────────

  if (view === 'placed') {
    return (
      <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center px-6 text-center gap-5">
        <div className="w-16 h-16 rounded-full bg-green-500/15 flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-green-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-zinc-100">Order Placed!</h2>
          {lastOrderNumber !== null && (
            <p className="text-zinc-500 text-sm mt-1">Order #{lastOrderNumber}</p>
          )}
          <p className="text-zinc-600 text-sm mt-2">Your order is being prepared.</p>
        </div>
        <button
          onClick={() => setView('menu')}
          className="flex items-center gap-2 text-orange-400 hover:text-orange-300 text-sm font-medium transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to menu
        </button>
      </div>
    )
  }

  // ── Menu screen ───────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#09090b] flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-zinc-950/95 backdrop-blur border-b border-zinc-800">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-zinc-100">{tableInfo.orgName}</p>
            <p className="text-xs text-zinc-500">Table {tableInfo.tableNumber} · {tableInfo.branchName}</p>
          </div>
          <button
            onClick={() => setCartOpen(true)}
            className="relative flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 rounded-xl px-3 py-2 transition-colors"
          >
            <ShoppingCart className="w-4 h-4 text-zinc-300" />
            {cartCount > 0 && (
              <span className="text-xs font-bold text-zinc-100">{cartCount}</span>
            )}
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-orange-500" />
            )}
          </button>
        </div>

        {/* Category tabs */}
        {categories.length > 0 && (
          <div className="overflow-x-auto scrollbar-none">
            <div className="flex gap-1 px-4 pb-3 w-max">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => scrollToCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                    activeCategory === cat.id
                      ? 'bg-orange-500 text-white'
                      : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* Menu content */}
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-4 pb-28 space-y-8">
        {orderError && (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-xl">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {orderError}
          </div>
        )}

        {menuQuery.isLoading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-5 h-5 text-orange-500 animate-spin" />
          </div>
        )}

        {menuQuery.isError && (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-red-400">
            <AlertCircle className="w-6 h-6" />
            <p className="text-sm">Failed to load menu</p>
          </div>
        )}

        {categories.map(cat => (
          <div
            key={cat.id}
            ref={el => { categoryRefs.current[cat.id] = el }}
          >
            <h2 className="text-base font-bold text-zinc-100 mb-1">{cat.name}</h2>
            {cat.description && (
              <p className="text-xs text-zinc-600 mb-3">{cat.description}</p>
            )}
            <div className="space-y-2">
              {cat.items.map(item => (
                <button
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className="w-full flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-2xl p-3 text-left hover:border-zinc-700 transition-colors active:scale-[0.99]"
                >
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-16 h-16 rounded-xl object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-zinc-800 flex items-center justify-center shrink-0">
                      <UtensilsCrossed className="w-6 h-6 text-zinc-600" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-zinc-100 truncate">{item.name}</p>
                    {item.description && (
                      <p className="text-xs text-zinc-500 line-clamp-2 mt-0.5">{item.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-sm font-bold text-orange-400">
                        {fmt(currency, item.resolvedPrice)}
                      </span>
                      {item.prepTimeMin > 0 && (
                        <span className="text-xs text-zinc-600">{item.prepTimeMin}min</span>
                      )}
                      {item.dietaryTags.map(tag => (
                        <span key={tag} className="text-xs bg-zinc-800 text-zinc-500 px-1.5 py-0.5 rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="w-7 h-7 rounded-full bg-orange-500 flex items-center justify-center shrink-0">
                    <Plus className="w-4 h-4 text-white" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </main>

      {/* Sticky cart bar */}
      {cartCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-20 p-4 bg-gradient-to-t from-[#09090b] via-[#09090b]/90 to-transparent">
          <div className="max-w-lg mx-auto">
            <button
              onClick={() => setCartOpen(true)}
              className="w-full flex items-center justify-between bg-orange-500 hover:bg-orange-400 text-white rounded-2xl px-4 py-3.5 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="bg-orange-400 rounded-lg px-2 py-0.5 text-xs font-bold">{cartCount}</span>
                <span className="text-sm font-semibold">View Order</span>
              </div>
              <span className="text-sm font-bold">{fmt(currency, cartTotal(cart))}</span>
            </button>
          </div>
        </div>
      )}

      {/* Orders history link (when session active but no cart) */}
      {cartCount === 0 && sessionId && (
        <div className="fixed bottom-4 right-4 z-20">
          <button
            className="w-12 h-12 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-zinc-200 shadow-lg transition-colors"
            title="My orders"
          >
            <ClipboardList className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Item detail modal */}
      {selectedItem && (
        <ItemModal
          item={selectedItem}
          currency={currency}
          onClose={() => setSelectedItem(null)}
          onAdd={item => { addToCart(item); setSelectedItem(null) }}
        />
      )}

      {/* Cart drawer */}
      {cartOpen && (
        <CartDrawer
          cart={cart}
          currency={currency}
          onClose={() => setCartOpen(false)}
          onRemove={removeFromCart}
          onChangeQty={changeQty}
          onPlaceOrder={() => placeOrder.mutate()}
          placing={placeOrder.isPending}
        />
      )}
    </div>
  )
}
