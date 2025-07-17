import type { Config } from 'jest'

import base from '../../jest.config.base'

const config: Config = {
  ...base,
  displayName: '@hiero-did-sdk/client',
  rootDir: '../..',
  testMatch: [`<rootDir>/packages/client/**/*.test.ts`],
}

export default config
