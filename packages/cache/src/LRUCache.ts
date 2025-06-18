import { Cache } from '@hiero-did-sdk/core'

interface KeyValue<CacheValue> {
  key: string
  value: CacheValue
}

interface CacheEntry<CacheValue> {
  value: CacheValue
  expiresAt?: number
}

const DEFAULT_CACHE_SIZE = 10000

export class LRUMemoryCache implements Cache {
  private readonly _maxSize: number
  private readonly _cache: Map<string, CacheEntry<any>>

  constructor(maxSize: number = DEFAULT_CACHE_SIZE) {
    this._maxSize = maxSize
    this._cache = new Map()
  }

  async get<CacheValue>(key: string): Promise<CacheValue | null> {
    if (!this._cache.has(key)) {
      return null
    }

    const entry = this._cache.get(key)

    if (!entry || (entry.expiresAt && entry.expiresAt < Date.now())) {
      this._cache.delete(key)
      return null
    }

    this._cache.delete(key)

    this._cache.set(key, entry)

    return entry.value as CacheValue
  }

  async set<CacheValue>(key: string, value: CacheValue, expiresInSeconds?: number): Promise<void> {
    if (this._cache.has(key)) {
      this._cache.delete(key)
    } else {
      if (this._cache.size >= this._maxSize) {
        const oldestKey = this._cache.keys().next().value
        this._cache.delete(oldestKey)
      }
    }

    const entry: CacheEntry<CacheValue> = {
      value,
      expiresAt: expiresInSeconds ? Date.now() + expiresInSeconds * 1000 : undefined,
    }

    this._cache.set(key, entry)
  }

  async remove(key: string): Promise<void> {
    this._cache.delete(key)
  }

  async cleanup(): Promise<void> {
    this._cache.clear()
  }

  async cleanupExpired(): Promise<void> {
    const now = Date.now()
    for (const [key, entry] of this._cache.entries()) {
      if (entry.expiresAt && entry.expiresAt < now) {
        this._cache.delete(key)
      }
    }
  }

  async getAll<CacheValue>(): Promise<KeyValue<CacheValue>[]> {
    return [...this._cache].map(([key, entry]) => ({ key, value: entry.value }) as KeyValue<CacheValue>)
  }
}
