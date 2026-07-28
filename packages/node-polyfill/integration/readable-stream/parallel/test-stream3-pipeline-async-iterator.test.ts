import { describe, it, expect } from 'vite-plus/test'
// @ts-ignore -- internal path
import { pipeline } from 'readable-stream/lib/stream/promises'

describe('test-stream3-pipeline-async-iterator', () => {
  it('async iterators can act as readable and writable streams', async () => {
    async function* myCustomReadable() {
      yield 'Hello'
      yield 'World'
    }
    const messages: string[] = []
    async function* myCustomWritable(stream: AsyncIterable<string>) {
      for await (const chunk of stream) {
        messages.push(chunk)
      }
    }
    await pipeline(myCustomReadable, myCustomWritable)
    expect(messages).toEqual(['Hello', 'World'])
  })
})
