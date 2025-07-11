import {
  type Client,
  PrivateKey,
  Status, StatusError,
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
import {
  getMirrorNetworkNodeUrl,
  isMirrorQuerySupported,
  waitForChangesVisibility,
} from '../shared';

const DEFAULT_AUTO_RENEW_PERIOD = 90 * 24 * 60 * 60; // 90 days

// Todo: Currently is not possible to clear (set to defaults) the properties
//       looks like, methods clearXXX are not working
//       If will require it can be added NULL values to CreateTopicProps and UpdateTopicProps and clear the values

export interface CreateTopicProps {
  topicMemo?: string;
  submitKey?: PrivateKey;
  adminKey?: PrivateKey;
  autoRenewPeriod?: Duration | Long | number;
  autoRenewAccountId?: AccountId | string;
  autoRenewAccountKey?: PrivateKey;
  waitForChangesVisibility?: boolean;
  waitForChangesVisibilityTimeoutMs?: number;
}

export type UpdateTopicProps = {
  topicId: string;
  currentAdminKey: PrivateKey;
  expirationTime?: Timestamp | Date;
} & CreateTopicProps;

export type DeleteTopicProps = {
  topicId: string;
  currentAdminKey: PrivateKey;
};

export interface GetTopicInfoProps {
  topicId: string;
}

export interface TopicInfo {
  topicId: string;
  topicMemo: string;
  adminKey?: boolean;
  submitKey?: boolean;
  autoRenewPeriod?: number;
  autoRenewAccountId?: string;
  expirationTime?: number;
}

interface MirrorNodeTopicResponse {
  deleted: boolean
  topic_id: string;
  memo: string;
  admin_key?: {
    _type: string;
    key: string;
  };
  submit_key?: {
    _type: string;
    key: string;
  };
  auto_renew_period?: number;
  auto_renew_account?: string | null;
  expiration_time?: string | null;
}

export class HcsTopicService {
  private readonly cacheService?: HcsCacheService;

  constructor(
    private readonly client: Client,
    cache?: CacheConfig | Cache | HcsCacheService
  ) {
    this.cacheService = cache ? (cache instanceof HcsCacheService ? cache : new HcsCacheService(cache)) : undefined;
  }

  /**
   * Create topic
   * @param props
   */
  public async createTopic(props?: CreateTopicProps): Promise<string> {
    if (props?.autoRenewAccountId && !props?.autoRenewAccountKey) {
      throw new Error('The autoRenewAccountKey is required for set the autoRenewAccountId');
    }

    let transaction = new TopicCreateTransaction();

    if (props?.topicMemo) {
      transaction = transaction.setTopicMemo(props?.topicMemo);
    }

    if (props?.submitKey) {
      transaction = transaction.setSubmitKey(props.submitKey);
    }

    if (props?.adminKey) {
      transaction = transaction.setAdminKey(props.adminKey);
    }

    if (props?.autoRenewPeriod) {
      transaction = transaction.setAutoRenewPeriod(props.autoRenewPeriod);
    }

    if (props?.autoRenewAccountId) {
      transaction = transaction.setAutoRenewAccountId(props.autoRenewAccountId);
    }

    const frozenTransaction = transaction.freezeWith(this.client);

    if (props?.autoRenewAccountKey) await frozenTransaction.sign(props.autoRenewAccountKey);
    if (props?.adminKey) await frozenTransaction.sign(props.adminKey);

    const response = await frozenTransaction.execute(this.client);

    const receipt = await response.getReceipt(this.client);
    if (receipt.status !== Status.Success) {
      throw new Error(`Topic Create transaction failed: ${receipt.status.toString()}`);
    }

    if (!receipt.topicId) {
      throw new Error('Topic Create transaction failed: Transaction receipt do not contain topicId');
    }

    const topicId = receipt.topicId.toString();

    if (props?.waitForChangesVisibility) {
      await waitForChangesVisibility<TopicInfo>({
        fetchFn: () => this.readTopicInfo({ topicId }),
        checkFn: (topicInfo: TopicInfo) => topicInfo.topicId === topicId,
        waitTimeout: props?.waitForChangesVisibilityTimeoutMs,
      });
    }

    return topicId;
  }

  /**
   * Update topic
   * @param props
   */
  public async updateTopic(props: UpdateTopicProps): Promise<void> {
    if (props?.autoRenewAccountId && !props?.autoRenewAccountKey) {
      throw new Error('The autoRenewAccountKey is required for set the autoRenewAccountId');
    }

    let transaction = new TopicUpdateTransaction().setTopicId(props.topicId);

    if (props.topicMemo !== undefined) {
      transaction = transaction.setTopicMemo(props.topicMemo ?? '');
    }

    if (props.submitKey !== undefined) {
      transaction = transaction.setSubmitKey(props.submitKey);
    }

    if (props.adminKey !== undefined) {
      transaction = transaction.setAdminKey(props.adminKey);
    }

    if (props.autoRenewPeriod !== undefined) {
      transaction = transaction.setAutoRenewPeriod(props.autoRenewPeriod ?? DEFAULT_AUTO_RENEW_PERIOD);
    }

    if (props.autoRenewAccountId !== undefined) {
      transaction = transaction.setAutoRenewAccountId(props.autoRenewAccountId);
    }

    if (props.expirationTime !== undefined) {
      transaction = transaction.setExpirationTime(props.expirationTime);
    }

    const frozenTransaction = transaction.freezeWith(this.client);

    if (props.autoRenewAccountKey) await frozenTransaction.sign(props.autoRenewAccountKey);
    if (props.adminKey) await frozenTransaction.sign(props.adminKey);
    await frozenTransaction.sign(props.currentAdminKey);

    const response = await frozenTransaction.execute(this.client);

    const receipt = await response.getReceipt(this.client);
    if (receipt.status !== Status.Success) {
      throw new Error(`Topic update transaction failed: ${receipt.status.toString()}`);
    }

    await this.cacheService?.removeTopicInfo(this.client, props.topicId);

    if (props?.waitForChangesVisibility) {
      await waitForChangesVisibility({
        fetchFn: () => this.readTopicInfo({ topicId: props.topicId }),
        checkFn: (topicInfo: TopicInfo) =>
          (props.topicMemo === undefined || props.topicMemo === topicInfo.topicMemo) &&
          (props.submitKey === undefined || !!props.submitKey === topicInfo.submitKey) &&
          (props.adminKey === undefined || !!props.adminKey === topicInfo.adminKey) &&
          (props.autoRenewPeriod === undefined || props.autoRenewPeriod === topicInfo.autoRenewPeriod) &&
          (props.autoRenewAccountId === undefined || props.autoRenewAccountId === topicInfo.autoRenewAccountId) &&
          (props.expirationTime === undefined || this.convertExpirationTimeToSeconds(props.expirationTime) === topicInfo.expirationTime),
        waitTimeout: props?.waitForChangesVisibilityTimeoutMs,
      });
    }
  }

  /**
   * Delete topic
   * @param props
   */
  public async deleteTopic(props: DeleteTopicProps): Promise<void> {
    const topicTransaction = new TopicDeleteTransaction().setTopicId(props.topicId);

    const topicFreezedAndSignedTransaction = await topicTransaction.freezeWith(this.client).sign(props.currentAdminKey);

    const topicDeleteResult = await topicFreezedAndSignedTransaction.execute(this.client);

    const receipt = await topicDeleteResult.getReceipt(this.client);
    if (receipt.status !== Status.Success) {
      throw new Error(`Topic delete transaction failed: ${receipt.status.toString()}`);
    }

    await this.cacheService?.removeTopicInfo(this.client, props.topicId);
  }

  /**
   * Get topic info
   * @param props
   */
  public async getTopicInfo(props: GetTopicInfoProps): Promise<TopicInfo> {
    const cachedInfo = await this.cacheService?.getTopicInfo(this.client, props.topicId);
    if (cachedInfo) return cachedInfo;

    const result = await this.readTopicInfo(props)

    await this.cacheService?.setTopicInfo(this.client, props.topicId, result);

    return result;
  }

  /**
   * Convert ExpirationTime to seconds
   * @param expirationTime
   */
  private convertExpirationTimeToSeconds = (expirationTime?: Timestamp | Date): number | undefined => {
    if (!expirationTime) return undefined;

    if (expirationTime instanceof Timestamp) {
      return Math.floor(expirationTime.toDate().getTime() / 1000);
    }

    if (expirationTime instanceof Date) {
      return Math.floor(expirationTime.getTime() / 1000);
    }

    throw new Error('Invalid expirationTime type');
  };

  /**
   * Read topic info
   * @param props
   */
  private readTopicInfo(props: GetTopicInfoProps): Promise<TopicInfo> {
    return isMirrorQuerySupported(this.client) ? this.readTopicInfoByClient(props) : this.readTopicInfoByRest(props)
  }

  /**
   * Read topic info by GprsClient
   * @param props
   * @private
   */
  private async readTopicInfoByClient(props: GetTopicInfoProps): Promise<TopicInfo> {
    const topicInfoQuery = new TopicInfoQuery().setTopicId(props.topicId);
    const info = await topicInfoQuery.execute(this.client);

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
    };
  }

  /**
   * Read topic info by REST API
   * @param props
   * @private
   */
  private async readTopicInfoByRest(props: GetTopicInfoProps): Promise<TopicInfo> {
    const restApiUrl = getMirrorNetworkNodeUrl(this.client)

    const response = await fetch(`${restApiUrl}/api/v1/topics/${props.topicId}?_=${Date.now()}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch topic info: ${response.statusText}`);
    }

    const data: MirrorNodeTopicResponse = await response.json();
    if (data.deleted)
    {
      throw new StatusError({ status: Status.InvalidTopicId, transactionId: undefined}, Status.InvalidTopicId.toString())
    }

    return {
      topicId: data.topic_id,
      topicMemo: data.memo,
      adminKey: !!data.admin_key,
      submitKey: !!data.submit_key,
      autoRenewPeriod: data.auto_renew_period,
      autoRenewAccountId: data.auto_renew_account ?? undefined,
      expirationTime: data.expiration_time ? new Date(data.expiration_time).getTime() : undefined,
    };
  }
}
