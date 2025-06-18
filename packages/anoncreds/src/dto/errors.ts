/**
 * Custom error for AnonCreds resolution metadata
 */
export class AnonCredsResolutionMetadataError extends Error {
  constructor(
    public error: 'invalid' | 'notFound' | 'unsupportedAnonCredsMethod' | string,
    message: string
  ) {
    super(message)
  }
}
