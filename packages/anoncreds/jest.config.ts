import type { Config } from 'jest'

import baseConfig from '../../jest.config'

const config: Config = {
  ...baseConfig,
  displayName: '@hiero-did-sdk/anoncreds',
  rootDir: '../..',
  testMatch: [`<rootDir>/packages/anoncreds/**/*.test.ts`],
  testTimeout: 60000
}

export default config
