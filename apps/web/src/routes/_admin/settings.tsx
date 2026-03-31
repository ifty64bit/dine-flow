import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'

export const Route = createFileRoute('/_admin/settings')({
  component: SettingsPage,
})

function SettingsPage() {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    restaurantName: '',
    currency: 'BDT',
    timezone: 'Asia/Dhaka',
    taxRate: '0',
    serviceChargeRate: '0',
    taxInclusive: true,
    logoUrl: '',
  })
  const [saved, setSaved] = useState(false)

  const settingsQ = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get<{ data: Record<string, unknown> }>('/api/v1/admin/settings'),
  })

  useEffect(() => {
    if (settingsQ.data?.data) {
      const d = settingsQ.data.data
      setForm({
        restaurantName: (d.restaurantName as string) ?? '',
        currency: (d.currency as string) ?? 'BDT',
        timezone: (d.timezone as string) ?? 'Asia/Dhaka',
        taxRate: (d.taxRate as string) ?? '0',
        serviceChargeRate: (d.serviceChargeRate as string) ?? '0',
        taxInclusive: (d.taxInclusive as boolean) ?? true,
        logoUrl: (d.logoUrl as string) ?? '',
      })
    }
  }, [settingsQ.data])

  const save = useMutation({
    mutationFn: () => api.put('/api/v1/admin/settings', {
      ...form,
      logoUrl: form.logoUrl || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings'] })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    },
  })

  const f = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((s) => ({ ...s, [key]: e.target.value }))

  const TIMEZONES = [
    'Asia/Dhaka', 'Asia/Kolkata', 'Asia/Dubai', 'Asia/Singapore',
    'Europe/London', 'Europe/Paris', 'America/New_York', 'America/Los_Angeles',
    'UTC',
  ]

  return (
    <div className="p-6 max-w-xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Restaurant name</label>
          <input
            value={form.restaurantName}
            onChange={f('restaurantName')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Logo URL</label>
          <input
            type="url"
            value={form.logoUrl}
            onChange={f('logoUrl')}
            placeholder="https://…"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
            <input
              value={form.currency}
              onChange={f('currency')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
            <select
              value={form.timezone}
              onChange={f('timezone')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tax rate (%)</label>
            <input
              type="number"
              step="0.01"
              value={form.taxRate}
              onChange={f('taxRate')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Service charge (%)</label>
            <input
              type="number"
              step="0.01"
              value={form.serviceChargeRate}
              onChange={f('serviceChargeRate')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <input
            id="taxInclusive"
            type="checkbox"
            checked={form.taxInclusive}
            onChange={(e) => setForm((s) => ({ ...s, taxInclusive: e.target.checked }))}
            className="w-4 h-4"
          />
          <label htmlFor="taxInclusive" className="text-sm text-gray-700">
            Tax inclusive pricing (prices already include tax)
          </label>
        </div>

        {saved && (
          <div className="px-3 py-2 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
            Settings saved successfully.
          </div>
        )}

        <button
          onClick={() => save.mutate()}
          disabled={save.isPending}
          className="w-full py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {save.isPending ? 'Saving…' : 'Save settings'}
        </button>
      </div>
    </div>
  )
}
