import type { Config } from 'jest'

import baseConfig from '../../jest.config'

const config: Config = {
  ...baseConfig,
  displayName: '@hiero-did-sdk/crypto',
  rootDir: '../..',
  testMatch: [`<rootDir>/packages/crypto/**/*.test.ts`],
}

export default config
