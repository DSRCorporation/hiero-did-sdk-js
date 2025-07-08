import { type Client, PrivateKey } from '@hashgraph/sdk';
import { Crypto } from '@hiero-did-sdk/crypto';
import { Zstd } from '@hiero-did-sdk/zstd';
import { HcsCacheService } from '../cache';
import { HcsMessageService } from './hcs-message-service';
import { HcsTopicService } from './hcs-topic-service';
import { CacheConfig } from '../hedera-hcs-service.configuration';
import { Cache } from '@hiero-did-sdk/core';
import { waitChangesVisibility } from '../shared';

const HCS_FILE_TOPIC_MEMO_REGEX = /^[A-Fa-f0-9]{64}:zstd:base64$/;

const BASE64_JSON_CONTENT_PREFIX = 'data:application/json;base64,';

// 1024 bytes is a max size for HCS transaction (non-chunked) + we're reserving some space for JSON structural characters - 64 bytes
const MAX_CHUNK_CONTENT_SIZE_IN_BYTES = 960;

export interface HcsFileChunkMessage {
  orderIndex: number;
  content: string;
}

export interface SubmitFileProps {
  payload: Buffer;
  submitKey?: PrivateKey;
  waitChangesVisibility?: boolean;
  waitChangesVisibilityTimeout?: number;
}

export interface ResolveFileProps {
  topicId: string;
}

export interface ChunkMessage {
  o: number;
  c: string;
}

export class HcsFileService {
  private readonly cacheService?: HcsCacheService;

  constructor(
    private readonly client: Client,
    cache?: CacheConfig | Cache | HcsCacheService
  ) {
    this.cacheService = cache ? (cache instanceof HcsCacheService ? cache : new HcsCacheService(cache)) : undefined;
  }

  /**
   * Submit and store file in HCS-1 file
   * @param props
   */
  public async submitFile(props: SubmitFileProps): Promise<string> {
    const hcsMessagesService = new HcsMessageService(this.client, this.cacheService);

    const payloadHash = await Crypto.sha256(props.payload);
    const topicId = await new HcsTopicService(this.client, this.cacheService).createTopic({
      topicMemo: this.createHCS1Memo(payloadHash),
      submitKey: props.submitKey,
    });

    const chunks = this.buildChunkMessagesFromFile(props.payload);
    for (const chunk of chunks) {
      const message = JSON.stringify({ o: chunk.orderIndex, c: chunk.content });
      await hcsMessagesService.submitMessage({
        topicId,
        message,
        submitKey: props.submitKey,
        waitChangesVisibility: false,
      });
    }

    if (props?.waitChangesVisibility) {
      await waitChangesVisibility<Buffer>({
        fetchFn: () => this.resolveFileWithoutCache({ topicId }),
        checkFn: (file: Buffer) => file.equals(props.payload),
        waitTimeout: props?.waitChangesVisibilityTimeout,
      });
    }

    return topicId;
  }

  /**
   * Resolve file from HCS-1 format
   * @param props
   */
  public async resolveFile(props: ResolveFileProps): Promise<Buffer> {
    const cachedFile = await this.cacheService?.getTopicFile(this.client, props.topicId);
    if (cachedFile) return cachedFile;

    const payload = await this.resolveFileWithoutCache(props);

    await this.cacheService?.setTopicFile(this.client, props.topicId, payload);

    return payload;
  }

  /**
   * Resolve file from HCS-1 format without cahce using
   * @param props
   */
  private async resolveFileWithoutCache(props: ResolveFileProps): Promise<Buffer> {
    const hcsTopicService = new HcsTopicService(this.client, this.cacheService);

    const topicInfo = await hcsTopicService.getTopicInfo(props);

    if (!this.isHCS1MemoPresent(topicInfo.topicMemo)) {
      throw new Error(`HCS file Topic ${props.topicId} is invalid - must contain memo compliant with HCS-1 standard`);
    }

    if (topicInfo.adminKey) {
      throw new Error(`HCS file topic ${props.topicId} contains adminKey`);
    }

    const hcsMessagesService = new HcsMessageService(this.client, this.cacheService);

    const messages = await hcsMessagesService.getTopicMessages({ topicId: props.topicId });
    const chunkMessages = messages.map((message) => JSON.parse(message.contents.toString()) as ChunkMessage);
    const payload = this.buildFileFromChunkMessages(chunkMessages);

    if (!this.isHCS1ChecksumValid(topicInfo.topicMemo, await Crypto.sha256(payload))) {
      throw new Error('Resolved HCS file payload is invalid');
    }

    return payload;
  }

  /**
   * Build file from HCS-1 chunks
   * @param chunkMessages
   * @private
   */
  private buildFileFromChunkMessages(chunkMessages: ChunkMessage[]): Buffer {
    let messageContent = '';
    try {
      for (const chunkMessage of chunkMessages.sort((a, b) => a.o - b.o)) {
        messageContent += chunkMessage.c;
      }
      const compressedPayload = Buffer.from(messageContent.replace(BASE64_JSON_CONTENT_PREFIX, ''), 'base64');
      return Buffer.from(Zstd.decompress(compressedPayload));
      return Buffer.from(Zstd.decompress(compressedPayload));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Error on building HCS-1 file payload from chunk messages: ${errorMessage}`);
    }
  }

  /**
   * Create file HCS-1 chunks
   * @param payload
   * @private
   */
  private buildChunkMessagesFromFile(payload: Buffer): HcsFileChunkMessage[] {
    try {
      const compressedPayload = Zstd.compress(payload);
      const compressedPayloadBase64 = Buffer.from(compressedPayload).toString('base64');
      const messageContent = `${BASE64_JSON_CONTENT_PREFIX}${compressedPayloadBase64}`;
      const encoded = new TextEncoder().encode(messageContent);
      const chunks: HcsFileChunkMessage[] = [];
      let orderIndex = 0;
      for (let i = 0; i < encoded.length; i += MAX_CHUNK_CONTENT_SIZE_IN_BYTES) {
        const chunk = encoded.slice(i, i + MAX_CHUNK_CONTENT_SIZE_IN_BYTES);
        chunks.push({
          orderIndex: orderIndex++,
          content: new TextDecoder().decode(chunk),
        });
      }
      return chunks;
    } catch (error) {
      throw new Error(`Error on getting chunk messages for HCS-1 file: ${error}`);
    }
  }

  /**
   * Create HCS-1 memo by required format
   * @private
   * @param hash
   */
  private createHCS1Memo(hash: string): string {
    return `${hash}:zstd:base64`;
  }

  /**
   * Check HCS-1 memo format
   * @param memo
   * @private
   */
  private isHCS1MemoPresent(memo: string): boolean {
    return !!memo && HCS_FILE_TOPIC_MEMO_REGEX.test(memo);
  }

  /**
   * Check HCS-1 checksum
   * @param memo
   * @param checksum
   * @private
   */
  private isHCS1ChecksumValid(memo: string, checksum: string): boolean {
    if (!memo) throw new Error('Memo is required');

    const [expectedPayloadHash, ,] = memo.split(':');
    return checksum === expectedPayloadHash;
  }
}
