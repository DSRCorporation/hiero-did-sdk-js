import { Buffer } from 'buffer';

type HashInput = string | Buffer | Uint8Array | ArrayBuffer;

interface CryptoModule {
  createHash?(algorithm: string): Hash;
  SHA256?(data: HashInput): { toString(): string };
}

interface Hash {
  update(data: HashInput): Hash;
  digest(encoding: 'hex'): string;
}

export class Crypto {
  private static detectCryptoModule(): CryptoModule {
    // 1. Try to use react-native-quick-crypto (React Native)
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const rnCrypto = require('react-native-quick-crypto');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-return
      if (rnCrypto.createHash) return rnCrypto;
    } catch {
      /* empty */
    }

    // 2. Try to use Node.js crypto
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const nodeCrypto = require('crypto');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-return
      if (nodeCrypto.createHash) return nodeCrypto;
    } catch {
      /* empty */
    }

    // 3. Fallback to crypto-js
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const cryptoJs = require('crypto-js');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-return
      if (cryptoJs.SHA256) return cryptoJs;
    } catch {
      /* empty */
    }

    throw new Error('No compatible crypto module found');
  }

  private static ensureBuffer(data: HashInput): Buffer {
    if (typeof data === 'string') {
      return Buffer.from(data, 'utf-8');
    }
    if (data instanceof ArrayBuffer) {
      return Buffer.from(data);
    }
    if (data instanceof Uint8Array) {
      return Buffer.from(data);
    }
    return data;
  }

  static sha256(data: HashInput): string {
    const cryptoModule = Crypto.detectCryptoModule();

    if (cryptoModule.createHash) {
      // For native implementations (Node.js/react-native-quick-crypto)
      const buffer = Crypto.ensureBuffer(data);
      return cryptoModule.createHash('sha256').update(buffer).digest('hex');
    }

    if (cryptoModule.SHA256) {
      // For crypto-js (need to transform to string)
      let inputString: string;
      if (typeof data === 'string') {
        inputString = data;
      } else {
        inputString = Crypto.ensureBuffer(data).toString('utf-8');
      }
      return cryptoModule.SHA256(inputString).toString();
    }

    throw new Error('Unsupported crypto module');
  }
}
