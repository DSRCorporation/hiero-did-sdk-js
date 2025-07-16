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
