import type { Config } from 'jest'
import base from '../../jest.config.base'

const config: Config = {
  ...base,
  displayName: '@hiero-did-sdk/hcs',
  rootDir: '../..',
  testMatch: [`<rootDir>/packages/hcs/**/*.spec.ts`, `<rootDir>/packages/hcs/**/*.e2e.ts`]
}

export default config
