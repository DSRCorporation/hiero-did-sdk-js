import type { Config } from 'jest'

import base from '../../jest.config.base'

const config: Config = {
  ...base,
  displayName: '@hiero-did-sdk/anoncreds',
  rootDir: '../..',
  testTimeout: 60000,
  testMatch: [`<rootDir>/packages/anoncreds/**/*.test.ts`]
}

export default config
