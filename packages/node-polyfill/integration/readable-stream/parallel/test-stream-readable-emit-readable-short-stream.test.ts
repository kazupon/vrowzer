import { describe, it, expect } from 'vitest'
import { mustCall } from '../common/index.ts'
import { Readable, Transform } from 'readable-stream'

describe('test-stream-readable-emit-readable-short-stream', () => {
  it('readable pipe transform with read/transform/flush', () =>
    new Promise<void>(resolve => {
      const r = new Readable({
        read: mustCall(function (this: Readable) {
          this.push('content')
          this.push(null)
        }) as () => void
      })
      const t = new Transform({
        transform: mustCall(function (
          this: Transform,
          chunk: Buffer,
          _encoding: string,
          callback: Function
        ) {
          this.push(chunk)
          return callback()
        }) as (chunk: Buffer, encoding: string, callback: Function) => void,
        flush: mustCall(function (callback: Function) {
          return callback()
        }) as (callback: Function) => void
      })
      r.pipe(t)
      t.on(
        'readable',
        mustCall(function () {
          while (true) {
            const chunk = t.read()
            if (!chunk) break
            expect(chunk.toString()).toBe('content')
          }
        }, 2) as (...args: unknown[]) => void
      )
      t.on(
        'end',
        mustCall(() => {
          resolve()
        }) as (...args: unknown[]) => void
      )
    }))

  it('transform end with content', () =>
    new Promise<void>(resolve => {
      const t = new Transform({
        transform: mustCall(function (
          this: Transform,
          chunk: Buffer,
          _encoding: string,
          callback: Function
        ) {
          this.push(chunk)
          return callback()
        }) as (chunk: Buffer, encoding: string, callback: Function) => void,
        flush: mustCall(function (callback: Function) {
          return callback()
        }) as (callback: Function) => void
      })
      t.end('content')
      t.on(
        'readable',
        mustCall(function () {
          while (true) {
            const chunk = t.read()
            if (!chunk) break
            expect(chunk.toString()).toBe('content')
          }
        }) as (...args: unknown[]) => void
      )
      t.on(
        'end',
        mustCall(() => {
          resolve()
        }) as (...args: unknown[]) => void
      )
    }))

  it('transform write then end', () =>
    new Promise<void>(resolve => {
      const t = new Transform({
        transform: mustCall(function (
          this: Transform,
          chunk: Buffer,
          _encoding: string,
          callback: Function
        ) {
          this.push(chunk)
          return callback()
        }) as (chunk: Buffer, encoding: string, callback: Function) => void,
        flush: mustCall(function (callback: Function) {
          return callback()
        }) as (callback: Function) => void
      })
      t.write('content')
      t.end()
      t.on(
        'readable',
        mustCall(function () {
          while (true) {
            const chunk = t.read()
            if (!chunk) break
            expect(chunk.toString()).toBe('content')
          }
        }) as (...args: unknown[]) => void
      )
      t.on(
        'end',
        mustCall(() => {
          resolve()
        }) as (...args: unknown[]) => void
      )
    }))

  it('readable push content then null sync', () =>
    new Promise<void>(resolve => {
      const t = new Readable({
        read() {}
      })
      t.on(
        'readable',
        mustCall(function () {
          while (true) {
            const chunk = t.read()
            if (!chunk) break
            expect(chunk.toString()).toBe('content')
          }
        }) as (...args: unknown[]) => void
      )
      t.push('content')
      t.push(null)
      t.on(
        'end',
        mustCall(() => {
          resolve()
        }) as (...args: unknown[]) => void
      )
    }))

  it('readable push content then null async via nextTick', () =>
    new Promise<void>(resolve => {
      const t = new Readable({
        read() {}
      })
      t.on(
        'readable',
        mustCall(function () {
          while (true) {
            const chunk = t.read()
            if (!chunk) break
            expect(chunk.toString()).toBe('content')
          }
        }, 2) as (...args: unknown[]) => void
      )
      process.nextTick(() => {
        t.push('content')
        t.push(null)
      })
      t.on(
        'end',
        mustCall(() => {
          resolve()
        }) as (...args: unknown[]) => void
      )
    }))

  it('transform write then end with readable listener', () =>
    new Promise<void>(resolve => {
      const t = new Transform({
        transform: mustCall(function (
          this: Transform,
          chunk: Buffer,
          _encoding: string,
          callback: Function
        ) {
          this.push(chunk)
          return callback()
        }) as (chunk: Buffer, encoding: string, callback: Function) => void,
        flush: mustCall(function (callback: Function) {
          return callback()
        }) as (callback: Function) => void
      })
      t.on(
        'readable',
        mustCall(function () {
          while (true) {
            const chunk = t.read()
            if (!chunk) break
            expect(chunk.toString()).toBe('content')
          }
        }, 2) as (...args: unknown[]) => void
      )
      t.write('content')
      t.end()
      t.on(
        'end',
        mustCall(() => {
          resolve()
        }) as (...args: unknown[]) => void
      )
    }))
})
