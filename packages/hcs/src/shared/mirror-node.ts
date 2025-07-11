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

  if (url.endsWith('/')) {
    url = url.slice(0, -1)
  }

  return `https://${url.replace(':443', '')}`
}

/**
 * Get mirror node URL or catch error if it missed
 * @param client
 */
export function getMirrorNetworkNodeUrl(client: Client): string {
  const mirrorNetwork = client.mirrorNetwork;
  const restApiUrl = Array.isArray(mirrorNetwork) && mirrorNetwork.length > 0
    ? mirrorNetwork[0]
    : undefined;

  if (!restApiUrl)
  {
    throw new Error(`Mirror node doesn't defined for the used network`);
  }

  return normalizeMirrorUrl(restApiUrl)
}
