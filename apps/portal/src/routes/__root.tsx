import React, { Suspense } from 'react'
import { Outlet, createRootRouteWithContext } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import type { QueryClient } from '@tanstack/react-query'

interface RouterContext {
  queryClient: QueryClient
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError(error: Error) {
    return { error }
  }
  render() {
    if (this.state.error) {
      return (
        <div className="flex h-screen items-center justify-center bg-[#09090b]">
          <div className="text-center space-y-3">
            <p className="text-red-400 font-semibold">Something went wrong</p>
            <p className="text-zinc-500 text-sm">{this.state.error.message}</p>
            <button
              onClick={() => window.location.reload()}
              className="text-sm px-4 py-2 bg-zinc-800 text-zinc-200 rounded-lg hover:bg-zinc-700 transition-colors"
            >
              Reload
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: () => (
    <ErrorBoundary>
      <Suspense
        fallback={
          <div className="flex h-screen items-center justify-center bg-[#09090b]">
            <div className="w-6 h-6 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
          </div>
        }
      >
        <Outlet />
      </Suspense>
      {import.meta.env.DEV && <TanStackRouterDevtools />}
    </ErrorBoundary>
  ),
})
