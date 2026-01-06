import { describe, test, expect } from 'vitest'
import { createSvcWorker } from './worker.ts'

describe.todo('SvcWorker#ready', () => {
  describe('success', () => {
    test('basic: should wait for service worker to be activated', async () => {})

    test('with skipWaiting: should wait for service worker to be activated without waiting for `skipWaiting()`', async () => {})
  })

  describe('failure', () => {
    test('should throw `SvcWorkerError` when service worker will not be activated', async () => {})

    test('should throw `DOMException` when service worker operation is aborted', async () => {})
  })
})
