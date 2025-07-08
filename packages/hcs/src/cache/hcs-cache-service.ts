import { Client } from '@hashgraph/sdk';
import { LRUMemoryCache } from '@hiero-did-sdk/cache';
import { Cache } from '@hiero-did-sdk/core';
import { TopicInfo, TopicMessageData } from '../hcs';
import { CacheConfig } from '../hedera-hcs-service.configuration';

export class HcsCacheService {
  private readonly cache?: Cache;

  constructor(cacheConfig?: CacheConfig | Cache) {
    if (cacheConfig) {
      this.cache = this.isCache(cacheConfig) ? cacheConfig : new LRUMemoryCache(cacheConfig.maxSize);
    }
  }

  public async getTopicInfo(client: Client, topicId: string): Promise<TopicInfo | null> {
    return await this.getFromCache<TopicInfo>(this.buildCacheKey(client, 'info', topicId));
  }

  public async setTopicInfo(client: Client, topicId: string, topicInfo: TopicInfo): Promise<void> {
    await this.putToCache(this.buildCacheKey(client, 'info', topicId), topicInfo);
  }

  public async removeTopicInfo(client: Client, topicId: string): Promise<void> {
    await this.removeFromCache(this.buildCacheKey(client, 'info', topicId));
    await this.removeTopicMessages(client, topicId);
    await this.removeTopicFile(client, topicId);
  }

  public async getTopicMessages(client: Client, topicId: string): Promise<TopicMessageData[] | null> {
    return await this.getFromCache<TopicMessageData[]>(this.buildCacheKey(client, 'messages', topicId));
  }

  public async setTopicMessages(client: Client, topicId: string, messages: TopicMessageData[]): Promise<void> {
    await this.putToCache(this.buildCacheKey(client, 'messages', topicId), messages);
    await this.removeTopicFile(client, topicId);
  }

  public async removeTopicMessages(client: Client, topicId: string): Promise<void> {
    await this.removeFromCache(this.buildCacheKey(client, 'messages', topicId));
    await this.removeTopicFile(client, topicId);
  }

  public async getTopicFile(client: Client, topicId: string): Promise<Buffer | null> {
    return await this.getFromCache<Buffer>(this.buildCacheKey(client, 'file', topicId));
  }

  public async setTopicFile(client: Client, topicId: string, file: Buffer): Promise<void> {
    await this.putToCache(this.buildCacheKey(client, 'file', topicId), file);
  }

  public async removeTopicFile(client: Client, topicId: string): Promise<void> {
    await this.removeFromCache(this.buildCacheKey(client, 'file', topicId));
  }

  /**
   * Check the cacheConfig is external cache or not
   * @param cache
   * @private
   */
  private isCache(cache: Cache | CacheConfig): cache is Cache {
    return 'get' in cache && typeof cache.get === 'function';
  }

  /**
   * Check the cacheConfig is external cache or not
   * @private
   * @param client
   * @param target
   * @param topicId
   */
  private buildCacheKey(client: Client, target: 'info' | 'messages' | 'file', topicId: string): string {
    const ledgerId = client.ledgerId?.toString() ?? '';
    return `${ledgerId}-${target}-${topicId}`;
  }

  /**
   * Get data from cache
   * @param key - The cache key
   * @return The saved value
   */
  private async getFromCache<T>(key: string): Promise<T | null> {
    if (!this.cache) return null;
    return await this.cache.get<T>(key);
  }

  /**
   * Put data to cache
   * @param key - The cache key
   * @param value - The value for save
   * @param expiresInSeconds - The cached value lifetime
   */
  private async putToCache<T>(key: string, value: T, expiresInSeconds?: number): Promise<void> {
    if (!this.cache) return;
    await this.cache.set<T>(key, value, expiresInSeconds);
  }

  /**
   * Remove data from cache
   * @param key - The cache key
   */
  private async removeFromCache(key: string): Promise<void> {
    if (!this.cache) return;
    await this.cache.remove(key);
  }
}
