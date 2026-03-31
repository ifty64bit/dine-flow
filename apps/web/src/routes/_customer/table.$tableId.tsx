import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { useCart } from '../../store/cart'

export const Route = createFileRoute('/_customer/table/$tableId')({
  component: TableLandingPage,
})

function TableLandingPage() {
  const { tableId } = Route.useParams()
  const navigate = useNavigate()
  const { dispatch } = useCart()

  const startSession = useMutation({
    mutationFn: () =>
      api.post<{ data: { id: string } }>('/api/v1/customer/session/start', { tableId }),
    onSuccess: (res) => {
      const sessionId = res.data.id
      // Store branchId — we'll get it from the session's table.floor.branchId
      // For now store what we have and fetch details on menu page
      dispatch({
        type: 'SET_SESSION',
        sessionId,
        branchId: 'main', // will be resolved from session details
        tableId,
      })
      navigate({ to: '/menu', search: { sessionId, tableId } })
    },
  })

  useEffect(() => {
    startSession.mutate()
  }, [tableId])

  return (
    <div className="min-h-screen flex items-center justify-center">
      {startSession.isPending && (
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Setting up your table…</p>
        </div>
      )}
      {startSession.isError && (
        <div className="text-center p-8">
          <p className="text-red-600 mb-4">Could not connect to your table.</p>
          <button
            onClick={() => startSession.mutate()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  )
}
