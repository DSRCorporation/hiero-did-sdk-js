/**
 * Custom error for AnonCreds resolution metadata
 */
export class AnonCredsResolutionMetadataError extends Error {
  constructor(
    // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
    public error: 'invalid' | 'notFound' | 'unsupportedAnonCredsMethod' | string,
    message: string
  ) {
    super(message);
  }
}
