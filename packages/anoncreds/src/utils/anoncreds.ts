import { parseDID } from '@hiero-did-sdk/core';

export const ANONCREDS_IDENTIFIER_SEPARATOR = '/';

export const ANONCREDS_OBJECT_FAMILY = 'anoncreds';
export const ANONCREDS_VERSION = 'v0';

export enum AnonCredsObjectType {
  SCHEMA = 'SCHEMA',
  PUBLIC_CRED_DEF = 'PUBLIC_CRED_DEF',
  REV_REG = 'REV_REG',
  REV_REG_ENTRY = 'REV_REG_ENTRY',
}

export function buildAnoncredsIdentifier(
  publisherDid: string,
  topicId: string,
  objectType: AnonCredsObjectType
): string {
  const sections = [publisherDid, ANONCREDS_OBJECT_FAMILY, ANONCREDS_VERSION, objectType, topicId];
  return sections.join(ANONCREDS_IDENTIFIER_SEPARATOR);
}

export type AnoncredsIdentifierFields = {
  did: string;
  method: string;
  networkName: string;
  publicKey: string;
  operatorId: string;
  objectFamilyName: string;
  version: string;
  objectTypeName: string;
  topicId: string;
};

export function parseAnoncredsIdentifier(id: string): AnoncredsIdentifierFields {
  // Identifier example "did:hedera:testnet:zFAeKMsqnNc2bwEsC8oqENBvGqjpGu9tpUi3VWaFEBXBo_0.0.5896419/anoncreds/v0/SCHEMA/0.0.5896422"
  const [did, objectFamilyName, version, objectTypeName, topicId] = id.split(ANONCREDS_IDENTIFIER_SEPARATOR);
  const { method, network: networkName, publicKey, topicId: operatorId } = parseDID(did);
  return {
    did,
    method,
    networkName,
    publicKey,
    operatorId,
    objectFamilyName,
    version,
    objectTypeName,
    topicId,
  };
}

