import { Zstd } from '../src';

const engines = [
  { name: 'react-native-zstd' },
  { name: 'zstd-napi' },
];

const zstdMock = {
  compress: (data: Uint8Array) => data,
  decompress: (data: Uint8Array) => data,
};

describe('Zstd', () => {

  beforeEach(() => {
    jest.mock('react-native-zstd', () => undefined);
    jest.mock('zstd-napi', () => undefined);
    jest.resetModules();
  });

  it('should throw an error if no compatible zstd module is found', () => {
    jest.doMock('react-native-zstd', () => {
      throw new Error();
    });
    jest.doMock('zstd-napi', () => {
      throw new Error();
    });

    const data = new Uint8Array([0x1, 0x2, 0x3]);
    expect(() => Zstd.compress(data)).toThrow('No compatible zstd module found');
  });

  describe.each(engines)('with $name', ({ name }) => {

    beforeEach(() => {
      if (name === 'react-native-zstd') {
        jest.mock('react-native-zstd', () => zstdMock);
        jest.mock('zstd-napi', () => undefined);
      }
      if (name === 'zstd-napi') {
        jest.mock('react-native-zstd', () => undefined);
        jest.mock('zstd-napi', () => zstdMock);
      }
      jest.resetModules();
    });

    it('should compress data', () => {
      const input = new Uint8Array([0x1, 0x2, 0x3]);
      const output = Zstd.compress(input);

      expect(output).toEqual(input);
    });

    it('should decompress data', () => {
      const input = new Uint8Array([0x4, 0x5, 0x6]);
      const output = Zstd.decompress(input);

      expect(output).toEqual(input);
    });
  })
})
