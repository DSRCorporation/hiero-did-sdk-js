type HashInput = string | Buffer | Uint8Array | ArrayBuffer

interface CryptoModule {
  createHash?(algorithm: string): Hash
  SHA256?(data: HashInput): { toString(): string }
}

interface Hash {
  update(data: HashInput): Hash
  digest(encoding: 'hex'): string
}

export class Crypto {
  private static detectCryptoModule(): CryptoModule {
    // 1. Try to use react-native-quick-crypto (React Native)
    try {
      const rnCrypto = require('react-native-quick-crypto')
      if (rnCrypto.createHash) return rnCrypto
    } catch {}

    // 2. Try to use Node.js crypto
    try {
      const nodeCrypto = require('crypto')
      if (nodeCrypto.createHash) return nodeCrypto
    } catch {}

    // 3. Fallback to crypto-js
    try {
      const cryptoJs = require('crypto-js')
      if (cryptoJs.SHA256) return cryptoJs
    } catch {}

    throw new Error('No compatible crypto module found')
  }

  private static ensureBuffer(data: HashInput): Buffer {
    if (typeof data === 'string') {
      return Buffer.from(data, 'utf-8')
    }
    if (data instanceof ArrayBuffer) {
      return Buffer.from(data)
    }
    if (data instanceof Uint8Array) {
      return Buffer.from(data)
    }
    return data
  }

  static async sha256(data: HashInput): Promise<string> {
    const cryptoModule = Crypto.detectCryptoModule()

    if (cryptoModule.createHash) {
      // For native implementations (Node.js/react-native-quick-crypto)
      const buffer = Crypto.ensureBuffer(data)
      return cryptoModule.createHash('sha256').update(buffer).digest('hex')
    }

    if (cryptoModule.SHA256) {
      // For crypto-js (need to transform to string)
      let inputString: string
      if (typeof data === 'string') {
        inputString = data
      } else {
        inputString = Crypto.ensureBuffer(data).toString('utf-8')
      }
      return cryptoModule.SHA256(inputString).toString()
    }

    throw new Error('Unsupported crypto module')
  }
}
