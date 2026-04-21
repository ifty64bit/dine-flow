import { redis } from '../lib/redis.js'
import type { WsEvent } from '@dineflow/shared'

export interface EventEntry {
  ts: number
  event: WsEvent
}

const MAX_QUEUE = 50
const EVENT_TTL = 60 // seconds
const POLL_INTERVAL_MS = 500

function channelKey(channel: string): string {
  return `events:${channel}`
}

export async function broadcast(channel: string, event: WsEvent): Promise<void> {
  const entry: EventEntry = { ts: Date.now(), event }

  // Store in Redis sorted set (score = timestamp for time-ordered retrieval)
  await redis.zadd(channelKey(channel), entry.ts, JSON.stringify(entry))
  await redis.expire(channelKey(channel), EVENT_TTL)

  // Trim to MAX_QUEUE to keep memory bounded
  const count = await redis.zcard(channelKey(channel))
  if (count > MAX_QUEUE) {
    await redis.zremrangebyrank(channelKey(channel), 0, count - MAX_QUEUE - 1)
  }
}

export async function broadcastToMultiple(channels: string[], event: WsEvent): Promise<void> {
  for (const ch of channels) {
    await broadcast(ch, event)
  }
}

/**
 * Wait for the next event on `channel` published after `after` (ms timestamp).
 * Resolves immediately if a queued event is newer than `after`.
 * Resolves null when the AbortSignal fires (timeout or client disconnect).
 */
export async function waitForEvent(
  channel: string,
  after: number,
  signal: AbortSignal
): Promise<EventEntry | null> {
  const key = channelKey(channel)

  // Return immediately if we already have a newer event in Redis
  const entries = await redis.zrangebyscore(key, after + 1, '+inf', {
    offset: 0,
    count: 1,
  })

  if (entries.length > 0) {
    return JSON.parse(entries[0]) as EventEntry
  }

  // No recent event → poll Redis until one arrives or signal aborts
  return new Promise((resolve) => {
    let resolved = false
    let timeoutId: ReturnType<typeof setTimeout>

    const cleanup = () => {
      resolved = true
      clearTimeout(timeoutId)
    }

    const onAbort = () => {
      cleanup()
      resolve(null)
    }

    signal.addEventListener('abort', onAbort, { once: true })

    const poll = async () => {
      if (resolved || signal.aborted) return

      const entries = await redis.zrangebyscore(key, after + 1, '+inf', {
        offset: 0,
        count: 1,
      })

      if (entries.length > 0) {
        cleanup()
        signal.removeEventListener('abort', onAbort)
        resolve(JSON.parse(entries[0]) as EventEntry)
        return
      }

      timeoutId = setTimeout(poll, POLL_INTERVAL_MS)
    }

    poll()
  })
}
