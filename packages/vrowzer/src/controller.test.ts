import { describe, expect, test } from 'vite-plus/test'
import { getController, getServiceWorker } from './controller.ts'

describe('controller', () => {
  test('getController() returns null before initialization', () => {
    expect(getController()).toBeNull()
  })

  test('getServiceWorker() returns null before initialization', () => {
    expect(getServiceWorker()).toBeNull()
  })
})
