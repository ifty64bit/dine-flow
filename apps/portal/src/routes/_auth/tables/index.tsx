import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Table2,
  AlertCircle,
  Plus,
  Pencil,
  Trash2,
  X,
  Loader2,
  QrCode,
  Download,
  Tag,
} from 'lucide-react'
import { useState } from 'react'
import { client } from '@/lib/client'
import { useAuthStore } from '@/store/auth'

export const Route = createFileRoute('/_auth/tables/')({
  component: TablesPage,
})

// ─── Types ────────────────────────────────────────────────────────────────────

interface Branch {
  id: number
  name: string
}

interface TableClass {
  id: number
  name: string
  slug: string
  priceMultiplier: string
  badgeColor: string
  isActive: boolean
}

interface Table {
  id: number
  branchId: number
  tableClassId: number
  number: number
  floorName: string | null
  capacity: number
  shape: 'round' | 'square' | 'rectangle'
  status: 'vacant' | 'occupied' | 'reserved' | 'cleaning' | 'merged'
  qrCodeUrl: string | null
  tableClass: TableClass
  branch: Branch
}

type Tab = 'tables' | 'classes'
type ModalState =
  | { type: 'add-table' }
  | { type: 'edit-table'; table: Table }
  | { type: 'add-class' }
  | { type: 'edit-class'; cls: TableClass }
  | { type: 'qr'; table: Table }
  | null

// ─── Helpers ──────────────────────────────────────────────────────────────────

function inputClass(extra = '') {
  return `w-full bg-zinc-800 border border-zinc-700 text-zinc-100 placeholder-zinc-600 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/50 transition-colors ${extra}`
}

function labelClass() {
  return 'block text-xs font-medium text-zinc-400 mb-1'
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  vacant:   { bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
  occupied: { bg: 'bg-orange-500/10',  text: 'text-orange-400' },
  reserved: { bg: 'bg-sky-500/10',     text: 'text-sky-400' },
  cleaning: { bg: 'bg-yellow-500/10',  text: 'text-yellow-400' },
  merged:   { bg: 'bg-zinc-500/10',    text: 'text-zinc-400' },
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-100">{title}</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

// ─── Table Form ───────────────────────────────────────────────────────────────

function TableForm({
  initial,
  branches,
  classes,
  onSubmit,
  loading,
}: {
  initial?: Partial<Table>
  branches: Branch[]
  classes: TableClass[]
  onSubmit: (data: {
    branchId: number
    tableClassId: number
    number: number
    capacity: number
    shape: 'round' | 'square' | 'rectangle'
    floorName?: string
  }) => void
  loading: boolean
}) {
  const [branchId, setBranchId] = useState(initial?.branchId ?? branches[0]?.id ?? 0)
  const [tableClassId, setTableClassId] = useState(initial?.tableClassId ?? classes[0]?.id ?? 0)
  const [number, setNumber] = useState(initial?.number ?? 1)
  const [capacity, setCapacity] = useState(initial?.capacity ?? 4)
  const [shape, setShape] = useState<'round' | 'square' | 'rectangle'>(initial?.shape ?? 'square')
  const [floorName, setFloorName] = useState(initial?.floorName ?? '')

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit({ branchId, tableClassId, number, capacity, shape, floorName: floorName || undefined })
      }}
      className="space-y-4"
    >
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass()}>Table Number *</label>
          <input type="number" className={inputClass()} value={number} onChange={(e) => setNumber(Number(e.target.value))} min={1} required />
        </div>
        <div>
          <label className={labelClass()}>Capacity *</label>
          <input type="number" className={inputClass()} value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} min={1} required />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass()}>Branch *</label>
          <select className={inputClass()} value={branchId} onChange={(e) => setBranchId(Number(e.target.value))} required>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass()}>Table Class *</label>
          <select className={inputClass()} value={tableClassId} onChange={(e) => setTableClassId(Number(e.target.value))} required>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass()}>Shape</label>
          <select className={inputClass()} value={shape} onChange={(e) => setShape(e.target.value as 'round' | 'square' | 'rectangle')}>
            <option value="square">Square</option>
            <option value="round">Round</option>
            <option value="rectangle">Rectangle</option>
          </select>
        </div>
        <div>
          <label className={labelClass()}>Floor</label>
          <input className={inputClass()} value={floorName} onChange={(e) => setFloorName(e.target.value)} placeholder="e.g. Ground" />
        </div>
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white text-sm font-medium rounded-lg py-2.5 transition-colors"
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        {initial?.id ? 'Save changes' : 'Add table'}
      </button>
    </form>
  )
}

// ─── Table Class Form ─────────────────────────────────────────────────────────

function TableClassForm({
  initial,
  onSubmit,
  loading,
}: {
  initial?: Partial<TableClass>
  onSubmit: (data: { name: string; slug: string; priceMultiplier: string; badgeColor: string }) => void
  loading: boolean
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [slug, setSlug] = useState(initial?.slug ?? '')
  const [priceMultiplier, setPriceMultiplier] = useState(initial?.priceMultiplier ?? '1.00')
  const [badgeColor, setBadgeColor] = useState(initial?.badgeColor ?? '#6B7280')

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit({ name, slug, priceMultiplier, badgeColor })
      }}
      className="space-y-4"
    >
      <div>
        <label className={labelClass()}>Name *</label>
        <input className={inputClass()} value={name} onChange={(e) => setName(e.target.value)} placeholder="VIP" required />
      </div>
      <div>
        <label className={labelClass()}>Slug *</label>
        <input className={inputClass()} value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="vip" required pattern="^[a-z0-9-]+$" />
        <p className="text-[11px] text-zinc-600 mt-1">Lowercase letters, numbers, and hyphens only</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass()}>Price Multiplier</label>
          <input className={inputClass()} value={priceMultiplier} onChange={(e) => setPriceMultiplier(e.target.value)} placeholder="1.00" pattern="^\d+(\.\d{1,2})?$" />
        </div>
        <div>
          <label className={labelClass()}>Badge Color</label>
          <div className="flex items-center gap-2">
            <input type="color" value={badgeColor} onChange={(e) => setBadgeColor(e.target.value)} className="w-10 h-9 rounded bg-zinc-800 border border-zinc-700 cursor-pointer" />
            <input className={inputClass()} value={badgeColor} onChange={(e) => setBadgeColor(e.target.value)} placeholder="#6B7280" pattern="^#[0-9A-Fa-f]{6}$" />
          </div>
        </div>
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white text-sm font-medium rounded-lg py-2.5 transition-colors"
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        {initial?.id ? 'Save changes' : 'Add class'}
      </button>
    </form>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function TablesPage() {
  const qc = useQueryClient()
  const [tab, setTab] = useState<Tab>('tables')
  const [modal, setModal] = useState<ModalState>(null)

  const invalidate = () => qc.invalidateQueries({ queryKey: ['portal', 'tables'] })

  // ── Queries ────────────────────────────────────────────────────────────────

  const tableQuery = useQuery({
    queryKey: ['portal', 'tables', 'list'],
    queryFn: async () => {
      const res = await client.api.v1.admin.tables.$get()
      if (!res.ok) throw new Error('Failed to load tables')
      return res.json()
    },
  })

  const classQuery = useQuery({
    queryKey: ['portal', 'tables', 'classes'],
    queryFn: async () => {
      const res = await client.api.v1.admin.tables.classes.$get()
      if (!res.ok) throw new Error('Failed to load table classes')
      return res.json()
    },
    enabled: tab === 'classes',
  })

  const branchQuery = useQuery({
    queryKey: ['portal', 'branches'],
    queryFn: async () => {
      const res = await client.api.v1.admin.branches.$get()
      if (!res.ok) throw new Error('Failed to load branches')
      return res.json()
    },
  })

  const tables: Table[] = (tableQuery.data?.data ?? []) as Table[]
  const classes: TableClass[] = (classQuery.data?.data ?? []) as TableClass[]
  const branches: Branch[] = (branchQuery.data?.data ?? []) as Branch[]

  // ── Mutations: Tables ──────────────────────────────────────────────────────

  const addTable = useMutation({
    mutationFn: async (body: Parameters<typeof client.api.v1.admin.tables.$post>[0]['json']) => {
      const res = await client.api.v1.admin.tables.$post({ json: body })
      if (!res.ok) throw new Error('Failed to create table')
      return res.json()
    },
    onSuccess: () => { invalidate(); setModal(null) },
  })

  const editTable = useMutation({
    mutationFn: async ({ id, body }: { id: number; body: Parameters<typeof client.api.v1.admin.tables.$post>[0]['json'] }) => {
      const res = await client.api.v1.admin.tables[':id'].$put({ param: { id: String(id) }, json: body })
      if (!res.ok) throw new Error('Failed to update table')
      return res.json()
    },
    onSuccess: () => { invalidate(); setModal(null) },
  })

  const deleteTable = useMutation({
    mutationFn: async (id: number) => {
      const res = await client.api.v1.admin.tables[':id'].$delete({ param: { id: String(id) } })
      if (!res.ok) throw new Error('Failed to delete table')
    },
    onSuccess: () => invalidate(),
  })

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await client.api.v1.admin.tables[':id'].status.$put({
        param: { id: String(id) },
        json: { status: status as 'vacant' | 'occupied' | 'reserved' | 'cleaning' | 'merged' },
      })
      if (!res.ok) throw new Error('Failed to update status')
    },
    onSuccess: () => invalidate(),
  })

  const generateQr = useMutation({
    mutationFn: async (tableId: number) => {
      const baseUrl = `${window.location.protocol}//${window.location.host}`.replace(':5000', ':5001')
      const res = await fetch(
        `${import.meta.env.VITE_API_URL ?? 'https://dineflow-api.ifty64bit.workers.dev/'}/api/v1/admin/qr/generate/${tableId}?baseUrl=${encodeURIComponent(baseUrl)}`,
        { method: 'POST', headers: { Authorization: `Bearer ${useAuthStore.getState().token ?? ''}` } }
      )
      if (!res.ok) throw new Error('Failed to generate QR')
      return res.json() as Promise<{ data: { qrImageUrl: string; qrUrl: string } }>
    },
    onSuccess: () => invalidate(),
  })

  // ── Mutations: Classes ─────────────────────────────────────────────────────

  const addClass = useMutation({
    mutationFn: async (body: Parameters<typeof client.api.v1.admin.tables.classes.$post>[0]['json']) => {
      const res = await client.api.v1.admin.tables.classes.$post({ json: body })
      if (!res.ok) throw new Error('Failed to create class')
    },
    onSuccess: () => { invalidate(); setModal(null) },
  })

  const editClass = useMutation({
    mutationFn: async ({ id, body }: { id: number; body: Parameters<typeof client.api.v1.admin.tables.classes.$post>[0]['json'] }) => {
      const res = await client.api.v1.admin.tables.classes[':id'].$put({ param: { id: String(id) }, json: body })
      if (!res.ok) throw new Error('Failed to update class')
    },
    onSuccess: () => { invalidate(); setModal(null) },
  })

  const deleteClass = useMutation({
    mutationFn: async (id: number) => {
      const res = await client.api.v1.admin.tables.classes[':id'].$delete({ param: { id: String(id) } })
      if (!res.ok) throw new Error('Failed to delete class')
    },
    onSuccess: () => invalidate(),
  })

  // ── Render helpers ─────────────────────────────────────────────────────────

  const isLoading = tableQuery.isLoading || (tab === 'classes' && classQuery.isLoading) || branchQuery.isLoading
  const isError = tableQuery.isError || (tab === 'classes' && classQuery.isError) || branchQuery.isError

  return (
    <div className="p-6 space-y-5 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">Tables</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {tables.length} tables · {classes.length} classes
          </p>
        </div>
        <button
          onClick={() => setModal(tab === 'tables' ? { type: 'add-table' } : { type: 'add-class' })}
          className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-400 text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          {tab === 'tables' ? 'Add table' : 'Add class'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1 w-fit">
        {(['tables', 'classes'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${
              tab === t ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-5 h-5 text-orange-500 animate-spin" />
        </div>
      )}

      {/* Error */}
      {isError && (
        <div className="flex items-center justify-center gap-2 py-16 text-red-400">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm">Failed to load data</span>
        </div>
      )}

      {/* ── Tables Tab ── */}
      {!isLoading && !isError && tab === 'tables' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {tables.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-16 gap-2 text-zinc-600">
              <Table2 className="w-8 h-8" />
              <p className="text-sm">No tables yet — add one to get started</p>
            </div>
          )}
          {tables.map((table) => {
            const colors = STATUS_COLORS[table.status] ?? STATUS_COLORS.vacant
            return (
              <div
                key={table.id}
                className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col gap-2.5"
              >
                {/* Top row */}
                <div className="flex items-start justify-between">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colors.bg}`}>
                    <Table2 className={`w-5 h-5 ${colors.text}`} />
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setModal({ type: 'qr', table })}
                      className="p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors"
                      title="Show QR"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setModal({ type: 'edit-table', table })}
                      className="p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => { if (confirm(`Delete Table ${table.number}?`)) deleteTable.mutate(table.id) }}
                      className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Info */}
                <div>
                  <p className="text-sm font-medium text-zinc-200">Table {table.number}</p>
                  <p className="text-xs text-zinc-500">{table.capacity} seats · {table.shape}</p>
                  {table.floorName && <p className="text-xs text-zinc-600">{table.floorName}</p>}
                </div>

                {/* Class & Branch */}
                <div className="flex items-center gap-2">
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded font-medium text-white"
                    style={{ backgroundColor: table.tableClass.badgeColor }}
                  >
                    {table.tableClass.name}
                  </span>
                  <span className="text-[10px] text-zinc-600">{table.branch.name}</span>
                </div>

                {/* Status */}
                <select
                  value={table.status}
                  onChange={(e) => updateStatus.mutate({ id: table.id, status: e.target.value })}
                  className={`text-xs px-2 py-1 rounded-md border-0 outline-none cursor-pointer ${colors.bg} ${colors.text}`}
                >
                  <option value="vacant" className="bg-zinc-800 text-zinc-100">vacant</option>
                  <option value="occupied" className="bg-zinc-800 text-zinc-100">occupied</option>
                  <option value="reserved" className="bg-zinc-800 text-zinc-100">reserved</option>
                  <option value="cleaning" className="bg-zinc-800 text-zinc-100">cleaning</option>
                  <option value="merged" className="bg-zinc-800 text-zinc-100">merged</option>
                </select>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Classes Tab ── */}
      {!isLoading && !isError && tab === 'classes' && (
        <div className="space-y-2">
          {classes.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-zinc-600">
              <Tag className="w-8 h-8" />
              <p className="text-sm">No table classes yet — add one to get started</p>
            </div>
          )}
          {classes.map((cls) => (
            <div
              key={cls.id}
              className={`flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 ${!cls.isActive ? 'opacity-60' : ''}`}
            >
              <div
                className="w-4 h-4 rounded-full shrink-0"
                style={{ backgroundColor: cls.badgeColor }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-zinc-200">{cls.name}</span>
                  <span className="text-xs text-zinc-600">{cls.slug}</span>
                </div>
                <p className="text-xs text-zinc-500">
                  Multiplier {cls.priceMultiplier} · {tables.filter((t) => t.tableClassId === cls.id).length} tables
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => setModal({ type: 'edit-class', cls })}
                  className="p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => { if (confirm(`Delete "${cls.name}"?`)) deleteClass.mutate(cls.id) }}
                  className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Modals ── */}

      {modal?.type === 'add-table' && (
        <Modal title="Add Table" onClose={() => setModal(null)}>
          <TableForm
            branches={branches}
            classes={classes}
            loading={addTable.isPending}
            onSubmit={(data) => addTable.mutate(data)}
          />
          {addTable.isError && (
            <p className="text-xs text-red-400 mt-2">{(addTable.error as Error).message}</p>
          )}
        </Modal>
      )}

      {modal?.type === 'edit-table' && (
        <Modal title="Edit Table" onClose={() => setModal(null)}>
          <TableForm
            initial={modal.table}
            branches={branches}
            classes={classes}
            loading={editTable.isPending}
            onSubmit={(data) => editTable.mutate({ id: modal.table.id, body: data })}
          />
          {editTable.isError && (
            <p className="text-xs text-red-400 mt-2">{(editTable.error as Error).message}</p>
          )}
        </Modal>
      )}

      {modal?.type === 'add-class' && (
        <Modal title="Add Table Class" onClose={() => setModal(null)}>
          <TableClassForm
            loading={addClass.isPending}
            onSubmit={(data) => addClass.mutate(data)}
          />
          {addClass.isError && (
            <p className="text-xs text-red-400 mt-2">{(addClass.error as Error).message}</p>
          )}
        </Modal>
      )}

      {modal?.type === 'edit-class' && (
        <Modal title="Edit Table Class" onClose={() => setModal(null)}>
          <TableClassForm
            initial={modal.cls}
            loading={editClass.isPending}
            onSubmit={(data) => editClass.mutate({ id: modal.cls.id, body: data })}
          />
          {editClass.isError && (
            <p className="text-xs text-red-400 mt-2">{(editClass.error as Error).message}</p>
          )}
        </Modal>
      )}

      {modal?.type === 'qr' && (
        <Modal title={`Table ${modal.table.number} QR`} onClose={() => setModal(null)}>
          <div className="space-y-4">
            {modal.table.qrCodeUrl ? (
              <>
                <div className="flex justify-center">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(modal.table.qrCodeUrl)}`}
                    alt={`QR for table ${modal.table.number}`}
                    className="rounded-lg border border-zinc-800"
                  />
                </div>
                <p className="text-xs text-zinc-500 text-center break-all">{modal.table.qrCodeUrl}</p>
                <a
                  href={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(modal.table.qrCodeUrl)}`}
                  download={`table-${modal.table.number}-qr.png`}
                  className="flex items-center justify-center gap-2 w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm font-medium rounded-lg py-2.5 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download QR
                </a>
              </>
            ) : (
              <div className="text-center space-y-3 py-4">
                <p className="text-sm text-zinc-400">No QR code generated yet</p>
                <button
                  onClick={() => generateQr.mutate(modal.table.id)}
                  disabled={generateQr.isPending}
                  className="flex items-center justify-center gap-2 mx-auto bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
                >
                  {generateQr.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Generate QR
                </button>
              </div>
            )}
            {generateQr.isError && (
              <p className="text-xs text-red-400 text-center">{(generateQr.error as Error).message}</p>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}
