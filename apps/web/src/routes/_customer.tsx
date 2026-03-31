import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/_customer')({
  component: CustomerLayout,
})

function CustomerLayout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Outlet />
    </div>
  )
}
