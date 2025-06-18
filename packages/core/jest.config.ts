import type { Config } from 'jest';
import base from '../../jest.config.base';

const config: Config = {
  ...base,
  displayName: '@hiero-did-sdk/core',
  rootDir: '../..',
  testMatch: [`<rootDir>/packages/core/**/*.spec.ts`],
};
export default config;
