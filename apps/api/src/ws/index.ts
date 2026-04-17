import { WebSocketServer, WebSocket } from 'ws'
import type { IncomingMessage } from 'http'
import type { Server } from 'http'
import { resolveSession } from '../middleware/auth.js'
import type { WsEvent } from '@dineflow/shared'

// Channel subscriptions: channelName → Set<WebSocket>
const channels = new Map<string, Set<WebSocket>>()

// Client metadata
const clientMeta = new Map<WebSocket, { userId: number; channels: Set<string> }>()

export function setupWebSocket(server: Server): WebSocketServer {
  const wss = new WebSocketServer({ server, path: '/ws' })

  wss.on('connection', async (ws: WebSocket, req: IncomingMessage) => {
    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`)
    const token = url.searchParams.get('token')
    const channelParam = url.searchParams.get('channel')

    if (!token || !channelParam) {
      ws.close(4001, 'Missing token or channel')
      return
    }

    const user = await resolveSession(token)
    if (!user) {
      ws.close(4003, 'Invalid session')
      return
    }

    const subscribedChannels = new Set<string>()
    clientMeta.set(ws, { userId: user.id, channels: subscribedChannels })

    // Subscribe to requested channels
    const requestedChannels = channelParam.split(',').filter(Boolean)
    for (const channel of requestedChannels) {
      subscribe(ws, channel)
      subscribedChannels.add(channel)
    }

    ws.send(JSON.stringify({ type: 'connected', payload: { userId: user.id } }))

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString()) as { type: string; channel?: string }
        if (msg.type === 'subscribe' && msg.channel) {
          subscribe(ws, msg.channel)
          subscribedChannels.add(msg.channel)
        } else if (msg.type === 'unsubscribe' && msg.channel) {
          unsubscribe(ws, msg.channel)
          subscribedChannels.delete(msg.channel)
        } else if (msg.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong' }))
        }
      } catch {
        // ignore malformed messages
      }
    })

    ws.on('close', () => {
      const meta = clientMeta.get(ws)
      if (meta) {
        for (const channel of meta.channels) {
          unsubscribe(ws, channel)
        }
        clientMeta.delete(ws)
      }
    })

    ws.on('error', () => {
      ws.terminate()
    })
  })

  return wss
}

function subscribe(ws: WebSocket, channel: string): void {
  if (!channels.has(channel)) {
    channels.set(channel, new Set())
  }
  channels.get(channel)!.add(ws)
}

function unsubscribe(ws: WebSocket, channel: string): void {
  channels.get(channel)?.delete(ws)
  if (channels.get(channel)?.size === 0) {
    channels.delete(channel)
  }
}

export function broadcast(channel: string, event: WsEvent): void {
  const subscribers = channels.get(channel)
  if (!subscribers) return

  const payload = JSON.stringify(event)
  for (const ws of subscribers) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(payload)
    }
  }
}

export function broadcastToMultiple(channelNames: string[], event: WsEvent): void {
  for (const channel of channelNames) {
    broadcast(channel, event)
  }
}
