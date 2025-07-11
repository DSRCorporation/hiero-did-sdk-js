import {
  type Client,
  PrivateKey,
  Status,
  type SubscriptionHandle, Timestamp,
  TopicId,
  TopicMessageQuery,
  TopicMessageSubmitTransaction,
} from '@hashgraph/sdk';
import { HcsCacheService } from '../cache';
import { CacheConfig } from '../hedera-hcs-service.configuration';
import { Cache } from '@hiero-did-sdk/core';
import { getMirrorNetworkNodeUrl, isMirrorQuerySupported, waitForChangesVisibility } from '../shared';

const DEFAULT_TIMEOUT_SECONDS = 2;

export interface SubmitMessageProps {
  topicId: string;
  message: string;
  submitKey?: PrivateKey;
  waitForChangesVisibility?: boolean;
  waitForChangesVisibilityTimeoutMs?: number;
}

export interface SubmitMessageResult {
  nodeId: string;
  transactionId: string;
  transactionHash: Uint8Array;
}

export interface GetTopicMessagesProps {
  topicId: string;
  maxWaitSeconds?: number;
  toDate?: Date;
  limit?: number;
}

type ReadTopicMessagesProps = GetTopicMessagesProps & {
  fromDate?: Date;
};

export interface TopicMessageData {
  consensusTime: Date;
  contents: Uint8Array;
}

interface ApiTopicMessage {
  consensus_timestamp: string;
  topic_id: string;
  message: string;
  running_hash: string;
  sequence_number: number;
  chunk_info?: {
    initial_transaction_id: string;
    number: number;
    total: number;
  };
}

interface ApiGetTopicMessageResponse {
  messages: ApiTopicMessage[];
  links?: {
    next?: string;
  };
}

export class HcsMessageService {
  private readonly cacheService?: HcsCacheService;

  constructor(
    private readonly client: Client,
    cache?: CacheConfig | Cache | HcsCacheService
  ) {
    this.cacheService = cache ? (cache instanceof HcsCacheService ? cache : new HcsCacheService(cache)) : undefined;
  }

  /**
   * Submit message to a topic
   * @param props
   */
  public async submitMessage(props: SubmitMessageProps): Promise<SubmitMessageResult> {
    const startFrom = new Date(Date.now() - 1000);

    const transaction = new TopicMessageSubmitTransaction().setTopicId(props.topicId).setMessage(props.message);

    const frozenTransaction = transaction.freezeWith(this.client);

    if (props?.submitKey) await frozenTransaction.sign(props.submitKey);

    const response = await frozenTransaction.execute(this.client);

    const receipt = await response.getReceipt(this.client);
    if (receipt.status !== Status.Success) {
      throw new Error(`Message submit transaction failed: ${receipt.status.toString()}`);
    }

    await this.cacheService?.removeTopicMessages(this.client, props.topicId);

    if (props?.waitForChangesVisibility) {
      await waitForChangesVisibility<string[]>({
        fetchFn: () => this.getNewMessagesContent({ topicId: props.topicId, startFrom }),
        checkFn: (messages) => messages.indexOf(props.message) >= 0,
        waitTimeout: props?.waitForChangesVisibilityTimeoutMs,
      });
    }

    return {
      nodeId: response.nodeId.toString(),
      transactionId: response.transactionId.toString(),
      transactionHash: response.transactionHash,
    };
  }

  /**
   * Get topic messages by query
   * @param props
   */
  public async getTopicMessages(props: GetTopicMessagesProps): Promise<TopicMessageData[]> {
    let currentCachedMessages = (await this.cacheService?.getTopicMessages(this.client, props.topicId)) ?? [];

    const lastCachedMessage =
      currentCachedMessages.length > 0 ? currentCachedMessages[currentCachedMessages.length - 1] : undefined;

    const lastCachedMessageDate = lastCachedMessage ? lastCachedMessage.consensusTime : new Date(0);
    const borderlineDate = new Date((props.toDate ? props.toDate : new Date()).getTime() + 1); // +1ms to remove the influence of nanoseconds

    if (lastCachedMessageDate < borderlineDate) {
      const messages = await this.readTopicMessages({
        ...props,
        fromDate: lastCachedMessageDate,
        toDate: borderlineDate,
      });
      if (messages.length) {
        currentCachedMessages = this.joinMessages(currentCachedMessages, messages);
        await this.cacheService?.setTopicMessages(this.client, props.topicId, currentCachedMessages);
      }
    }

    return currentCachedMessages.filter((m) => m.consensusTime <= borderlineDate);
  }

  // todo: double-check and simplify approach
  /**
   * Join two have been read topic messages arrays
   * @param first - The first topic messages array
   * @param second - The second topic messages array
   * @returns The array with joined messages. Messages are unique and sorted by consensus date
   */
  private joinMessages(first: TopicMessageData[], second: TopicMessageData[]): TopicMessageData[] {
    const messagesMap = new Map<string, TopicMessageData>();

    const toKey = (msg: TopicMessageData) => `${msg.consensusTime.getTime()}`;

    for (const msg of first) {
      messagesMap.set(toKey(msg), msg);
    }

    for (const msg of second) {
      messagesMap.set(toKey(msg), msg);
    }

    const mergedArray = Array.from(messagesMap.values());
    mergedArray.sort((a, b) => a.consensusTime.getTime() - b.consensusTime.getTime());

    return mergedArray;
  }

  /**
   * Get messages from Date
   * @param options
   * @private
   */
  private async getNewMessagesContent(options: { topicId: string; startFrom: Date }): Promise<string[]> {
    const { topicId, startFrom } = options;
    const messages = await this.readTopicMessages({
      topicId,
      fromDate: startFrom,
    });
    return messages.map((m) => Buffer.from(m.contents).toString('utf-8'));
  }

  /**
   * Read topic messages
   * @param props
   */
  private async readTopicMessages(props: ReadTopicMessagesProps): Promise<TopicMessageData[]> {
    return isMirrorQuerySupported(this.client) ? await this.readTopicMessagesByClient(props) : await this.readTopicMessagesByRest(props)
  }

  /**
   * Read messages from Hedera ledger by GprsClient
   * @param props
   * @private
   */
  private async readTopicMessagesByClient(props: ReadTopicMessagesProps): Promise<TopicMessageData[]> {
    const { maxWaitSeconds = DEFAULT_TIMEOUT_SECONDS, fromDate, toDate, limit } = props ?? {};
    let subscription: SubscriptionHandle;
    const results: TopicMessageData[] = [];

    return new Promise((resolve, reject) => {
      const query = new TopicMessageQuery()
        .setTopicId(TopicId.fromString(props.topicId))
        .setMaxAttempts(0)
        .setStartTime(fromDate ?? 0);

      if (toDate !== undefined) {
        query.setEndTime(toDate);
      }

      if (limit !== undefined) {
        query.setLimit(limit);
      }

      let timeoutId: NodeJS.Timeout | undefined;

      const restartTimeout = (interval: number) => {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          clearTimeout(timeoutId);
          subscription.unsubscribe();
          resolve(results);
        }, interval * 500);
      };

      restartTimeout(2 * maxWaitSeconds);

      query.setCompletionHandler(() => {
        clearTimeout(timeoutId);
        subscription.unsubscribe();
        resolve(results);
      });

      subscription = query.subscribe(
        this.client,
        (_message, error) => {
          if (error) {
            if (timeoutId) clearTimeout(timeoutId);
            subscription.unsubscribe();

            if (error instanceof Error && error.message.startsWith('5 NOT_FOUND:')) {
              resolve(results);
              return;
            }

            reject(error);
          }
        },
        (message) => {
          if (message) results.push({ consensusTime: message.consensusTimestamp.toDate(), contents: message.contents });
          restartTimeout(maxWaitSeconds);
        }
      );
    });
  }

  /**
   * Read messages from Hedera ledger by REST
   * @param props
   * @private
   */
  private async readTopicMessagesByRest(props: ReadTopicMessagesProps): Promise<TopicMessageData[]> {
    const { topicId, fromDate, toDate, limit } = props;

    let messages: TopicMessageData[] = []

    let nextPath = `/api/v1/topics/${topicId}/messages?`;
    if (fromDate) {
      const timestamp = Timestamp.fromDate(fromDate)
      nextPath += `&timestamp=gte:${timestamp.toString()}`;
    }
    if (toDate) {
      const timestamp = Timestamp.fromDate(toDate)
      nextPath += `&timestamp=lte:${timestamp.toString()}`;
    }

    while (nextPath && (!limit || messages.length < limit)) {
      const url = this.getNextUrl(nextPath)
      const result = await this.fetchMessages(url)
      if (result.messages.length) {
        messages = messages.concat(result.messages.map((message) => ({
          consensusTime: new Date(Number(message.consensus_timestamp) * 1000),
          contents: this.decodeMessageContents(message.message),
        })));
      }
      nextPath = result.links?.next
    }

    return limit ? messages.slice(0, limit) : messages
  }

  /**
   * Convert Base string to Uint8Array
   * @param base64String
   * @private
   */
  private decodeMessageContents(base64String: string): Uint8Array {
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(base64String, 'base64');
    }

    const binaryString = atob(base64String);
    return new Uint8Array([...binaryString].map(char => char.charCodeAt(0)));
  }

  /**
   * Fetch messages by REST by URL
   * @param url
   * @private
   */
  private async fetchMessages(url: string): Promise<ApiGetTopicMessageResponse> {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch topic messages: ${response.statusText}`)
    }

    const data: ApiGetTopicMessageResponse = await response.json()
    return data
  }

  /**
   * Gte next Url for fetch messages by REST
   * @param nextPath
   * @param limit
   * @param encoding
   * @private
   */
  private getNextUrl(nextPath: string, limit = 25, encoding = 'base64') {
    const apiUrl = getMirrorNetworkNodeUrl(this.client)

    const url = new URL(`${apiUrl}${nextPath}`);
    url.searchParams.set('limit', limit.toString());
    url.searchParams.set('encoding', encoding);

    return url.toString();
  }
}
