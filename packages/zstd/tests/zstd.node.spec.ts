import { Zstd } from '../src';

describe('Zstd - Node.js Environment', () => {
  jest.mock('zstd-napi', () => ({
    compress: (data: Uint8Array) => data,
    decompress: (data: Uint8Array) => data,
  }));
  jest.mock('react-native-zstd', () => undefined);

  it('should compress data', () => {
    const input = new Uint8Array([0x1, 0x2, 0x3]);
    const output = Zstd.compress(input);

    expect(output).toEqual(input); // Using identity function in mock
  });

  it('should decompress data', () => {
    const input = new Uint8Array([0x4, 0x5, 0x6]);
    const output = Zstd.decompress(input);

    expect(output).toEqual(input); // Using identity function in mock
  });
})
