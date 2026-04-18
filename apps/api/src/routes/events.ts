import { Hono } from 'hono'
import { waitForEvent } from '../ws/index.js'

const POLL_TIMEOUT_MS = 25_000

export const eventsRoutes = new Hono().get('/', async (c) => {
  const channel = c.req.query('channel')
  if (!channel) return c.json({ error: 'Missing channel parameter' }, 400)

  const after = parseInt(c.req.query('after') ?? '0', 10)

  const ac = new AbortController()
  const timer = setTimeout(() => ac.abort(), POLL_TIMEOUT_MS)
  c.req.raw.signal?.addEventListener('abort', () => ac.abort(), { once: true })

  const entry = await waitForEvent(channel, after, ac.signal)
  clearTimeout(timer)

  return c.json({ data: entry ?? null })
})
