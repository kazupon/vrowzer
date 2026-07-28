/**
 * perf_hooks browser tests
 *
 * Based on Node.js test files in https://github.com/nodejs/node/tree/main/test/parallel
 * - test-performance-global.js
 * - test-perf-hooks-usertiming.js
 * - test-performance-measure.js
 * - test-performanceobserver.js
 * - test-perf-hooks-histogram.js
 * - test-perf-hooks-eventlooputilization.js
 * - test-perf-hooks-timerify-basic.js
 */

import { describe, expect, it } from 'vite-plus/test'
import {
  PerformanceEntry,
  PerformanceMark,
  PerformanceMeasure,
  PerformanceObserver,
  PerformanceObserverEntryList,
  PerformanceResourceTiming,
  constants,
  createHistogram,
  eventLoopUtilization,
  monitorEventLoopDelay,
  performance,
  timerify
} from './perf_hooks.ts'

describe('re-exports', () => {
  it('performance should be globalThis.performance', () => {
    expect(performance).toBe(globalThis.performance)
  })

  it('PerformanceEntry should be globalThis.PerformanceEntry', () => {
    expect(PerformanceEntry).toBe(globalThis.PerformanceEntry)
  })

  it('PerformanceMark should be globalThis.PerformanceMark', () => {
    expect(PerformanceMark).toBe(globalThis.PerformanceMark)
  })

  it('PerformanceMeasure should be globalThis.PerformanceMeasure', () => {
    expect(PerformanceMeasure).toBe(globalThis.PerformanceMeasure)
  })

  it('PerformanceObserver should be globalThis.PerformanceObserver', () => {
    expect(PerformanceObserver).toBe(globalThis.PerformanceObserver)
  })

  it('PerformanceObserverEntryList should be globalThis.PerformanceObserverEntryList', () => {
    expect(PerformanceObserverEntryList).toBe(globalThis.PerformanceObserverEntryList)
  })

  it('PerformanceResourceTiming should be globalThis.PerformanceResourceTiming', () => {
    expect(PerformanceResourceTiming).toBe(globalThis.PerformanceResourceTiming)
  })
})

// ---------------------------------------------------------------------------
// performance.now()
// ---------------------------------------------------------------------------

describe('performance.now()', () => {
  it('should return a number', () => {
    expect(typeof performance.now()).toBe('number')
  })

  it('should return increasing values', () => {
    const a = performance.now()
    const b = performance.now()
    expect(b).toBeGreaterThanOrEqual(a)
  })
})

describe('performance.mark / measure', () => {
  it('should create a mark', () => {
    const mark = performance.mark('test-mark')
    expect(mark.name).toBe('test-mark')
    expect(mark.entryType).toBe('mark')
    performance.clearMarks('test-mark')
  })

  it('should create a measure between marks', () => {
    performance.mark('start-mark')
    performance.mark('end-mark')
    const measure = performance.measure('test-measure', 'start-mark', 'end-mark')
    expect(measure.name).toBe('test-measure')
    expect(measure.entryType).toBe('measure')
    expect(typeof measure.duration).toBe('number')
    performance.clearMarks()
    performance.clearMeasures()
  })

  it('should clear marks', () => {
    performance.mark('clear-test')
    performance.clearMarks('clear-test')
    const entries = performance.getEntriesByName('clear-test')
    expect(entries).toHaveLength(0)
  })
})

describe('PerformanceObserver', () => {
  it('should be constructable', () => {
    const observer = new PerformanceObserver(() => {})
    expect(observer).toBeInstanceOf(PerformanceObserver)
    observer.disconnect()
  })

  it('should observe mark entries', async () => {
    const entries: PerformanceEntryList = []

    await new Promise<void>(resolve => {
      const observer = new PerformanceObserver(list => {
        entries.push(...list.getEntries())
        observer.disconnect()
        resolve()
      })
      observer.observe({ entryTypes: ['mark'] })
      performance.mark('observed-mark')
    })

    expect(entries.length).toBeGreaterThanOrEqual(1)
    const found = entries.find(e => e.name === 'observed-mark')
    expect(found).toBeDefined()
    performance.clearMarks('observed-mark')
  })
})

describe('monitorEventLoopDelay stub', () => {
  it('should return a histogram-like object', () => {
    const h = monitorEventLoopDelay()
    expect(typeof h.enable).toBe('function')
    expect(typeof h.disable).toBe('function')
    expect(typeof h.reset).toBe('function')
    expect(typeof h.percentile).toBe('function')
  })

  it('should not throw on enable/disable/reset', () => {
    const h = monitorEventLoopDelay()
    expect(() => h.enable()).not.toThrow()
    expect(() => h.disable()).not.toThrow()
    expect(() => h.reset()).not.toThrow()
  })

  it('should return 0 for all numeric properties', () => {
    const h = monitorEventLoopDelay()
    expect(h.min).toBe(0)
    expect(h.max).toBe(0)
    expect(h.mean).toBe(0)
    expect(h.stddev).toBe(0)
    expect(h.exceeds).toBe(0)
  })

  it('should return 0 for percentile()', () => {
    const h = monitorEventLoopDelay()
    expect(h.percentile(50)).toBe(0)
    expect(h.percentile(99)).toBe(0)
  })

  it('should return an empty Map for percentiles', () => {
    const h = monitorEventLoopDelay()
    expect(h.percentiles).toBeInstanceOf(Map)
    expect(h.percentiles.size).toBe(0)
  })

  it('should accept options', () => {
    expect(() => monitorEventLoopDelay({ resolution: 10 })).not.toThrow()
  })
})

describe('createHistogram stub', () => {
  it('should return a histogram-like object', () => {
    const h = createHistogram()
    expect(typeof h.record).toBe('function')
    expect(typeof h.recordDelta).toBe('function')
    expect(typeof h.reset).toBe('function')
  })

  it('should not throw on record()', () => {
    const h = createHistogram()
    expect(() => h.record(1)).not.toThrow()
    expect(() => h.record(100)).not.toThrow()
  })

  it('should return 0 for all numeric properties', () => {
    const h = createHistogram()
    expect(h.min).toBe(0)
    expect(h.max).toBe(0)
    expect(h.mean).toBe(0)
    expect(h.stddev).toBe(0)
  })

  it('should accept options', () => {
    expect(() => createHistogram({ lowest: 1, highest: 100, figures: 3 })).not.toThrow()
  })
})

describe('eventLoopUtilization stub', () => {
  it('should return an object with idle, active, utilization', () => {
    const elu = eventLoopUtilization()
    expect(elu).toEqual({ idle: 0, active: 0, utilization: 0 })
  })

  it('should return numbers for all properties', () => {
    const elu = eventLoopUtilization()
    expect(typeof elu.idle).toBe('number')
    expect(typeof elu.active).toBe('number')
    expect(typeof elu.utilization).toBe('number')
  })
})

describe('timerify stub', () => {
  it('should return the same function', () => {
    const fn = () => 42
    const wrapped = timerify(fn)
    expect(wrapped).toBe(fn)
  })

  it('should preserve function return value', () => {
    const fn = (a: number, b: number) => a + b
    const wrapped = timerify(fn)
    expect(wrapped(1, 2)).toBe(3)
  })
})

describe('constants stub', () => {
  it('should be a frozen object', () => {
    expect(Object.isFrozen(constants)).toBe(true)
  })

  it('should be an empty object', () => {
    expect(Object.keys(constants)).toHaveLength(0)
  })
})
