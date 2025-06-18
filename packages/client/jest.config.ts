import type { Config } from 'jest'

import baseConfig from '../../jest.config'

const config: Config = {
  ...baseConfig,
  displayName: '@hiero-did-sdk/client',
  rootDir: '../..',
  testMatch: [`<rootDir>/packages/client/**/*.test.ts`],
}

export default config
