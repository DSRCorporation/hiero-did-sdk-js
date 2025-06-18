import type { Config } from 'jest'

import baseConfig from '../../jest.config'

const config: Config = {
  ...baseConfig,
  displayName: '@hiero-did-sdk/cache',
  rootDir: '../..',
  testMatch: [`<rootDir>/packages/cache/**/*.test.ts`],
}

export default config
