import type { Config } from 'jest'

import baseConfig from '../../jest.config'

const config: Config = {
  ...baseConfig,
  displayName: '@hiero-did-sdk/hcs',
  rootDir: '../..',
  testMatch: [`<rootDir>/packages/hcs/**/*.test.ts`],
  testTimeout: 60000
}

export default config
