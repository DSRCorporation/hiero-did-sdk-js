interface ICache {
  get<CacheValue>(key: string): Promise<CacheValue | null>
  set<CacheValue>(key: string, value: CacheValue, expiresInSeconds?: number): Promise<void>
  remove(key: string): Promise<void>

  cleanup(): Promise<void>
  cleanupExpired(): Promise<void>
}

export class FakeCache implements ICache {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async get<CacheValue>(key: string): Promise<CacheValue | null> {
    return new Promise(() => null)
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  set<CacheValue>(key: string, value: CacheValue, expiresInSeconds?: number): Promise<void> {
    throw new Error('Method not implemented.')
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  remove(key: string): Promise<void> {
    throw new Error('Method not implemented.')
  }

  cleanup(): Promise<void> {
    throw new Error('Method not implemented.')
  }

  cleanupExpired(): Promise<void> {
    throw new Error('Method not implemented.')
  }
}
