/// <reference types="@cloudflare/workers-types" />

export default {
  async fetch(request: Request, env: { ASSETS: Fetcher }) {
    const url = new URL(request.url)
    const response = await env.ASSETS.fetch(request)

    // SPA fallback: serve index.html for non-file routes that 404
    if (response.status === 404 && !url.pathname.includes('.')) {
      return env.ASSETS.fetch(new URL('/index.html', request.url))
    }

    return response
  },
} satisfies ExportedHandler<{ ASSETS: Fetcher }>
