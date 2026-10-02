/**
 * SPIKE (#36): drives a dedicated build Worker that runs rolldown, for measurements.
 */

let worker = null
let seq = 0
const pending = new Map()

function request(type, payload) {
  const id = ++seq
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject })
    worker.postMessage({ id, type, payload })
  })
}

window.spike = {
  async createWorker() {
    const start = performance.now()
    worker = new Worker(new URL('./build-worker.js', import.meta.url), { type: 'module' })
    const ready = await new Promise((resolve, reject) => {
      worker.onmessage = e => {
        if (e.data?.type === 'ready') {
          resolve(e.data)
        }
      }
      worker.onerror = e => reject(new Error(e.message || 'worker error'))
    })
    const readyIn = performance.now() - start
    worker.onmessage = e => {
      const { id, ok, result, error } = e.data
      const entry = pending.get(id)
      if (!entry) {
        return
      }
      pending.delete(id)
      if (ok) {
        entry.resolve(result)
      } else {
        entry.reject(new Error(error))
      }
    }
    return { readyIn, version: ready.version, workerReadyAt: ready.at }
  },
  build(payload) {
    const start = performance.now()
    return request('build', payload).then(result => ({
      ...result,
      roundTrip: performance.now() - start
    }))
  },
  terminate() {
    worker?.terminate()
    worker = null
  },
  async measureMemory() {
    if (typeof performance.measureUserAgentSpecificMemory !== 'function') {
      return { unsupported: true, crossOriginIsolated: self.crossOriginIsolated }
    }
    let result
    try {
      result = await performance.measureUserAgentSpecificMemory()
    } catch (error) {
      return { error: String(error), crossOriginIsolated: self.crossOriginIsolated }
    }
    return {
      bytes: result.bytes,
      breakdown: result.breakdown
        .filter(entry => entry.bytes > 0)
        .map(entry => ({
          bytes: entry.bytes,
          types: entry.types,
          scopes: entry.attribution.map(a => `${a.scope}:${(a.url || '').split('/').pop()}`)
        }))
    }
  }
}

document.getElementById('status').textContent = 'ready'
