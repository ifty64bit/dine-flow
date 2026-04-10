import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import * as v from 'valibot'
import { Plus, Pencil, X, Check, AlertCircle, CreditCard } from 'lucide-react'
import { client } from '#/lib/client'

export const Route = createFileRoute('/_auth/plans')({
  component: PlansPage,
})

const PlanSchema = v.object({
  name:               v.pipe(v.string(), v.minLength(1, 'Required')),
  slug:               v.pipe(v.string(), v.regex(/^[a-z0-9-]+$/, 'Lowercase letters, numbers, hyphens only')),
  monthlyPrice:       v.pipe(v.string(), v.regex(/^\d+(\.\d{1,2})?$/, 'Invalid price')),
  maxBranches:        v.pipe(v.number(), v.minValue(1)),
  maxUsersPerBranch:  v.pipe(v.number(), v.minValue(1)),
  maxTablesPerBranch: v.pipe(v.number(), v.minValue(1)),
  features:           v.string(),
  sortOrder:          v.number(),
})

type PlanForm = {
  name: string
  slug: string
  monthlyPrice: string
  maxBranches: string
  maxUsersPerBranch: string
  maxTablesPerBranch: string
  features: string
  sortOrder: string
}

const EMPTY_FORM: PlanForm = {
  name: '', slug: '', monthlyPrice: '0',
  maxBranches: '1', maxUsersPerBranch: '5', maxTablesPerBranch: '20',
  features: '', sortOrder: '0',
}

function formToJson(form: PlanForm) {
  return {
    name:               form.name,
    slug:               form.slug,
    monthlyPrice:       form.monthlyPrice,
    maxBranches:        Number(form.maxBranches),
    maxUsersPerBranch:  Number(form.maxUsersPerBranch),
    maxTablesPerBranch: Number(form.maxTablesPerBranch),
    features:           form.features.split(',').map((f) => f.trim()).filter(Boolean),
    sortOrder:          Number(form.sortOrder),
    isActive:           true,
  }
}

function PlanModal({
  initial,
  onClose,
  onSave,
  saving,
}: {
  initial?: PlanForm
  onClose: () => void
  onSave: (data: PlanForm) => void
  saving: boolean
}) {
  const [form, setForm] = useState<PlanForm>(initial ?? EMPTY_FORM)
  const [errors, setErrors] = useState<Record<string, string>>({})

  function set(key: keyof PlanForm, val: string) {
    setForm((f) => ({ ...f, [key]: val }))
    setErrors((e) => ({ ...e, [key]: '' }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const result = v.safeParse(PlanSchema, {
      name:               form.name,
      slug:               form.slug,
      monthlyPrice:       form.monthlyPrice,
      maxBranches:        Number(form.maxBranches),
      maxUsersPerBranch:  Number(form.maxUsersPerBranch),
      maxTablesPerBranch: Number(form.maxTablesPerBranch),
      features:           form.features,
      sortOrder:          Number(form.sortOrder),
    })
    if (!result.success) {
      const errs: Record<string, string> = {}
      result.issues.forEach((i) => {
        const key = String(i.path?.[0]?.key ?? '')
        if (key) errs[key] = i.message
      })
      setErrors(errs)
      return
    }
    onSave(form)
  }

  function Field({
    label, name, type = 'text', placeholder,
  }: { label: string; name: keyof PlanForm; type?: string; placeholder?: string }) {
    return (
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">{label}</label>
        <input
          type={type}
          value={form[name]}
          onChange={(e) => set(name, e.target.value)}
          placeholder={placeholder}
          className="w-full bg-zinc-800 border border-zinc-700 text-zinc-100 placeholder-zinc-600 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-colors"
        />
        {errors[name] && <p className="text-xs text-red-400">{errors[name]}</p>}
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-200">
            {initial ? 'Edit Plan' : 'New Plan'}
          </h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Name" name="name" placeholder="Pro" />
            <Field label="Slug" name="slug" placeholder="pro" />
          </div>
          <Field label="Monthly Price (৳)" name="monthlyPrice" placeholder="999" />
          <div className="grid grid-cols-3 gap-4">
            <Field label="Max Branches"      name="maxBranches"        type="number" />
            <Field label="Max Users/Branch"  name="maxUsersPerBranch"  type="number" />
            <Field label="Max Tables/Branch" name="maxTablesPerBranch" type="number" />
          </div>
          <Field label="Sort Order" name="sortOrder" type="number" />
          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-400">
              Features <span className="text-zinc-600">(comma-separated)</span>
            </label>
            <textarea
              value={form.features}
              onChange={(e) => set('features', e.target.value)}
              placeholder="kds, reservations, analytics"
              rows={2}
              className="w-full bg-zinc-800 border border-zinc-700 text-zinc-100 placeholder-zinc-600 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-colors resize-none"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg border border-zinc-700 text-zinc-400 hover:text-zinc-200 text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium transition-colors"
            >
              {saving
                ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <Check className="w-4 h-4" />
              }
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function PlansPage() {
  const qc = useQueryClient()
  const [creating, setCreating] = useState(false)
  const [editing,  setEditing]  = useState<{ id: number; form: PlanForm } | null>(null)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['overlord', 'plans'],
    queryFn:  async () => {
      const res = await client.api.overlord.plans.$get()
      if (!res.ok) throw new Error('Failed to load plans')
      return res.json()
    },
  })

  const createPlan = useMutation({
    mutationFn: async (form: PlanForm) => {
      const res = await client.api.overlord.plans.$post({ json: formToJson(form) })
      if (!res.ok) throw new Error('Failed to create plan')
      return res.json()
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['overlord', 'plans'] }); setCreating(false) },
  })

  const updatePlan = useMutation({
    mutationFn: async ({ id, form }: { id: number; form: PlanForm }) => {
      const res = await client.api.overlord.plans[':id'].$put({
        param: { id: String(id) },
        json:  formToJson(form),
      })
      if (!res.ok) throw new Error('Failed to update plan')
      return res.json()
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['overlord', 'plans'] }); setEditing(null) },
  })

  const togglePlan = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      const res = await client.api.overlord.plans[':id'].status.$patch({
        param: { id: String(id) },
        json:  { isActive },
      })
      if (!res.ok) throw new Error('Failed to update status')
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['overlord', 'plans'] }),
  })

  const plans = data?.data ?? []

  return (
    <div className="p-6 space-y-5 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">Subscription Plans</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{plans.length} plans</p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Plan
        </button>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <div className="w-5 h-5 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
        </div>
      )}

      {isError && (
        <div className="flex items-center justify-center gap-2 py-16 text-red-400">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm">Failed to load plans</span>
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`bg-zinc-900 border rounded-xl p-5 space-y-4 ${
              plan.isActive ? 'border-zinc-800' : 'border-zinc-800/40 opacity-60'
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-indigo-400" />
                  <h3 className="text-sm font-semibold text-zinc-200">{plan.name}</h3>
                </div>
                <p className="text-xs text-zinc-600 mt-0.5">/{plan.slug}</p>
              </div>
              <p className="text-lg font-bold text-zinc-100">
                ৳{plan.monthlyPrice}
                <span className="text-xs font-normal text-zinc-600">/mo</span>
              </p>
            </div>

            <div className="space-y-1.5 text-xs text-zinc-500">
              <p>Branches: <span className="text-zinc-300">{plan.maxBranches}</span></p>
              <p>Users/branch: <span className="text-zinc-300">{plan.maxUsersPerBranch}</span></p>
              <p>Tables/branch: <span className="text-zinc-300">{plan.maxTablesPerBranch}</span></p>
              <p>Subscribers: <span className="text-zinc-300">{plan.subscriberCount}</span></p>
            </div>

            {(plan.features as string[]).length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {(plan.features as string[]).map((f) => (
                  <span key={f} className="text-xs px-2 py-0.5 bg-zinc-800 text-zinc-400 rounded-full">
                    {f}
                  </span>
                ))}
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setEditing({
                  id:   plan.id,
                  form: {
                    name:               plan.name,
                    slug:               plan.slug,
                    monthlyPrice:       plan.monthlyPrice,
                    maxBranches:        String(plan.maxBranches),
                    maxUsersPerBranch:  String(plan.maxUsersPerBranch),
                    maxTablesPerBranch: String(plan.maxTablesPerBranch),
                    features:           (plan.features as string[]).join(', '),
                    sortOrder:          String(plan.sortOrder),
                  },
                })}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 transition-colors"
              >
                <Pencil className="w-3 h-3" /> Edit
              </button>
              <button
                onClick={() => togglePlan.mutate({ id: plan.id, isActive: !plan.isActive })}
                disabled={togglePlan.isPending}
                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-50 ${
                  plan.isActive
                    ? 'border-red-500/30 text-red-400 hover:bg-red-500/10'
                    : 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10'
                }`}
              >
                {plan.isActive ? 'Disable' : 'Enable'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {creating && (
        <PlanModal
          onClose={() => setCreating(false)}
          onSave={(form) => createPlan.mutate(form)}
          saving={createPlan.isPending}
        />
      )}

      {editing && (
        <PlanModal
          initial={editing.form}
          onClose={() => setEditing(null)}
          onSave={(form) => updatePlan.mutate({ id: editing.id, form })}
          saving={updatePlan.isPending}
        />
      )}
    </div>
  )
}
