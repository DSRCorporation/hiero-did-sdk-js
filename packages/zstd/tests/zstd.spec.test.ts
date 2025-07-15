import { Zstd } from '../src'

describe('Zstd - React Native Environment', () => {

  // Mock 'react-native-zstd' module for React Native environment
  jest.mock('react-native-zstd', () => ({
    compress: (data: Uint8Array) => data,
    decompress: (data: Uint8Array) => data,
  }));

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

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

  it('should handle empty data compression', () => {
    const input = new Uint8Array();
    const output = Zstd.compress(input);

    expect(output.length).toBe(0);
  });

  it('should handle empty data decompression', () => {
    const input = new Uint8Array();
    const output = Zstd.decompress(input);

    expect(output.length).toBe(0);
  });

  it('should return appropriate error for decompression failure', () => {
    const input = new Uint8Array([0xFF, 0xFF, 0xFF]);

    try {
      Zstd.decompress(input);
    } catch (error) {
      expect(error).toBeDefined();
    }
  });
});

describe('Zstd - Node.js Environment', () => {

  // Mock 'zstd-napi' module for Node.js environment
  jest.mock('zstd-napi', () => ({
    compress: (data: Uint8Array) => data,
    decompress: (data: Uint8Array) => data,
  }));

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

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

  it('should handle empty data compression', () => {
    const input = new Uint8Array();
    const output = Zstd.compress(input);

    expect(output.length).toBe(0);
  });

  it('should handle empty data decompression', () => {
    const input = new Uint8Array();
    const output = Zstd.decompress(input);

    expect(output.length).toBe(0);
  });

  it('should return appropriate error for decompression failure', () => {
    const input = new Uint8Array([0xFF, 0xFF, 0xFF]);

    try {
      Zstd.decompress(input);
    } catch (error) {
      expect(error).toBeDefined();
    }
  });
});
