import { AccountId, Client } from '@hashgraph/sdk';
import { HederaClientService, HederaClientConfiguration, HederaNetwork } from '../src';

const network = (process.env.HEDERA_NETWORK as HederaNetwork) ?? 'testnet';
const operatorId = process.env.HEDERA_OPERATOR_ID ?? '';
const operatorKey = process.env.HEDERA_OPERATOR_KEY ?? '';

describe('HederaClientService', () => {
  let config: HederaClientConfiguration;
  let service: HederaClientService;

  beforeEach(() => {
    config = {
      networks: [
        {
          network,
          operatorId,
          operatorKey,
        },
      ],
    };
    service = new HederaClientService(config);
  });

  test('should throw an error if no networks are defined', () => {
    expect(() => new HederaClientService({ networks: [] })).toThrowError('Networks should be defined.');
  });

  test('should throw an error if network names are not unique', () => {
    config.networks.push({
      network: 'testnet',
      operatorId,
      operatorKey,
    });
    expect(() => new HederaClientService(config)).toThrowError('Network names must be unique.');
  });

  test('should get client for a single network configuration', () => {
    const client = service.getClient();
    expect(client).toBeInstanceOf(Client);
    expect(client.operatorAccountId.toString()).toBe('0.0.3');
  });

  test('should get client for multiply networks configuration by name', () => {
    const mainnetOperatorId = AccountId.fromString('0.0.3').toString();
    const customNetOperatorId = '3.2.1';
    const configWithMultipleNetworks: HederaClientConfiguration = {
      networks: [
        {
          network: 'mainnet',
          operatorId: mainnetOperatorId,
          operatorKey,
        },
        {
          network: 'testnet',
          operatorId,
          operatorKey,
        },
        {
          network: {
            name: 'custom-network',
            nodes: {
              node1: '0.0.4',
            },
          },
          operatorId: customNetOperatorId,
          operatorKey,
        },
      ],
    };
    const serviceWithMultipleNetworks = new HederaClientService(configWithMultipleNetworks);
    const testnetClient = serviceWithMultipleNetworks.getClient('testnet');
    expect(testnetClient).toBeInstanceOf(Client);
    expect(testnetClient.operatorAccountId.toString()).toBe(operatorId);
  });

  test('should throw an error if unknown network is requested', () => {
    expect(() => service.getClient('unknownNetwork')).toThrowError('Unknown Hedera network');
  });

  test('should execute operation with client and close the client afterwards', async () => {
    const mockOperation = jest.fn().mockResolvedValue(true);
    await service.withClient({ networkName: 'testnet' }, (client) => {
      expect(client).toBeInstanceOf(Client);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return mockOperation();
    });
    expect(mockOperation).toHaveBeenCalledTimes(1);
  });
});
