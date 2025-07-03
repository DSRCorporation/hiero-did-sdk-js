import {
  type Client,
  PrivateKey,
  Status,
  type SubscriptionHandle,
  TopicId,
  TopicMessageQuery,
  TopicMessageSubmitTransaction,
} from '@hashgraph/sdk';
import { HcsCacheService } from '../cache'
import { CacheConfig } from '../hedera-hcs-service.configuration';
import { Cache } from '@hiero-did-sdk/core';
import { waitChangesVisibility } from '../shared';

const DEFAULT_TIMEOUT_SECONDS = 2

export interface SubmitMessageProps {
  topicId: string
  message: string
  submitKey?: PrivateKey
  waitChangesVisibility?: boolean
  waitChangesVisibilityTimeout?: number
}

export interface SubmitMessageResult {
  nodeId: string
  transactionId: string
  transactionHash: Uint8Array
}

export interface GetTopicMessagesProps {
  topicId: string
  maxWaitSeconds?: number
  toDate?: Date
  limit?: number
}

type ReadTopicMessagesProps = GetTopicMessagesProps & {
  fromDate?: Date
}

export interface TopicMessageData {
  consensusTime: Date
  contents: Uint8Array
}

export class HcsMessageService {
  private readonly cacheService?: HcsCacheService

  constructor(
    private readonly client: Client,
    cache?: CacheConfig | Cache | HcsCacheService
  ) {
      this.cacheService = cache ? (cache instanceof HcsCacheService ? cache : new HcsCacheService(cache)) : undefined
  }

  /**
   * Submit message to a topic
   * @param props
   */
  public async submitMessage(props: SubmitMessageProps): Promise<SubmitMessageResult> {
    const startFrom = new Date(Date.now() - 500);

    const transaction = new TopicMessageSubmitTransaction().setTopicId(props.topicId).setMessage(props.message)

    const frozenTransaction = transaction.freezeWith(this.client)

    if (props?.submitKey) await frozenTransaction.sign(props.submitKey)

    const response = await frozenTransaction.execute(this.client)

    const receipt = await response.getReceipt(this.client)
    if (receipt.status !== Status.Success) {
      throw new Error(`Message submit transaction failed: ${receipt.status.toString()}`)
    }

    await this.cacheService?.removeTopicMessages(this.client, props.topicId)

    if (props?.waitChangesVisibility) {
      await waitChangesVisibility<string[]>({
        fetchFn: () => this.getNewMessages({topicId: props.topicId, startFrom}),
        checkFn: (messages) => messages.indexOf(props.message) >= 0,
        waitTimeout: props?.waitChangesVisibilityTimeout
      })
    }

    return {
      nodeId: response.nodeId.toString(),
      transactionId: response.transactionId.toString(),
      transactionHash: response.transactionHash,
    }
  }

  /**
   * Get topic messages by query
   * @param props
   */
  public async getTopicMessages(props: GetTopicMessagesProps): Promise<TopicMessageData[]> {
    let currentCachedMessages = (await this.cacheService?.getTopicMessages(this.client, props.topicId)) ?? []

    const lastCachedMessage =
      currentCachedMessages.length > 0 ? currentCachedMessages[currentCachedMessages.length - 1] : undefined

    const lastCachedMessageDate = lastCachedMessage ? lastCachedMessage.consensusTime : new Date(0)
    const borderlineDate = new Date((props.toDate ? props.toDate : new Date()).getTime() + 1) // +1ms to remove the influence of nanoseconds

    if (lastCachedMessageDate < borderlineDate) {
      const messages = await this.readTopicMessages({
        ...props,
        fromDate: lastCachedMessageDate,
        toDate: borderlineDate,
      })
      if (messages.length) {
        currentCachedMessages = this.joinMessages(currentCachedMessages, messages)
        await this.cacheService?.setTopicMessages(this.client, props.topicId, currentCachedMessages)
      }
    }

    return currentCachedMessages.filter((m) => m.consensusTime <= borderlineDate)
  }

  /**
   * Read messages from Hedera ledger
   * @param props
   * @private
   */
  private async readTopicMessages(props: ReadTopicMessagesProps): Promise<TopicMessageData[]> {
    const { maxWaitSeconds = DEFAULT_TIMEOUT_SECONDS, fromDate, toDate, limit } = props ?? {}
    let subscription: SubscriptionHandle
    const results: TopicMessageData[] = []

    return new Promise((resolve, reject) => {
      const query = new TopicMessageQuery()
        .setTopicId(TopicId.fromString(props.topicId))
        .setMaxAttempts(0)
        .setStartTime(fromDate ?? 0)

      if (toDate !== undefined) {
        query.setEndTime(toDate)
      }

      if (limit !== undefined) {
        query.setLimit(limit)
      }

      let timeoutId: NodeJS.Timeout | undefined

      const restartTimeout = (interval: number) => {
        if (timeoutId) clearTimeout(timeoutId)
        timeoutId = setTimeout(() => {
          clearTimeout(timeoutId)
          subscription.unsubscribe()
          resolve(results)
        }, interval * 500)
      }

      restartTimeout(2 * maxWaitSeconds)

      query.setCompletionHandler(() => {
        clearTimeout(timeoutId)
        subscription.unsubscribe()
        resolve(results)
      })

      subscription = query.subscribe(
        this.client,
        (_message, error) => {
          if (error) {
            if (timeoutId) clearTimeout(timeoutId)
            subscription.unsubscribe()

            if (
              error instanceof Error &&
              error.message.startsWith('5 NOT_FOUND:')
            ) {
              resolve(results);
              return;
            }

            reject(error)
          }
        },
        (message) => {
          if (message) results.push({ consensusTime: message.consensusTimestamp.toDate(), contents: message.contents })
          restartTimeout(maxWaitSeconds)
        }
      )
    })
  }

  // todo: double-check and simplify approach
  /**
   * Join two have been read topic messages arrays
   * @param first - The first topic messages array
   * @param second - The second topic messages array
   * @returns The array with joined messages. Messages are unique and sorted by consensus date
   */
  private joinMessages(first: TopicMessageData[], second: TopicMessageData[]): TopicMessageData[] {
    const messagesMap = new Map<string, TopicMessageData>()

    const toKey = (msg: TopicMessageData) => `${msg.consensusTime.getTime()}`

    for (const msg of first) {
      messagesMap.set(toKey(msg), msg)
    }

    for (const msg of second) {
      messagesMap.set(toKey(msg), msg)
    }

    const mergedArray = Array.from(messagesMap.values())
    mergedArray.sort((a, b) => a.consensusTime.getTime() - b.consensusTime.getTime())

    return mergedArray
  }

  /**
   * Get messages from Date
   * @param options
   * @private
   */
  private async getNewMessages(options: {
    topicId: string,
    startFrom: Date
  }): Promise<string[]> {
    const { topicId, startFrom } = options
    const messages = await this.readTopicMessages({
      topicId, fromDate: startFrom
    })
    return messages.map(m => Buffer.from(m.contents).toString('utf-8'))
  }
}
