import type { Config } from 'jest';

import base from '../../jest.config.base'

const config: Config = {
  ...base,
  displayName: '@hiero-did-sdk/cache',
  rootDir: '../..',
  testMatch: [`<rootDir>/packages/cache/**/*.test.ts`],
};

export default config;
