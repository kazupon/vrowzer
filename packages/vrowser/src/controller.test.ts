import { describe, expect, test } from 'vitest'
import { getController, getServiceWorker } from './controller.ts'

describe('controller', () => {
  test('getController() returns null before initialization', () => {
    expect(getController()).toBeNull()
  })

  test('getServiceWorker() returns null before initialization', () => {
    expect(getServiceWorker()).toBeNull()
  })
})
