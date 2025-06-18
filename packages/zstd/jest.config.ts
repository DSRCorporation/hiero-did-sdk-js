import type { Config } from 'jest'

import baseConfig from '../../jest.config'

const config: Config = {
  ...baseConfig,
  displayName: '@hiero-did-sdk/zstd',
  rootDir: '../..',
  testMatch: [`<rootDir>/packages/zstd/**/*.test.ts`],
}

export default config
