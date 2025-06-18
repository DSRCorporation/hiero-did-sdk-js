export interface Cache {
  get<CacheValue>(key: string): Promise<CacheValue | null>
  set<CacheValue>(key: string, value: CacheValue, expiresInSeconds?: number): Promise<void>
  remove(key: string): Promise<void>
  cleanup(): Promise<void>
  cleanupExpired(): Promise<void>
}
