import { createFileRoute } from '@tanstack/react-router'
import { UtensilsCrossed } from 'lucide-react'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#09090b] px-6 text-center gap-4">
      <div className="w-14 h-14 rounded-2xl bg-orange-500 flex items-center justify-center">
        <UtensilsCrossed className="w-7 h-7 text-white" />
      </div>
      <h1 className="text-2xl font-bold text-zinc-100">DineFlow</h1>
      <p className="text-zinc-500 text-sm max-w-xs">
        Scan the QR code on your table to view the menu and place your order.
      </p>
    </div>
  )
}
