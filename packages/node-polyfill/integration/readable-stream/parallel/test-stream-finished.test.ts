import { describe, it, expect } from 'vite-plus/test'
import { mustCall, mustNotCall, mustSucceed } from '../common/index.ts'
import {
  Writable,
  Readable,
  Transform,
  finished,
  Duplex,
  PassThrough,
  Stream
} from 'readable-stream'
import EE from 'events'
import { promisify } from 'util'

describe('test-stream-finished', () => {
  it('readable push null and resume', () =>
    new Promise<void>(resolve => {
      const rs = new Readable({
        read() {}
      })
      finished(
        rs,
        mustSucceed(() => {
          resolve()
        }) as (...args: unknown[]) => void
      )
      rs.push(null)
      rs.resume()
    }))

  it('writable end', () =>
    new Promise<void>(resolve => {
      const ws = new Writable({
        write(_data, _enc, cb) {
          cb()
        }
      })
      finished(
        ws,
        mustSucceed(() => {
          resolve()
        }) as (...args: unknown[]) => void
      )
      ws.end()
    }))

  it('transform end and resume', () =>
    new Promise<void>(resolve => {
      const tr = new Transform({
        transform(_data, _enc, cb) {
          cb()
        }
      })
      let finish = false
      let ended = false
      tr.on('end', () => {
        ended = true
      })
      tr.on('finish', () => {
        finish = true
      })
      finished(
        tr,
        mustSucceed(() => {
          expect(finish).toBeTruthy()
          expect(ended).toBeTruthy()
          resolve()
        }) as (...args: unknown[]) => void
      )
      tr.end()
      tr.resume()
    }))

  it('check pre-cancelled signal', () =>
    new Promise<void>(resolve => {
      const signal = new EventTarget() as EventTarget & { aborted: boolean }
      ;(signal as any).aborted = true
      const rs = Readable.from((function* () {})())
      finished(
        rs,
        {
          signal
        } as any,
        mustCall((err: Error) => {
          expect(err.name).toBe('AbortError')
          resolve()
        }) as (...args: unknown[]) => void
      )
    }))

  it('check cancelled before the stream ends sync', () =>
    new Promise<void>(resolve => {
      const ac = new AbortController()
      const { signal } = ac
      const rs = Readable.from((function* () {})())
      finished(
        rs,
        {
          signal
        } as any,
        mustCall((err: Error) => {
          expect(err.name).toBe('AbortError')
          resolve()
        }) as (...args: unknown[]) => void
      )
      ac.abort()
    }))

  it('check cancelled before the stream ends async', () =>
    new Promise<void>(resolve => {
      const ac = new AbortController()
      const { signal } = ac
      const rs = Readable.from((function* () {})())
      setTimeout(() => ac.abort(), 1)
      finished(
        rs,
        {
          signal
        } as any,
        mustCall((err: Error) => {
          expect(err.name).toBe('AbortError')
          resolve()
        }) as (...args: unknown[]) => void
      )
    }))

  it('check cancelled after does not throw', () =>
    new Promise<void>(resolve => {
      const ac = new AbortController()
      const { signal } = ac
      const rs = Readable.from(
        (function* () {
          yield 5
          setImmediate(() => ac.abort())
        })()
      )
      rs.resume()
      finished(
        rs,
        {
          signal
        } as any,
        mustSucceed(() => {
          resolve()
        }) as (...args: unknown[]) => void
      )
    }))

  it('promisified abort works', async () => {
    const finishedPromise = promisify(finished)
    const ac = new AbortController()
    const { signal } = ac
    const rs = Readable.from((function* () {})())
    setImmediate(() => ac.abort())
    await expect(finishedPromise(rs, { signal } as any)).rejects.toMatchObject({
      name: 'AbortError'
    })
  })

  it('promisified pre-aborted works', async () => {
    const finishedPromise = promisify(finished)
    const signal = new EventTarget() as EventTarget & { aborted: boolean }
    ;(signal as any).aborted = true
    const rs = Readable.from((function* () {})())
    await expect(finishedPromise(rs, { signal } as any)).rejects.toMatchObject({
      name: 'AbortError'
    })
  })

  it('readable push null then emit close should not error', () =>
    new Promise<void>(resolve => {
      const rs = new Readable()
      finished(
        rs,
        mustSucceed(() => {
          resolve()
        }) as (...args: unknown[]) => void
      )
      rs.push(null)
      rs.emit('close')
      rs.resume()
    }))

  it('emit close before push null triggers premature close', () =>
    new Promise<void>(resolve => {
      const rs = new Readable()
      finished(
        rs,
        mustCall((err: Error) => {
          expect(err).toBeTruthy()
          resolve()
        }) as (...args: unknown[]) => void
      )
      rs.emit('close')
      rs.push(null)
      rs.resume()
    }))

  it('test faulty input values and options', () =>
    new Promise<void>(resolve => {
      const rs = new Readable({
        read() {}
      })
      expect(() => finished(rs, 'foo' as any)).toThrow(/callback/)
      expect(() => finished(rs, 'foo' as any, () => {})).toThrow(/options/)
      expect(() => finished(rs, {}, 'foo' as any)).toThrow(/callback/)
      finished(
        rs,
        null as any,
        mustCall(() => {
          resolve()
        }) as (...args: unknown[]) => void
      )
      rs.push(null)
      rs.resume()
    }))

  it('calling returned function removes listeners for writable', () =>
    new Promise<void>(resolve => {
      const ws = new Writable({
        write(_data, _env, cb) {
          cb()
        }
      })
      const removeListener = finished(ws, mustNotCall() as (...args: unknown[]) => void)
      removeListener()
      ws.end()
      setTimeout(resolve, 50)
    }))

  it('calling returned function removes listeners for readable', () =>
    new Promise<void>(resolve => {
      const rs = new Readable()
      const removeListeners = finished(rs, mustNotCall() as (...args: unknown[]) => void)
      removeListeners()
      rs.emit('close')
      rs.push(null)
      rs.resume()
      setTimeout(resolve, 50)
    }))

  it('streamLike with readableEnded throws ERR_INVALID_ARG_TYPE', () => {
    const streamLike = new EE() as EE & { readableEnded: boolean; readable: boolean }
    streamLike.readableEnded = true
    streamLike.readable = true
    expect(() => {
      finished(streamLike as any, () => {})
    }).toThrow()
    streamLike.emit('close')
  })

  it('writable with writable false and destroy triggers premature close', () =>
    new Promise<void>(resolve => {
      const writable = new Writable({
        write() {}
      })
      ;(writable as any).writable = false
      writable.destroy()
      finished(
        writable,
        mustCall((err: Error & { code?: string }) => {
          expect(err.code).toBe('ERR_STREAM_PREMATURE_CLOSE')
          resolve()
        }) as (...args: unknown[]) => void
      )
    }))

  it('readable with readable false and destroy triggers premature close', () =>
    new Promise<void>(resolve => {
      const readable = new Readable()
      ;(readable as any).readable = false
      readable.destroy()
      finished(
        readable,
        mustCall((err: Error & { code?: string }) => {
          expect(err.code).toBe('ERR_STREAM_PREMATURE_CLOSE')
          resolve()
        }) as (...args: unknown[]) => void
      )
    }))

  it('writable end then destroy triggers premature close', () =>
    new Promise<void>(resolve => {
      const w = new Writable({
        write(_chunk, _encoding, callback) {
          setImmediate(callback)
        }
      })
      finished(
        w,
        mustCall((err: Error & { code?: string }) => {
          expect(err.code).toBe('ERR_STREAM_PREMATURE_CLOSE')
          resolve()
        }) as (...args: unknown[]) => void
      )
      w.end('asd')
      w.destroy()
    }))

  describe('testClosed for Readable', () => {
    const factory = (opts?: Record<string, unknown>) =>
      new Readable({
        ...opts
      })

    it('already destroyed but finished cancelled in same tick', () => {
      const s = factory()
      s.destroy()
      const dispose = finished(s, mustNotCall() as (...args: unknown[]) => void)
      dispose()
    })

    it('already destroyed invokes callback', () =>
      new Promise<void>(resolve => {
        const s = factory()
        s.destroy()
        finished(
          s,
          mustCall(() => {
            resolve()
          }) as (...args: unknown[]) => void
        )
      }))

    it('do not invoke until destroy has completed', () =>
      new Promise<void>(resolve => {
        let destroyed = false
        const s = factory({
          destroy(_err: Error | null, cb: () => void) {
            setImmediate(() => {
              destroyed = true
              cb()
            })
          }
        })
        s.destroy()
        finished(
          s,
          mustCall(() => {
            expect(destroyed).toBe(true)
            resolve()
          }) as (...args: unknown[]) => void
        )
      }))

    it('invoke callback even if close is inhibited', () =>
      new Promise<void>(resolve => {
        const s = factory({
          emitClose: false,
          destroy(_err: Error | null, cb: () => void) {
            cb()
            finished(
              s,
              mustCall(() => {
                resolve()
              }) as (...args: unknown[]) => void
            )
          }
        })
        s.destroy()
      }))

    it('invoke with deep async', () =>
      new Promise<void>(resolve => {
        const s = factory({
          destroy(_err: Error | null, cb: () => void) {
            setImmediate(() => {
              cb()
              setImmediate(() => {
                finished(
                  s,
                  mustCall(() => {
                    resolve()
                  }) as (...args: unknown[]) => void
                )
              })
            })
          }
        })
        s.destroy()
      }))
  })

  describe('testClosed for Writable', () => {
    const factory = (opts?: Record<string, unknown>) =>
      new Writable({
        write() {},
        ...opts
      })

    it('already destroyed but finished cancelled in same tick', () => {
      const s = factory()
      s.destroy()
      const dispose = finished(s, mustNotCall() as (...args: unknown[]) => void)
      dispose()
    })

    it('already destroyed invokes callback', () =>
      new Promise<void>(resolve => {
        const s = factory()
        s.destroy()
        finished(
          s,
          mustCall(() => {
            resolve()
          }) as (...args: unknown[]) => void
        )
      }))

    it('do not invoke until destroy has completed', () =>
      new Promise<void>(resolve => {
        let destroyed = false
        const s = factory({
          destroy(_err: Error | null, cb: () => void) {
            setImmediate(() => {
              destroyed = true
              cb()
            })
          }
        })
        s.destroy()
        finished(
          s,
          mustCall(() => {
            expect(destroyed).toBe(true)
            resolve()
          }) as (...args: unknown[]) => void
        )
      }))

    it('invoke callback even if close is inhibited', () =>
      new Promise<void>(resolve => {
        const s = factory({
          emitClose: false,
          destroy(_err: Error | null, cb: () => void) {
            cb()
            finished(
              s,
              mustCall(() => {
                resolve()
              }) as (...args: unknown[]) => void
            )
          }
        })
        s.destroy()
      }))

    it('invoke with deep async', () =>
      new Promise<void>(resolve => {
        const s = factory({
          destroy(_err: Error | null, cb: () => void) {
            setImmediate(() => {
              cb()
              setImmediate(() => {
                finished(
                  s,
                  mustCall(() => {
                    resolve()
                  }) as (...args: unknown[]) => void
                )
              })
            })
          }
        })
        s.destroy()
      }))
  })

  it('writable end with autoDestroy false then finished', () =>
    new Promise<void>(resolve => {
      const w = new Writable({
        write(_chunk, _encoding, cb) {
          cb()
        },
        // @ts-ignore - autoDestroy exists at runtime
        autoDestroy: false
      })
      w.end('asd')
      process.nextTick(() => {
        finished(
          w,
          mustCall(() => {
            resolve()
          }) as (...args: unknown[]) => void
        )
      })
    }))

  it('writable write error with autoDestroy false then finished', () =>
    new Promise<void>(resolve => {
      const w = new Writable({
        write(_chunk, _encoding, cb) {
          cb(new Error())
        },
        // @ts-ignore - autoDestroy exists at runtime
        autoDestroy: false
      })
      w.write('asd')
      w.on(
        'error',
        mustCall(() => {
          finished(
            w,
            mustCall(() => {
              resolve()
            }) as (...args: unknown[]) => void
          )
        }) as (...args: unknown[]) => void
      )
    }))

  it('readable end with autoDestroy false then finished', () =>
    new Promise<void>(resolve => {
      const r = new Readable({
        // @ts-ignore - autoDestroy exists at runtime
        autoDestroy: false
      })
      r.push(null)
      r.resume()
      r.on(
        'end',
        mustCall(() => {
          finished(
            r,
            mustCall(() => {
              resolve()
            }) as (...args: unknown[]) => void
          )
        }) as (...args: unknown[]) => void
      )
    }))

  it('EE with _writableState finished and errored emits premature close', () =>
    new Promise<void>(resolve => {
      const d = new EE() as EE & { _writableState: Record<string, unknown> }
      ;(d as any)._writableState = {}
      ;(d as any)._writableState.finished = true
      finished(
        d as any,
        {
          readable: false,
          writable: true
        },
        mustCall((err: Error & { code?: string }) => {
          expect(err.code).toBe('ERR_STREAM_PREMATURE_CLOSE')
          resolve()
        }) as (...args: unknown[]) => void
      )
      ;(d as any)._writableState.errored = true
      d.emit('close')
    }))

  it('readable push then destroy triggers premature close', () =>
    new Promise<void>(resolve => {
      const r = new Readable()
      finished(
        r,
        mustCall((err: Error & { code?: string }) => {
          expect(err.code).toBe('ERR_STREAM_PREMATURE_CLOSE')
          resolve()
        }) as (...args: unknown[]) => void
      )
      r.push('asd')
      r.push(null)
      r.destroy()
    }))

  it('duplex with readable only option', () =>
    new Promise<void>(resolve => {
      const d = new Duplex({
        final(_cb) {},
        read() {
          this.push(null)
        }
      })
      d.on('end', mustCall() as (...args: unknown[]) => void)
      finished(
        d,
        {
          readable: true,
          writable: false
        },
        mustCall(() => {
          resolve()
        }) as (...args: unknown[]) => void
      )
      d.end()
      d.resume()
    }))

  it('duplex end then finished with readable only option', () =>
    new Promise<void>(resolve => {
      const d = new Duplex({
        final(_cb) {},
        read() {
          this.push(null)
        }
      })
      d.on('end', mustCall() as (...args: unknown[]) => void)
      d.end()
      finished(
        d,
        {
          readable: true,
          writable: false
        },
        mustCall(() => {
          resolve()
        }) as (...args: unknown[]) => void
      )
      d.resume()
    }))

  it('compat for fd-slicer non standard destroy behavior', () =>
    new Promise<void>(resolve => {
      const r = new Readable()
      finished(
        r,
        mustCall(() => {
          resolve()
        }) as (...args: unknown[]) => void
      )
      r.resume()
      r.push('asd')
      r.destroyed = true
      r.push(null)
    }))

  it('regression for node issue 33130', () =>
    new Promise<void>(resolve => {
      const response = new PassThrough()
      class HelloWorld extends Duplex {
        response: PassThrough
        readMore: boolean
        constructor(response: PassThrough) {
          super({
            // @ts-ignore - autoDestroy exists at runtime
            autoDestroy: false
          })
          this.response = response
          this.readMore = false
          response.once('end', () => {
            this.push(null)
          })
          response.on('readable', () => {
            if (this.readMore) {
              this._read()
            }
          })
        }
        _read() {
          const { response } = this
          this.readMore = true
          if (response.readableLength) {
            this.readMore = false
          }
          let data
          while ((data = response.read()) !== null) {
            this.push(data)
          }
        }
      }
      const instance = new HelloWorld(response)
      instance.setEncoding('utf8')
      instance.end()
      ;(async () => {
        await EE.once(instance, 'finish')
        setImmediate(() => {
          response.write('chunk 1')
          response.write('chunk 2')
          response.write('chunk 3')
          response.end()
        })
        let res = ''
        for await (const data of instance) {
          res += data
        }
        expect(res).toBe('chunk 1chunk 2chunk 3')
      })().then(
        mustCall(() => {
          resolve()
        }) as () => void
      )
    }))

  it('passthrough end should not call finished callback', () => {
    const p = new PassThrough()
    p.end()
    finished(p, mustNotCall() as (...args: unknown[]) => void)
  })

  it('passthrough end then finish event should not call finished callback', () =>
    new Promise<void>(resolve => {
      const p = new PassThrough()
      p.end()
      p.on(
        'finish',
        mustCall(() => {
          finished(p, mustNotCall() as (...args: unknown[]) => void)
          setTimeout(resolve, 50)
        }) as (...args: unknown[]) => void
      )
    }))

  it('writable with aborted property', () =>
    new Promise<void>(resolve => {
      const w = new Writable({
        write(_chunk, _encoding, callback) {
          process.nextTick(callback)
        }
      })
      ;(w as any).aborted = false
      w.end()
      let closed = false
      w.on('finish', () => {
        expect(closed).toBe(false)
        w.emit('aborted')
      })
      w.on(
        'close',
        mustCall(() => {
          closed = true
        }) as (...args: unknown[]) => void
      )
      finished(
        w,
        mustCall(() => {
          expect(closed).toBe(true)
          resolve()
        }) as (...args: unknown[]) => void
      )
    }))

  it('writable destroyed with error then finished', () =>
    new Promise<void>(resolve => {
      const w = new Writable()
      const _err = new Error()
      w.destroy(_err)
      expect(w.errored).toBe(_err)
      finished(
        w,
        mustCall((err: Error) => {
          expect(_err).toBe(err)
          expect((w as any).closed).toBe(true)
          finished(
            w,
            mustCall((err2: Error) => {
              expect(_err).toBe(err2)
              resolve()
            }) as (...args: unknown[]) => void
          )
        }) as (...args: unknown[]) => void
      )
    }))

  it('writable destroyed without error then finished', () =>
    new Promise<void>(resolve => {
      const w = new Writable()
      w.destroy()
      expect(w.errored).toBe(null)
      finished(
        w,
        mustCall((err: Error & { code?: string }) => {
          expect((w as any).closed).toBe(true)
          expect(err.code).toBe('ERR_STREAM_PREMATURE_CLOSE')
          finished(
            w,
            mustCall((err2: Error & { code?: string }) => {
              expect(err2.code).toBe('ERR_STREAM_PREMATURE_CLOSE')
              resolve()
            }) as (...args: unknown[]) => void
          )
        }) as (...args: unknown[]) => void
      )
    }))

  it('legacy streams do not auto close', () => {
    const s = new Stream()
    finished(s, mustNotCall() as (...args: unknown[]) => void)
  })

  it('duplex end with readable false option', () =>
    new Promise<void>(resolve => {
      const stream = new Duplex({
        write(_chunk, _enc, cb) {
          setImmediate(cb)
        }
      })
      stream.end('foo')
      finished(
        stream,
        {
          readable: false
        },
        mustCall((err: Error | null) => {
          expect(!err).toBeTruthy()
          resolve()
        }) as (...args: unknown[]) => void
      )
    }))
})
