import { Redis as UpstashRedis } from '@upstash/redis'
import { createClient, type RedisClientType } from 'redis'

export interface RedisClient {
  get(key: string): Promise<string | null>
  set(
    key: string,
    value: string,
    options?: { ex?: number; px?: number; nx?: boolean; xx?: boolean }
  ): Promise<string | null>
  del(...keys: string[]): Promise<number>
  expire(key: string, seconds: number): Promise<boolean>
  ttl(key: string): Promise<number>
  mget(keys: string[]): Promise<(string | null)[]>
  keys(pattern: string): Promise<string[]>
  exists(...keys: string[]): Promise<number>
  incr(key: string): Promise<number>
  decr(key: string): Promise<number>
  flushdb(): Promise<string>

  // Sorted set commands for event system
  zadd(key: string, score: number, member: string): Promise<number>
  zrangebyscore(
    key: string,
    min: number | string,
    max: number | string,
    options?: { offset: number; count: number }
  ): Promise<string[]>
  zcard(key: string): Promise<number>
  zremrangebyrank(key: string, start: number, stop: number): Promise<number>
}

class UpstashRedisAdapter implements RedisClient {
  private client: UpstashRedis

  constructor(url: string, token: string) {
    this.client = new UpstashRedis({ url, token })
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key) as Promise<string | null>
  }

  async set(
    key: string,
    value: string,
    options?: { ex?: number; px?: number; nx?: boolean; xx?: boolean }
  ): Promise<string | null> {
    const opts: Record<string, unknown> = {}
    if (options?.ex !== undefined) opts.ex = options.ex
    if (options?.px !== undefined) opts.px = options.px
    if (options?.nx) opts.nx = true
    if (options?.xx) opts.xx = true
    return this.client.set(key, value, Object.keys(opts).length > 0 ? (opts as any) : undefined)
  }

  async del(...keys: string[]): Promise<number> {
    if (keys.length === 0) return 0
    return this.client.del(...keys)
  }

  async expire(key: string, seconds: number): Promise<boolean> {
    const res = await this.client.expire(key, seconds)
    return res !== 0
  }

  async ttl(key: string): Promise<number> {
    return this.client.ttl(key)
  }

  async mget(keys: string[]): Promise<(string | null)[]> {
    if (keys.length === 0) return []
    return this.client.mget(...keys)
  }

  async keys(pattern: string): Promise<string[]> {
    return this.client.keys(pattern)
  }

  async exists(...keys: string[]): Promise<number> {
    if (keys.length === 0) return 0
    return this.client.exists(...keys)
  }

  async incr(key: string): Promise<number> {
    return this.client.incr(key)
  }

  async decr(key: string): Promise<number> {
    return this.client.decr(key)
  }

  async flushdb(): Promise<string> {
    return this.client.flushdb()
  }

  async zadd(key: string, score: number, member: string): Promise<number> {
    const res = await this.client.zadd(key, { score, member })
    return res ?? 0
  }

  async zrangebyscore(
    key: string,
    min: number | string,
    max: number | string,
    options?: { offset: number; count: number }
  ): Promise<string[]> {
    const opts: any = { byScore: true }
    if (options) {
      opts.offset = options.offset
      opts.count = options.count
    }
    return this.client.zrange(key, min as any, max as any, opts) as Promise<string[]>
  }

  async zcard(key: string): Promise<number> {
    return this.client.zcard(key)
  }

  async zremrangebyrank(key: string, start: number, stop: number): Promise<number> {
    return this.client.zremrangebyrank(key, start, stop)
  }
}

class NodeRedisAdapter implements RedisClient {
  private client: RedisClientType
  private connected: Promise<void>

  constructor(url: string) {
    this.client = createClient({ url })
    this.connected = this.client.connect().then(() => undefined)
    this.client.on('error', (err) => console.error('[Redis] Client error:', err))
  }

  private async ensureConnected(): Promise<void> {
    return this.connected
  }

  async get(key: string): Promise<string | null> {
    await this.ensureConnected()
    return this.client.get(key)
  }

  async set(
    key: string,
    value: string,
    options?: { ex?: number; px?: number; nx?: boolean; xx?: boolean }
  ): Promise<string | null> {
    await this.ensureConnected()
    const opts: Record<string, number | boolean> = {}
    if (options?.ex !== undefined) opts.EX = options.ex
    if (options?.px !== undefined) opts.PX = options.px
    if (options?.nx) opts.NX = true
    if (options?.xx) opts.XX = true
    return this.client.set(key, value, opts)
  }

  async del(...keys: string[]): Promise<number> {
    await this.ensureConnected()
    if (keys.length === 0) return 0
    return this.client.del(keys)
  }

  async expire(key: string, seconds: number): Promise<boolean> {
    await this.ensureConnected()
    const res = await this.client.expire(key, seconds)
    return res !== 0
  }

  async ttl(key: string): Promise<number> {
    await this.ensureConnected()
    return this.client.ttl(key)
  }

  async mget(keys: string[]): Promise<(string | null)[]> {
    await this.ensureConnected()
    if (keys.length === 0) return []
    return this.client.mGet(keys)
  }

  async keys(pattern: string): Promise<string[]> {
    await this.ensureConnected()
    return this.client.keys(pattern)
  }

  async exists(...keys: string[]): Promise<number> {
    await this.ensureConnected()
    if (keys.length === 0) return 0
    return this.client.exists(keys)
  }

  async incr(key: string): Promise<number> {
    await this.ensureConnected()
    return this.client.incr(key)
  }

  async decr(key: string): Promise<number> {
    await this.ensureConnected()
    return this.client.decr(key)
  }

  async flushdb(): Promise<string> {
    await this.ensureConnected()
    return this.client.flushDb()
  }

  async zadd(key: string, score: number, member: string): Promise<number> {
    await this.ensureConnected()
    return this.client.zAdd(key, { score, value: member })
  }

  async zrangebyscore(
    key: string,
    min: number | string,
    max: number | string,
    options?: { offset: number; count: number }
  ): Promise<string[]> {
    await this.ensureConnected()
    const opts: any = { BY: 'SCORE' }
    if (options) {
      opts.LIMIT = { offset: options.offset, count: options.count }
    }
    return this.client.zRange(key, min as any, max as any, opts)
  }

  async zcard(key: string): Promise<number> {
    await this.ensureConnected()
    return this.client.zCard(key)
  }

  async zremrangebyrank(key: string, start: number, stop: number): Promise<number> {
    await this.ensureConnected()
    return this.client.zRemRangeByRank(key, start, stop)
  }
}

export type RedisEnv = {
  NODE_ENV?: string
  REDIS_URL?: string
  UPSTASH_REDIS_REST_URL?: string
  UPSTASH_REDIS_REST_TOKEN?: string
}

export function createRedis(env: RedisEnv): RedisClient {
  const isProd = env.NODE_ENV === 'production'

  if (isProd) {
    if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) {
      throw new Error(
        'UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required in production'
      )
    }
    return new UpstashRedisAdapter(env.UPSTASH_REDIS_REST_URL, env.UPSTASH_REDIS_REST_TOKEN)
  }

  if (!env.REDIS_URL) {
    throw new Error('REDIS_URL is required in development')
  }
  return new NodeRedisAdapter(env.REDIS_URL)
}

let _redis: RedisClient | null = null

export function initRedis(env: RedisEnv) {
  if (!_redis) {
    _redis = createRedis(env)
  }
}

export const redis: RedisClient = new Proxy({} as RedisClient, {
  get(_, prop) {
    if (!_redis) throw new Error('Redis not initialized — call initRedis(env) first')
    return (_redis as any)[prop]
  },
})
