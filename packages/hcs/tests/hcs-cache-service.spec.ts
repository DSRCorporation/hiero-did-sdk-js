import { HcsCacheService } from '../src/cache/hcs-cache-service';
import { Cache } from '@hiero-did-sdk/core';
import { TopicInfo, TopicMessageData } from '../src/hcs';
import { LRUMemoryCache } from '@hiero-did-sdk/cache';

// Mock LRUMemoryCache to avoid actual instantiation during tests
jest.mock('@hiero-did-sdk/cache', () => ({
  LRUMemoryCache: jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    set: jest.fn(),
    remove: jest.fn(),
    cleanup: jest.fn(),
    cleanupExpired: jest.fn(),
  })),
}));

describe('HcsCacheService', () => {
  const mockCache: Cache = {
    get: jest.fn(),
    set: jest.fn(),
    remove: jest.fn(),
    cleanup: jest.fn(),
    cleanupExpired: jest.fn(),
  };

  const mockClient = { ledgerId: 'test-ledger' } as any;

  let service: HcsCacheService;

  beforeEach(() => {
    service = new HcsCacheService(mockCache);
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should use provided Cache instance when Cache is passed', () => {
      const service = new HcsCacheService(mockCache);
      expect(LRUMemoryCache).not.toHaveBeenCalled();

      // Test the cache works correctly
      service.getTopicInfo(mockClient, 'topic123');
      expect(mockCache.get).toHaveBeenCalled();
    });

    it('should initialize LRUMemoryCache when CacheConfig is passed', () => {
      const cacheConfig = { maxSize: 1000 };
      const service = new HcsCacheService(cacheConfig);

      expect(LRUMemoryCache).toHaveBeenCalledWith(cacheConfig.maxSize);
    });
  });

  describe('getTopicInfo', () => {
    it('should retrieve topic info from the cache using a constructed key', async () => {
      const mockTopicInfo: TopicInfo = { topicId: 'topic123', topicMemo: 'Test Memo' };
      (mockCache.get as jest.Mock).mockResolvedValueOnce(mockTopicInfo);

      const result = await service.getTopicInfo(mockClient, 'topic123');

      expect(mockCache.get).toHaveBeenCalledWith('test-ledger-info-topic123');
      expect(result).toEqual(mockTopicInfo);
    });
  });

  describe('setTopicInfo', () => {
    it('should store topic info in the cache with a constructed key', async () => {
      const mockTopicInfo: TopicInfo = { topicId: 'topic123', topicMemo: 'Test Memo' };

      await service.setTopicInfo(mockClient, 'topic123', mockTopicInfo);

      expect(mockCache.set).toHaveBeenCalledWith('test-ledger-info-topic123', mockTopicInfo, undefined);
    });
  });

  describe('removeTopicInfo', () => {
    it('should remove topic info, messages, and file from the cache', async () => {
      await service.removeTopicInfo(mockClient, 'topic123');

      expect(mockCache.remove).toHaveBeenCalledWith('test-ledger-info-topic123');
      expect(mockCache.remove).toHaveBeenCalledWith('test-ledger-messages-topic123');
      expect(mockCache.remove).toHaveBeenCalledWith('test-ledger-file-topic123');
    });
  });

  describe('getTopicMessages', () => {
    it('should retrieve topic messages from the cache using a constructed key', async () => {
      const mockMessages: TopicMessageData[] = [
        { consensusTime: new Date(), contents: new Uint8Array([1, 2, 3]) },
      ];
      (mockCache.get as jest.Mock).mockResolvedValueOnce(mockMessages);

      const result = await service.getTopicMessages(mockClient, 'topic123');

      expect(mockCache.get).toHaveBeenCalledWith('test-ledger-messages-topic123');
      expect(result).toEqual(mockMessages);
    });
  });

  describe('setTopicMessages', () => {
    it('should store topic messages in the cache and remove the topic file', async () => {
      const mockMessages: TopicMessageData[] = [
        { consensusTime: new Date(), contents: new Uint8Array([1, 2, 3]) },
      ];

      await service.setTopicMessages(mockClient, 'topic123', mockMessages);

      expect(mockCache.set).toHaveBeenCalledWith('test-ledger-messages-topic123', mockMessages, undefined);
      expect(mockCache.remove).toHaveBeenCalledWith('test-ledger-file-topic123');
    });
  });

  describe('removeTopicMessages', () => {
    it('should remove topic messages and the topic file from the cache', async () => {
      await service.removeTopicMessages(mockClient, 'topic123');

      expect(mockCache.remove).toHaveBeenCalledWith('test-ledger-messages-topic123');
      expect(mockCache.remove).toHaveBeenCalledWith('test-ledger-file-topic123');
    });
  });

  describe('getTopicFile', () => {
    it('should retrieve topic file from the cache using a constructed key', async () => {
      const mockFile = Buffer.from('test-file');
      (mockCache.get as jest.Mock).mockResolvedValueOnce(mockFile);

      const result = await service.getTopicFile(mockClient, 'topic123');

      expect(mockCache.get).toHaveBeenCalledWith('test-ledger-file-topic123');
      expect(result).toEqual(mockFile);
    });
  });

  describe('setTopicFile', () => {
    it('should store topic file in the cache with a constructed key', async () => {
      const mockFile = Buffer.from('test-file');

      await service.setTopicFile(mockClient, 'topic123', mockFile);

      expect(mockCache.set).toHaveBeenCalledWith('test-ledger-file-topic123', mockFile, undefined);
    });
  });

  describe('removeTopicFile', () => {
    it('should remove topic file from the cache using a constructed key', async () => {
      await service.removeTopicFile(mockClient, 'topic123');

      expect(mockCache.remove).toHaveBeenCalledWith('test-ledger-file-topic123');
    });
  });
});
