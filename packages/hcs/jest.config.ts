import type { Config } from 'jest'
import base from '../../jest.config.base'

const config: Config = {
  ...base,
  displayName: '@hiero-did-sdk/hcs',
  rootDir: '../..',
  testMatch: [`<rootDir>/packages/hcs/**/*.test.ts`],
  testTimeout: 60000
}

export default config
