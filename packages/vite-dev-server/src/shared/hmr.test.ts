import { describe, expect, test } from 'vitest'
import { HMRContext } from './hmr'

describe('HMRContext', () => {
  test('data property returns correct data object', () => {
    const mockHMRClient = {
      dataMap: new Map<string, any>(),
      hotModulesMap: new Map(),
      ctxToListenersMap: new Map(),
      customListenersMap: new Map(),
    } as any

    const ownerPath = '/path/to/module'
    const hmrContext = new HMRContext(mockHMRClient, ownerPath)

    // Initially, the data should be an empty object
    expect(hmrContext.data).toEqual({})

    // Set some data and verify it's returned correctly
    const testData = { foo: 'bar' }
    mockHMRClient.dataMap.set(ownerPath, testData)
    expect(hmrContext.data).toEqual(testData)
  })
})
