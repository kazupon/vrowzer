import { Writable } from 'readable-stream'
import util from 'util'
import { describe, expect, it } from 'vitest'

const InternalStream = function (this: InstanceType<typeof Writable>) {
  Writable.call(this as any)
} as unknown as new () => InstanceType<typeof Writable>
util.inherits(InternalStream, Writable)
InternalStream.prototype._write = function (
  _chunk: unknown,
  _encoding: string,
  callback: () => void
) {
  callback()
}

const ExternalStream = function (this: any, writable: InstanceType<typeof Writable>) {
  this._writable = writable
  Writable.call(this as any)
} as unknown as new (
  writable: InstanceType<typeof Writable>
) => InstanceType<typeof Writable> & { _writable: InstanceType<typeof Writable> }
util.inherits(ExternalStream, Writable)
ExternalStream.prototype._write = function (
  this: any,
  chunk: unknown,
  encoding: string,
  callback: () => void
) {
  this._writable.write(chunk, encoding, callback)
}

describe('test-stream-sync-write', () => {
  it('should complete all write callbacks', () =>
    new Promise<void>(resolve => {
      const internalStream = new InternalStream()
      const externalStream = new ExternalStream(internalStream)
      let invocations = 0
      for (let i = 0; i < 2000; i++) {
        externalStream.write(i.toString(), () => {
          invocations++
        })
      }
      externalStream.end()
      externalStream.on('finish', () => {
        expect(invocations).toBe(2000)
        resolve()
      })
    }))
})
