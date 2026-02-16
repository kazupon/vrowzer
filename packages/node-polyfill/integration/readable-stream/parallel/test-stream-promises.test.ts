import { describe, it, expect } from 'vitest'
import { mustCall } from '../common/index.ts'
import * as stream from 'readable-stream'
import { promisify } from 'util'

const { Readable, Writable, pipeline: _pipeline, finished: _finished } = stream

const { finished, pipeline } = (
  stream as unknown as { promises: { finished: Function; pipeline: Function } }
).promises

describe('test-stream-promises', () => {
  it('promises.pipeline and promises.finished exist', () => {
    expect(pipeline).toBeDefined()
    expect(finished).toBeDefined()
  })

  it('pipeline equals promisified stream.pipeline', () => {
    expect(pipeline).toBe(promisify(_pipeline))
  })

  it('finished equals promisified stream.finished', () => {
    expect(finished).toBe(promisify(_finished))
  })

  it('pipeline success', () =>
    new Promise<void>(resolve => {
      let isFinished = false
      const processed: Buffer[] = []
      const expected = [Buffer.from('a'), Buffer.from('b'), Buffer.from('c')]
      const read = new Readable({
        read() {}
      })
      const write = new Writable({
        write(data, _enc, cb) {
          processed.push(data)
          cb()
        }
      })
      write.on('finish', () => {
        isFinished = true
      })
      for (let i = 0; i < expected.length; i++) {
        read.push(expected[i])
      }
      read.push(null)
      pipeline(read, write).then(
        mustCall(() => {
          expect(isFinished).toBeTruthy()
          expect(processed).toEqual(expected)
          resolve()
        }) as (...args: unknown[]) => void
      )
    }))

  it('pipeline error', () =>
    new Promise<void>(resolve => {
      const read = new Readable({
        read() {}
      })
      const write = new Writable({
        write(_data, _enc, cb) {
          cb()
        }
      })
      read.push('data')
      setImmediate(() => read.destroy())
      pipeline(read, write).catch(
        mustCall((err: Error) => {
          expect(err).toBeTruthy()
          resolve()
        }) as (...args: unknown[]) => void
      )
    }))

  it('finished success with fs.createReadStream', async () => {
    const fs = await import('fs')
    const rs = fs.createReadStream(__filename)
    let ended = false
    rs.resume()
    rs.on('end', () => {
      ended = true
    })
    await finished(rs)
    expect(ended).toBe(true)
  })

  it('finished error with fs.createReadStream', async () => {
    const fs = await import('fs')
    const rs = fs.createReadStream('file-does-not-exist')
    await expect(finished(rs)).rejects.toMatchObject({ code: 'ENOENT' })
  })

  it('finished throws on invalid cleanup option type', () => {
    const streamObj = new Readable()
    expect(() => {
      finished(streamObj, {
        cleanup: 2
      })
    }).toThrow()
  })

  it('finished with cleanup true does not throw', () => {
    const streamObj = new Readable()
    finished(streamObj, {
      cleanup: true
    })
  })

  it('cleanup false keeps listeners after finish', () =>
    new Promise<void>(resolve => {
      const streamObj = new Writable()
      expect(streamObj.listenerCount('end')).toBe(0)
      finished(streamObj, {
        cleanup: false
      }).then(
        mustCall(() => {
          expect(streamObj.listenerCount('end')).toBe(1)
          resolve()
        }) as (...args: unknown[]) => void
      )
      streamObj.end()
    }))

  it('cleanup true removes listeners after finish', () =>
    new Promise<void>(resolve => {
      const streamObj = new Writable()
      expect(streamObj.listenerCount('end')).toBe(0)
      finished(streamObj, {
        cleanup: true
      }).then(
        mustCall(() => {
          expect(streamObj.listenerCount('end')).toBe(0)
          resolve()
        }) as (...args: unknown[]) => void
      )
      streamObj.end()
    }))

  it('no cleanup option keeps listeners after finish', () =>
    new Promise<void>(resolve => {
      const streamObj = new Writable()
      expect(streamObj.listenerCount('end')).toBe(0)
      finished(streamObj).then(
        mustCall(() => {
          expect(streamObj.listenerCount('end')).toBe(1)
          resolve()
        }) as (...args: unknown[]) => void
      )
      streamObj.end()
    }))
})
