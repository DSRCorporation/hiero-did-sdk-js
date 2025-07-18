export type Optional<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>;

export type Extensible = Record<string, unknown>;

export interface AnonCredsOperationStateWait {
  state: 'wait';
}

export interface AnonCredsOperationStateAction {
  state: 'action';
  action: string;
}

export interface AnonCredsOperationStateFinished {
  state: 'finished';
}

export interface AnonCredsOperationStateFailed {
  state: 'failed';
  reason: string;
}

export interface AnonCredsResolutionMetadata extends Extensible {
  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
  error?: 'invalid' | 'notFound' | 'unsupportedAnonCredsMethod' | string;
  message?: string;
}
