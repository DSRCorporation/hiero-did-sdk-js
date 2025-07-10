import { type Client } from '@hashgraph/sdk';

/**
 * Check the mirror query supported and can be used
 */
export function isMirrorQuerySupported (client: Client): boolean
{
  return !!client._mirrorNetwork.getNextMirrorNode()
}

/**
 * Normalize mirrorNode URL
 * @param url
 */
export function normalizeMirrorUrl(url: string): string {
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }
  return `https://${url.replace(':443', '')}`
}
