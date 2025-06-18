interface ZstdModule {
  compress(data: Uint8Array): Uint8Array
  decompress(data: Uint8Array): Uint8Array
}

export class Zstd {
  private static detectZstdModule(): ZstdModule {
    // 1. Try to use react-native-zstd (React Native ZSTD)
    try {
      const rnZstd = require('react-native-zstd')
      if (rnZstd.compress) return rnZstd
    } catch {}

    // 2. Try to use Node.js zstd-napi
    try {
      const nodeZstd = require('zstd-napi')
      if (nodeZstd.compress) return nodeZstd
    } catch {}

    throw new Error('No compatible zstd module found')
  }

  static compress(data: Uint8Array): Uint8Array {
    const zstdModule = Zstd.detectZstdModule()
    return zstdModule.compress(data)
  }

  static decompress(data: Uint8Array): Uint8Array {
    const zstdModule = Zstd.detectZstdModule()
    return zstdModule.decompress(data)
  }
}
