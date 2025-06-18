import { LRUMemoryCache } from '../src'

describe('LRUCache test', () => {
  it('Put data', async () => {
    const cache = new LRUMemoryCache(10)

    const key = 'test-key'
    const value = { field1: 'value1', field2: 'value2' }

    await cache.set(key, value)

    const resolvedValue = await cache.get(key)
    expect(resolvedValue).toMatchObject(value)
  })

  it('Get data', async () => {
    const cache = new LRUMemoryCache(10)

    const key1 = 'test-key1'
    const value1 = 'test-value1'

    const key2 = 'test-key2'
    const value2 = { field1: 'value1', field2: 'value2' }

    const key3 = 'test-key3'

    await cache.set(key1, value1)
    await cache.set(key2, value2)

    const resolvedValue1 = await cache.get(key1)
    expect(resolvedValue1).toEqual(value1)

    const resolvedValue2 = await cache.get(key2)
    expect(resolvedValue2).toMatchObject(value2)

    const resolvedValue3 = await cache.get(key3)
    expect(resolvedValue3).toBeNull()
  })

  it('Get data with expiration', async () => {
    const cache = new LRUMemoryCache(10)

    const key1 = 'test-key1'
    const value1 = 'test-value1'

    const key2 = 'test-key2'
    const value2 = { field1: 'value1', field2: 'value2' }

    await cache.set(key1, value1)
    await cache.set(key2, value2, 1)

    let resolvedValue1 = await cache.get(key1)
    expect(resolvedValue1).toEqual(value1)

    let resolvedValue2 = await cache.get(key2)
    expect(resolvedValue2).toMatchObject(value2)

    await new Promise((resolve) => setTimeout(resolve, 2000))

    resolvedValue1 = await cache.get(key1)
    expect(resolvedValue1).toEqual(value1)

    resolvedValue2 = await cache.get(key2)
    expect(resolvedValue2).toBeNull()
  })

  it('Delete data', async () => {
    const cache = new LRUMemoryCache(10)

    const key = 'test-key'
    const value = 'test-value'

    await cache.set(key, value)

    let resolvedValue = await cache.get(key)
    expect(resolvedValue).toEqual(value)

    await cache.remove(key)

    resolvedValue = await cache.get(key)
    expect(resolvedValue).toBeNull()
  })

  it('Clean data', async () => {
    const cache = new LRUMemoryCache(10)

    const key1 = 'test-key1'
    const value1 = 'test-value1'

    const key2 = 'test-key2'
    const value2 = { field1: 'value1', field2: 'value2' }

    await cache.set(key1, value1)
    await cache.set(key2, value2)

    let resolvedValue1 = await cache.get(key1)
    expect(resolvedValue1).toEqual(value1)

    let resolvedValue2 = await cache.get(key2)
    expect(resolvedValue2).toMatchObject(value2)

    await cache.cleanup()

    resolvedValue1 = await cache.get(key1)
    expect(resolvedValue1).toBeNull()

    resolvedValue2 = await cache.get(key2)
    expect(resolvedValue2).toBeNull()
  })

  it('Clean expired data', async () => {
    const cache = new LRUMemoryCache(10)

    const key1 = 'test-key1'
    const value1 = 'test-value1'

    const key2 = 'test-key2'
    const value2 = { field1: 'value1', field2: 'value2' }

    const key3 = 'test-key3'
    const value3 = 10

    await cache.set(key1, value1, 1)
    await cache.set(key2, value2, 1)
    await cache.set(key3, value3, 3)

    let data = await cache.getAll()
    expect(data).toHaveLength(3)

    await new Promise((resolve) => setTimeout(resolve, 2000))

    await cache.cleanupExpired()

    data = await cache.getAll()
    expect(data).toHaveLength(1)

    await new Promise((resolve) => setTimeout(resolve, 2000))

    await cache.cleanupExpired()

    data = await cache.getAll()
    expect(data).toHaveLength(0)
  })

  it('Check max capacity', async () => {
    const cache = new LRUMemoryCache(5)

    await cache.set('key1', 1)
    await cache.set('key2', 2)
    await cache.set('key3', 3)
    await cache.set('key4', 4)
    await cache.set('key5', 5)
    await cache.set('key6', 6)

    const data = await cache.getAll()
    expect(data).toHaveLength(5)
    expect(data[0].key).toEqual('key2')
  })

  it('Check LRU', async () => {
    const cache = new LRUMemoryCache(5)

    await cache.set('key1', 1)
    await cache.set('key2', 2)
    await cache.set('key3', 3)
    await cache.set('key4', 4)

    let data = await cache.getAll()
    expect(data.map((e) => e.key)).toEqual(['key1', 'key2', 'key3', 'key4'])

    await cache.get('key3')
    data = await cache.getAll()
    expect(data.map((e) => e.key)).toEqual(['key1', 'key2', 'key4', 'key3'])

    await cache.get('key2')
    data = await cache.getAll()
    expect(data.map((e) => e.key)).toEqual(['key1', 'key4', 'key3', 'key2'])
  })
})
