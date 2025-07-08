import { PrivateKey } from '@hashgraph/sdk';
import { HederaHcsService } from '../src/hedera-hcs-service';
import { getRandomStr } from './utils/utils';

const operatorId = process.env.HEDERA_TESTNET_OPERATOR_ID ?? '';
const operatorKey = process.env.HEDERA_TESTNET_OPERATOR_KEY ?? '';

describe('Hedera HCS Service', () => {
  jest.setTimeout(120000);

  const ledgerService = new HederaHcsService({
    networks: [
      {
        network: 'testnet',
        operatorId,
        operatorKey,
      },
    ],
  });

  it('Create topic', async () => {
    const topicMemo = '1234567890';
    const autoRenewPeriod = 90 * 24 * 60 * 60; // sec
    const topicId = await ledgerService.createTopic({
      topicMemo,
      submitKey: PrivateKey.fromStringDer(operatorKey),
      adminKey: PrivateKey.fromStringDer(operatorKey),
      autoRenewPeriod,
      autoRenewAccountId: operatorId,
      autoRenewAccountKey: PrivateKey.fromStringDer(operatorKey),
      waitForChangesVisibility: true,
    });
    expect(topicId).toBeDefined();
    const topicInfo = await ledgerService.getTopicInfo({
      topicId: topicId.toString(),
    });
    expect(topicInfo.topicMemo).toEqual(topicMemo);
    expect(topicInfo.submitKey).toEqual(true);
    expect(topicInfo.adminKey).toEqual(true);
    expect(topicInfo.autoRenewPeriod).toEqual(autoRenewPeriod);
    expect(topicInfo.autoRenewAccountId).toEqual(operatorId);
  });

  it('Get topic info', async () => {
    // Create topic
    const topicMemo = '1234567890';
    const topicId = await ledgerService.createTopic({
      topicMemo,
      adminKey: PrivateKey.fromStringDer(operatorKey),
      waitForChangesVisibility: true,
    });
    expect(topicId).toBeDefined();

    // Resolve topic info
    const topicInfo = await ledgerService.getTopicInfo({ topicId });
    expect(topicInfo).toBeDefined();
    expect(topicInfo.topicMemo).toEqual(topicMemo);
    expect(topicInfo.submitKey).toEqual(false);
    expect(topicInfo.adminKey).toEqual(true);
  });

  it('Update topic', async () => {
    const submit1Key = PrivateKey.generate();
    const submit2Key = PrivateKey.generate();
    const admin1Key = PrivateKey.generate();
    const admin2Key = PrivateKey.generate();

    const renewAccountId = '0.0.5065521';
    const renewAccountKey =
      '302e020100300506032b657004220420e4f76aa303bfbf350ad080b879173b31977e5661d51ff5932f6597e2bb6680ff';

    // Create the test topic
    const topicMemo = '1234567890';
    const topicId = await ledgerService.createTopic({
      topicMemo,
      adminKey: admin1Key,
      waitForChangesVisibility: true,
    });
    expect(topicId).toBeDefined();

    let topicInfo = await ledgerService.getTopicInfo({ topicId });

    // Set full set of the properties to the topic
    const newTopicMemo = '0987654321';
    const newAutoRenewPeriod = 60 * 24 * 60 * 60; // sec
    const newExpirationTime = new Date(new Date().setMonth(new Date().getMonth() + 3));
    await ledgerService.updateTopic({
      topicId,
      currentAdminKey: admin1Key,
      submitKey: submit1Key,
      topicMemo: newTopicMemo,
      autoRenewPeriod: newAutoRenewPeriod,
      autoRenewAccountId: renewAccountId,
      autoRenewAccountKey: PrivateKey.fromStringDer(renewAccountKey),
      expirationTime: newExpirationTime,
      waitForChangesVisibility: true,
    });

    topicInfo = await ledgerService.getTopicInfo({ topicId });
    expect(topicInfo.topicMemo).toEqual(newTopicMemo);
    expect(topicInfo.submitKey).toEqual(true);
    expect(topicInfo.adminKey).toEqual(true);
    expect(topicInfo.autoRenewPeriod).toEqual(newAutoRenewPeriod);
    expect(topicInfo.autoRenewAccountId).toEqual(renewAccountId);
    expect(topicInfo.expirationTime).toEqual(Math.floor(newExpirationTime.getTime() / 1000));

    // Change memo, renew period, admin and submit keys
    const nextNewTopicMemo = 'the new memo';
    const nextNewAutoRenewPeriod = 87 * 24 * 60 * 60; // sec
    await ledgerService.updateTopic({
      topicId,
      currentAdminKey: admin2Key,
      submitKey: submit2Key,
      adminKey: admin1Key,
      topicMemo: nextNewTopicMemo,
      autoRenewPeriod: nextNewAutoRenewPeriod,
      waitForChangesVisibility: true,
    });

    topicInfo = await ledgerService.getTopicInfo({ topicId });
    expect(topicInfo.topicMemo).toEqual(nextNewTopicMemo);
    expect(topicInfo.submitKey).toEqual(true);
    expect(topicInfo.adminKey).toEqual(true);
    expect(topicInfo.autoRenewPeriod).toEqual(nextNewAutoRenewPeriod);
    expect(topicInfo.autoRenewAccountId).toEqual(renewAccountId);
    expect(topicInfo.expirationTime).toEqual(Math.floor(newExpirationTime.getTime() / 1000));

    // Clear auto re-new account
    await ledgerService.updateTopic({
      topicId,
      currentAdminKey: admin1Key,
      autoRenewAccountId: operatorId,
      autoRenewAccountKey: PrivateKey.fromStringDer(operatorKey),
      waitForChangesVisibility: true,
    });

    topicInfo = await ledgerService.getTopicInfo({ topicId });
    expect(topicInfo.topicMemo).toEqual(nextNewTopicMemo);
    expect(topicInfo.submitKey).toEqual(true);
    expect(topicInfo.adminKey).toEqual(true);
    expect(topicInfo.autoRenewPeriod).toEqual(nextNewAutoRenewPeriod);
    expect(topicInfo.autoRenewAccountId).toEqual(operatorId);
    expect(topicInfo.expirationTime).toEqual(Math.floor(newExpirationTime.getTime() / 1000));

    // Set admin and submitkeys to the same
    await ledgerService.updateTopic({
      topicId,
      currentAdminKey: admin1Key,
      adminKey: admin2Key,
      submitKey: admin2Key,
      waitForChangesVisibility: true,
    });

    topicInfo = await ledgerService.getTopicInfo({ topicId });
    expect(topicInfo.topicMemo).toEqual(nextNewTopicMemo);
    expect(topicInfo.submitKey).toEqual(true);
    expect(topicInfo.adminKey).toEqual(true);
    expect(topicInfo.autoRenewPeriod).toEqual(nextNewAutoRenewPeriod);
    expect(topicInfo.autoRenewAccountId).toEqual(operatorId);
    expect(topicInfo.expirationTime).toEqual(Math.floor(newExpirationTime.getTime() / 1000));
  });

  it('Delete topic', async () => {
    const topicMemo = '1234567890';
    const topicId = await ledgerService.createTopic({
      topicMemo,
      adminKey: PrivateKey.fromStringDer(operatorKey),
      waitForChangesVisibility: true,
    });
    expect(topicId).toBeDefined();

    const topicInfo = await ledgerService.getTopicInfo({ topicId });
    expect(topicInfo).toBeDefined();

    await ledgerService.deleteTopic({
      topicId,
      currentAdminKey: PrivateKey.fromStringDer(operatorKey),
    });

    await expect(ledgerService.getTopicInfo({ topicId })).rejects.toThrow(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      expect.objectContaining({
        name: 'StatusError',
        message: expect.stringMatching(/INVALID_TOPIC_ID/),
      })
    );
  });

  it('Submit HCS-1 file', async () => {
    const content = `___${getRandomStr(1200)}___`;
    const fileTopicId = await ledgerService.submitFile({
      payload: Buffer.from(content),
      waitForChangesVisibility: true,
    });
    expect(fileTopicId).toBeDefined();
  });

  it('Resolve HCS-1 file', async () => {
    // Submit file
    const content = `___${getRandomStr(1200)}___`;
    const topicId = await ledgerService.submitFile({
      payload: Buffer.from(content),
      waitForChangesVisibility: true,
    });
    expect(topicId).toBeDefined();

    // Resolve submitted file
    const resolvedFile = await ledgerService.resolveFile({ topicId });
    expect(resolvedFile.toString()).toEqual(content);
  });

  it('Submit message', async () => {
    // Create topic
    const topicId = await ledgerService.createTopic({
      topicMemo: 'test',
      waitForChangesVisibility: true,
    });
    expect(topicId).toBeDefined();

    // Submit message
    const message = 'test message';
    const messageTransactionId = await ledgerService.submitMessage({
      topicId,
      message,
      waitForChangesVisibility: true,
    });
    expect(messageTransactionId).toBeDefined();
  });

  it('Submit message to private topic', async () => {
    const submitKey = PrivateKey.generate();

    // Create topic
    const topicId = await ledgerService.createTopic({
      topicMemo: 'test',
      submitKey,
      waitForChangesVisibility: true,
    });
    expect(topicId).toBeDefined();

    // Submit message without signature
    await expect(
      ledgerService.submitMessage({
        topicId,
        message: 'test message',
        waitForChangesVisibility: true,
      })
    ).rejects.toThrow();

    // Submit message with signature
    const messageTransactionId = await ledgerService.submitMessage({
      topicId,
      message: 'test message',
      submitKey,
      waitForChangesVisibility: true,
    });
    expect(messageTransactionId).toBeDefined();
  });

  it('Get messages', async () => {
    // Create topic
    const topicId = await ledgerService.createTopic({
      topicMemo: '',
      waitForChangesVisibility: true,
    });
    expect(topicId).toBeDefined();

    // Submit messages
    const messageTransactionId_1 = await ledgerService.submitMessage({
      topicId,
      message: 'test message 1',
      waitForChangesVisibility: true,
    });
    expect(messageTransactionId_1).toBeDefined();
    const messageTransactionId_2 = await ledgerService.submitMessage({
      topicId,
      message: 'test message 2',
      waitForChangesVisibility: true,
    });
    expect(messageTransactionId_2).toBeDefined();

    // Resolve messages
    const messages = await ledgerService.getTopicMessages({ topicId });
    expect(messages).toBeDefined();
    expect(messages).toHaveLength(2);
  });
});
