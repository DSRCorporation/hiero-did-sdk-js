import { Zstd } from '../src';

describe('ZSTD', () => {
  const testString = 'Test data for sha256 calculating';

  const data = new TextEncoder().encode(testString);
  const compressedData = [
    40, 181, 47, 253, 32, 32, 1, 1, 0, 84, 101, 115, 116, 32, 100, 97, 116, 97, 32, 102, 111, 114, 32, 115, 104, 97, 50,
    53, 54, 32, 99, 97, 108, 99, 117, 108, 97, 116, 105, 110, 103,
  ];

  it('should compress data correctly', () => {
    const compressed = Zstd.compress(data);
    expect(compressed).toBeInstanceOf(Uint8Array);
    expect(Array.from(compressed)).toEqual(compressedData);
  });

  it('should decompress data to original', () => {
    const compressed = new Uint8Array(compressedData);
    const decompressed = Zstd.decompress(compressed);

    expect(decompressed).toBeInstanceOf(Uint8Array);
    expect(new TextDecoder().decode(decompressed)).toBe(testString);
  });

  it('should handle round-trip compression/decompression', () => {
    const compressed = Zstd.compress(data);
    const decompressed = Zstd.decompress(compressed);

    expect(Array.from(decompressed)).toEqual(Array.from(data));
  });
});
