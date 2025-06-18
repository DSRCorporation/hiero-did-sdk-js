interface CacheEntry<CacheValue> {
  value: CacheValue
  expiresAt?: number
}

interface ICache {
  get<CacheValue>(key: string): Promise<CacheValue | null>
  set<CacheValue>(key: string, value: CacheValue, expiresInSeconds?: number): Promise<void>
  remove(key: string): Promise<void>

  cleanup(): Promise<void>
  cleanupExpired(): Promise<void>
}

export class FakeCache implements ICache {
  async get<CacheValue>(key: string): Promise<CacheValue | null> {
    return null
  }

  async set<CacheValue>(key: string, value: CacheValue, expiresInSeconds?: number): Promise<void> {}

  async remove(key: string): Promise<void> {}

  async cleanup(): Promise<void> {}

  async cleanupExpired(): Promise<void> {}
}
