import { Zstd } from '../src';

describe('Zstd - Common', () => {
  jest.mock('react-native-zstd', () => undefined);
  jest.mock('zstd-napi', () => undefined);

  it('should handle no supported engine ', () => {
    expect(() => Zstd.compress(new Uint8Array([0xff]))).toThrow('No compatible zstd module found');
  });
})
