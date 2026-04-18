import type { WsEvent } from '@dineflow/shared'

export interface EventEntry {
  ts: number
  event: WsEvent
}

const MAX_QUEUE = 50

// Queued events per channel (ring buffer of last MAX_QUEUE events)
const eventQueues = new Map<string, EventEntry[]>()

// Pending long-poll resolvers waiting on a channel
const pendingPolls = new Map<string, Set<(entry: EventEntry) => void>>()

export function broadcast(channel: string, event: WsEvent): void {
  const entry: EventEntry = { ts: Date.now(), event }

  if (!eventQueues.has(channel)) eventQueues.set(channel, [])
  const queue = eventQueues.get(channel)!
  queue.push(entry)
  if (queue.length > MAX_QUEUE) queue.shift()

  const pending = pendingPolls.get(channel)
  if (pending) {
    for (const resolve of pending) resolve(entry)
    pending.clear()
  }
}

export function broadcastToMultiple(channels: string[], event: WsEvent): void {
  for (const ch of channels) broadcast(ch, event)
}

/**
 * Wait for the next event on `channel` published after `after` (ms timestamp).
 * Resolves immediately if a queued event is newer than `after`.
 * Resolves null when the AbortSignal fires (timeout or client disconnect).
 */
export function waitForEvent(
  channel: string,
  after: number,
  signal: AbortSignal
): Promise<EventEntry | null> {
  return new Promise((resolve) => {
    // Return immediately if we already have a newer event buffered
    const queue = eventQueues.get(channel)
    if (queue) {
      const buffered = queue.find((e) => e.ts > after)
      if (buffered) { resolve(buffered); return }
    }

    if (!pendingPolls.has(channel)) pendingPolls.set(channel, new Set())
    const pending = pendingPolls.get(channel)!

    const onEvent = (entry: EventEntry) => {
      signal.removeEventListener('abort', onAbort)
      pending.delete(onEvent)
      resolve(entry)
    }

    const onAbort = () => {
      pending.delete(onEvent)
      resolve(null)
    }

    pending.add(onEvent)
    signal.addEventListener('abort', onAbort, { once: true })
  })
}
