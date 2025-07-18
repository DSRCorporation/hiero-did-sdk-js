import type { Config } from 'jest'

import base from '../../jest.config.base'

const config: Config = {
  ...base,
  displayName: '@hiero-did-sdk/zstd',
  rootDir: '../..',
  testMatch: [`<rootDir>/packages/zstd/**/*.test.ts`],
}

export default config
