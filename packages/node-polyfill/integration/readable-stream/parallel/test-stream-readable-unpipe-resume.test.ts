import fs from 'fs'
import { Transform } from 'readable-stream'
import { describe, it } from 'vitest'
import { mustCall } from '../common/index.ts'

describe('test-stream-readable-unpipe-resume', () => {
  it('unpipe and resume during transform should end the readable', () =>
    new Promise<void>(resolve => {
      const readStream = fs.createReadStream(process.execPath)
      const transformStream = new Transform({
        transform: mustCall(() => {
          readStream.unpipe()
          readStream.resume()
        }) as (...args: unknown[]) => void
      })
      readStream.on(
        'end',
        mustCall(() => {
          resolve()
        }) as (...args: unknown[]) => void
      )
      readStream.pipe(transformStream).resume()
    }))
})
