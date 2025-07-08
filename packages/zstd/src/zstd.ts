interface ZstdModule {
  compress(data: Uint8Array): Uint8Array
  decompress(data: Uint8Array): Uint8Array
}

export class Zstd {
  private static detectZstdModule(): ZstdModule {
    // 1. Try to use react-native-zstd (React Native ZSTD)
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const rnZstd = require('react-native-zstd')
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-return
      if (rnZstd.compress) return rnZstd
    } catch { /* empty */ }

    // 2. Try to use Node.js zstd-napi
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const nodeZstd = require('zstd-napi')
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-return
      if (nodeZstd.compress) return nodeZstd
    } catch { /* empty */ }

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
