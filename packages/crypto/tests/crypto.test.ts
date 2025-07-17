import { Crypto } from '../src';

const data = 'Test data for sha256 calculating';
const digest = '952a959a1ac6cd9ce1d80fcd1dfd570401c0d40ab36ea9a7a2e22295fd630d3b';

describe('Crypto.sha256 (NodeJs)', () => {
  it('should hash a string input correctly with Node.js crypto', () => {
    const sha256 = Crypto.sha256(data);
    expect(sha256).toEqual(digest);
  });
});

describe('Crypto.sha256 (Mocks)', () => {
  const mockCreateHash = jest.fn().mockReturnThis();
  const mockUpdate = jest.fn().mockReturnThis();
  const mockDigest = jest.fn().mockReturnValue(digest);
  const cryptoMock = {
    createHash: mockCreateHash,
    update: mockUpdate,
    digest: mockDigest,
  };

  const mockSHA256 = jest.fn().mockReturnValue({ toString: () => digest });
  const cryptoJsMock = {
    SHA256: mockSHA256,
  };

  beforeEach(() => {
    jest.mock('react-native-quick-crypto', () => undefined);
    jest.mock('crypto', () => undefined);
    jest.mock('crypto-js', () => undefined);
    jest.resetModules();
  });

  it('should hash a string input correctly with react-native-quick-crypto', () => {
    jest.mock('react-native-quick-crypto', () => cryptoMock);
    jest.resetModules();

    const result = Crypto.sha256(data);
    expect(result).toBe(digest);

    // Verify the hash was created with 'sha256'
    expect(mockCreateHash).toHaveBeenCalledWith('sha256');
  });

  it('should hash a string input correctly with Node.js crypto', () => {
    jest.mock('crypto', () => cryptoMock);
    jest.resetModules();

    const result = Crypto.sha256(data);
    expect(result).toBe(digest);

    // Verify the hash was created with 'sha256'
    expect(mockCreateHash).toHaveBeenCalledWith('sha256');
  });

  it('should hash a string input correctly with crypto-js', () => {
    jest.mock('crypto-js', () => cryptoJsMock);
    jest.resetModules();

    const result = Crypto.sha256(data);
    expect(result).toBe(digest);

    // Verify SHA256 was called with the input string
    expect(mockSHA256).toHaveBeenCalledWith(data);
  });

  it('should handle different types of HashInput', () => {
    jest.mock('crypto', () => cryptoMock);
    jest.resetModules();

    const stringInput = data;
    const arrayBufferInput = new TextEncoder().encode(stringInput);
    const uint8ArrayInput = new Uint8Array(arrayBufferInput);

    expect(Crypto.sha256(stringInput)).toBe(digest);
    expect(Crypto.sha256(arrayBufferInput)).toBe(digest);
    expect(Crypto.sha256(uint8ArrayInput)).toBe(digest);

    // Verify all inputs were properly converted to buffers
    expect(mockUpdate).toHaveBeenCalledWith(expect.any(Buffer));
  });

  it('should throw an error if no compatible crypto module is found', () => {
    // Mock failure for all crypto modules
    jest.doMock('react-native-quick-crypto', () => {
      throw new Error();
    });
    jest.doMock('crypto', () => {
      throw new Error();
    });
    jest.doMock('crypto-js', () => {
      throw new Error();
    });

    expect(() => Crypto.sha256(data)).toThrow('No compatible crypto module found');
  });
});
