import { AccountId } from '@hashgraph/sdk';

export type HederaNetwork = 'mainnet' | 'testnet' | 'previewnet' | 'local-node' | 'solo';

export type HederaCustomNetwork = {
  name: string;
  nodes: {
    [key: string]: string | AccountId;
  };
  mirrorNodes?: string | string[] | undefined;
};

export interface NetworkConfig {
  network: HederaNetwork | HederaCustomNetwork;
  operatorId: string;
  operatorKey: string;
}

export interface HederaClientConfiguration {
  networks: NetworkConfig[];
}
