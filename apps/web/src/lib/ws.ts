import type { WsEvent } from '@dineflow/shared'
import { WS_URL } from './api.js'

type EventHandler = (event: WsEvent) => void

export class DineFlowWS {
  private ws: WebSocket | null = null
  private token: string
  private channels: string[]
  private handlers: EventHandler[] = []
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private reconnectDelay = 1000
  private shouldReconnect = true

  constructor(token: string, channels: string[]) {
    this.token = token
    this.channels = channels
    this.connect()
  }

  private connect() {
    const url = `${WS_URL}?token=${encodeURIComponent(this.token)}&channel=${this.channels.join(',')}`
    this.ws = new WebSocket(url)

    this.ws.onopen = () => {
      this.reconnectDelay = 1000
    }

    this.ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data as string) as WsEvent | { type: string }
        if ('type' in data && data.type !== 'connected' && data.type !== 'pong') {
          this.handlers.forEach((h) => h(data as WsEvent))
        }
      } catch {
        // ignore parse errors
      }
    }

    this.ws.onclose = () => {
      if (this.shouldReconnect) {
        this.reconnectTimer = setTimeout(() => {
          this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000)
          this.connect()
        }, this.reconnectDelay)
      }
    }

    this.ws.onerror = () => {
      this.ws?.close()
    }
  }

  on(handler: EventHandler) {
    this.handlers.push(handler)
    return () => {
      this.handlers = this.handlers.filter((h) => h !== handler)
    }
  }

  send(data: object) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data))
    }
  }

  ping() {
    this.send({ type: 'ping' })
  }

  destroy() {
    this.shouldReconnect = false
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    this.ws?.close()
  }
}
