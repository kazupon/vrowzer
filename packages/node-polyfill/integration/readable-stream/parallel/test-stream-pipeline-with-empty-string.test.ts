import { describe, it } from 'vitest'
import { mustCall } from '../common/index.ts'
import { pipeline, PassThrough } from 'readable-stream'

describe('test-stream-pipeline-with-empty-string', () => {
  it('should handle empty string as pipeline source', () =>
    new Promise<void>(resolve => {
      pipeline(
        '',
        new PassThrough({
          objectMode: true
        }),
        mustCall(() => {
          resolve()
        }) as (...args: unknown[]) => void
      )
    }))
})
