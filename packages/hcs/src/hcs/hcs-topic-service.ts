import {
  type Client,
  PrivateKey,
  Status,
  Timestamp,
  TopicCreateTransaction,
  TopicDeleteTransaction,
  TopicInfoQuery,
  TopicUpdateTransaction,
} from '@hashgraph/sdk';
import Duration from '@hashgraph/sdk/lib/Duration';
import AccountId from '@hashgraph/sdk/lib/account/AccountId';
import { HcsCacheService } from '../cache';
import { CacheConfig } from '../hedera-hcs-service.configuration';
import { Cache } from '@hiero-did-sdk/core';
import { waitChangesVisibility } from '../shared';

const DEFAULT_AUTO_RENEW_PERIOD = 90 * 24 * 60 * 60 // 90 days

// Todo: Currently is not possible to clear (set to defaults) the properties
//       looks like, methods clearXXX are not working
//       If will require it can be added NULL values to CreateTopicProps and UpdateTopicProps and clear the values

export interface CreateTopicProps {
  topicMemo?: string
  submitKey?: PrivateKey
  adminKey?: PrivateKey
  autoRenewPeriod?: Duration | Long | number
  autoRenewAccountId?: AccountId | string
  autoRenewAccountKey?: PrivateKey
  waitChangesVisibility?: boolean
  waitChangesVisibilityTimeout?: number
}

export type UpdateTopicProps = {
  topicId: string
  currentAdminKey: PrivateKey
  expirationTime?: Timestamp | Date
} & CreateTopicProps

export type DeleteTopicProps = {
  topicId: string
  currentAdminKey: PrivateKey
}

export interface GetTopicInfoProps {
  topicId: string
}

export interface TopicInfo {
  topicId: string
  topicMemo: string
  adminKey: boolean
  submitKey: boolean
  autoRenewPeriod?: number
  autoRenewAccountId?: string
  expirationTime?: number
}

export class HcsTopicService {
  private readonly cacheService?: HcsCacheService

  constructor(
    private readonly client: Client,
    cache?: CacheConfig | Cache | HcsCacheService
  ) {
    this.cacheService = cache ? (cache instanceof HcsCacheService ? cache : new HcsCacheService(cache)) : undefined
  }

  /**
   * Create topic
   * @param props
   */
  public async createTopic(props?: CreateTopicProps): Promise<string> {
    if (props?.autoRenewAccountId && !props?.autoRenewAccountKey) {
      throw new Error('The autoRenewAccountKey is required for set the autoRenewAccountId')
    }

    let transaction = new TopicCreateTransaction()

    if (props?.topicMemo) {
      transaction = transaction.setTopicMemo(props?.topicMemo)
    }

    if (props?.submitKey) {
      transaction = transaction.setSubmitKey(props.submitKey)
    }

    if (props?.adminKey) {
      transaction = transaction.setAdminKey(props.adminKey)
    }

    if (props?.autoRenewPeriod) {
      transaction = transaction.setAutoRenewPeriod(props.autoRenewPeriod)
    }

    if (props?.autoRenewAccountId) {
      transaction = transaction.setAutoRenewAccountId(props.autoRenewAccountId)
    }

    const frozenTransaction = transaction.freezeWith(this.client)

    if (props?.autoRenewAccountKey) await frozenTransaction.sign(props.autoRenewAccountKey)
    if (props?.adminKey) await frozenTransaction.sign(props.adminKey)

    const response = await frozenTransaction.execute(this.client)

    const receipt = await response.getReceipt(this.client)
    if (receipt.status !== Status.Success) {
      throw new Error(`Topic Create transaction failed: ${receipt.status.toString()}`)
    }

    if (!receipt.topicId) {
      throw new Error('Topic create transaction failed: No topicId received')
    }

    const topicId = receipt.topicId.toString()

    if (props?.waitChangesVisibility) {
      await waitChangesVisibility<TopicInfo>({
        fetchFn: () => this.getTopicInfoWithoutCache({topicId}),
        checkFn: (topicInfo: TopicInfo) => topicInfo.topicId === topicId,
        waitTimeout: props?.waitChangesVisibilityTimeout
      })
    }

    return topicId
  }

  /**
   * Update topic
   * @param props
   */
  public async updateTopic(props: UpdateTopicProps): Promise<void> {
    if (props?.autoRenewAccountId && !props?.autoRenewAccountKey) {
      throw new Error('The autoRenewAccountKey is required for set the autoRenewAccountId')
    }

    let transaction = new TopicUpdateTransaction().setTopicId(props.topicId)

    if (props.topicMemo !== undefined) {
      transaction = transaction.setTopicMemo(props.topicMemo ?? '')
    }

    if (props.submitKey !== undefined) {
      transaction = transaction.setSubmitKey(props.submitKey)
    }

    if (props.adminKey !== undefined) {
      transaction = transaction.setAdminKey(props.adminKey)
    }

    if (props.autoRenewPeriod !== undefined) {
      transaction = transaction.setAutoRenewPeriod(props.autoRenewPeriod ?? DEFAULT_AUTO_RENEW_PERIOD)
    }

    if (props.autoRenewAccountId !== undefined) {
      transaction = transaction.setAutoRenewAccountId(props.autoRenewAccountId)
    }

    if (props.expirationTime !== undefined) {
      transaction = transaction.setExpirationTime(props.expirationTime)
    }

    const frozenTransaction = transaction.freezeWith(this.client)

    if (props.autoRenewAccountKey) await frozenTransaction.sign(props.autoRenewAccountKey)
    if (props.adminKey) await frozenTransaction.sign(props.adminKey)
    await frozenTransaction.sign(props.currentAdminKey)

    const response = await frozenTransaction.execute(this.client)

    const receipt = await response.getReceipt(this.client)
    if (receipt.status !== Status.Success) {
      throw new Error(`Topic update transaction failed: ${receipt.status.toString()}`)
    }

    await this.cacheService?.removeTopicInfo(this.client, props.topicId)

    if (props?.waitChangesVisibility) {
      await waitChangesVisibility({
        fetchFn: () => this.getTopicInfoWithoutCache({topicId: props.topicId}),
        checkFn: (topicInfo: TopicInfo) =>
          (props.topicId === topicInfo.topicId)
          && (props.topicMemo === undefined || props.topicMemo === topicInfo.topicMemo)
          && (props.submitKey === undefined || !!props.submitKey === topicInfo.submitKey)
          && (props.adminKey === undefined || !!props.adminKey === topicInfo.adminKey)
          && (props.autoRenewPeriod === undefined || props.autoRenewPeriod === topicInfo.autoRenewPeriod)
          && (props.autoRenewAccountId === undefined || props.autoRenewAccountId === topicInfo.autoRenewAccountId)
          && (props.expirationTime === undefined || this.convertExpirationTimeToSeconds(props.expirationTime) === topicInfo.expirationTime),
        waitTimeout: props?.waitChangesVisibilityTimeout
      })
    }
  }

  /**
   * Delete topic
   * @param props
   */
  public async deleteTopic(props: DeleteTopicProps): Promise<void> {
    const topicDeleteTx = new TopicDeleteTransaction().setTopicId(props.topicId)

    const topicDeleteSubmit = await topicDeleteTx.freezeWith(this.client).sign(props.currentAdminKey)

    const topicDeleteSubmitResult = await topicDeleteSubmit.execute(this.client)

    const receipt = await topicDeleteSubmitResult.getReceipt(this.client)
    if (receipt.status !== Status.Success) {
      throw new Error(`Topic delete transaction failed: ${receipt.status.toString()}`)
    }

    await this.cacheService?.removeTopicInfo(this.client, props.topicId)
  }

  /**
   * Get topic info
   * @param props
   */
  public async getTopicInfo(props: GetTopicInfoProps): Promise<TopicInfo> {
    const cachedInfo = await this.cacheService?.getTopicInfo(this.client, props.topicId)
    if (cachedInfo) return cachedInfo

    const result = await this.getTopicInfoWithoutCache(props)

    await this.cacheService?.setTopicInfo(this.client, props.topicId, result)

    return result
  }

  /**
   * Get topic info
   * @param props
   */
  private async getTopicInfoWithoutCache(props: GetTopicInfoProps): Promise<TopicInfo> {
    const topicInfoQuery = new TopicInfoQuery().setTopicId(props.topicId)
    const info = await topicInfoQuery.execute(this.client)
    return {
      topicId: info.topicId.toString(),
      topicMemo: info.topicMemo,
      adminKey: !!info.adminKey,
      submitKey: !!info.submitKey,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      autoRenewPeriod: info.autoRenewPeriod?.seconds.low,
      autoRenewAccountId: info.autoRenewAccountId?.toString(),
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expirationTime: info.expirationTime?.seconds.low,
    }
  }

  private convertExpirationTimeToSeconds = (expirationTime?: Timestamp | Date): number | undefined => {
    if (!expirationTime) return undefined;

    if (expirationTime instanceof Timestamp) {
      return Math.floor(expirationTime.toDate().getTime() / 1000);
    }

    if (expirationTime instanceof Date) {
      return Math.floor(expirationTime.getTime() / 1000);
    }

    throw new Error("Invalid expirationTime type");
  }
}
