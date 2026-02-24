/**
 * `node:perf_hooks` compatible entry point
 *
 * Browser-native Performance APIs are re-exported directly.
 * Node.js-specific APIs (monitorEventLoopDelay, createHistogram,
 * eventLoopUtilization, timerify) are provided as noop stubs.
 *
 * @module perf_hooks
 */

/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

export const performance = globalThis.performance

export const PerformanceEntry = globalThis.PerformanceEntry
export const PerformanceMark = globalThis.PerformanceMark
export const PerformanceMeasure = globalThis.PerformanceMeasure
export const PerformanceObserver = globalThis.PerformanceObserver
export const PerformanceObserverEntryList = globalThis.PerformanceObserverEntryList
export const PerformanceResourceTiming = globalThis.PerformanceResourceTiming

interface Histogram {
  enable(): void
  disable(): void
  reset(): void
  record(val: number): void
  recordDelta(): void
  readonly min: number
  readonly max: number
  readonly mean: number
  readonly exceeds: number
  readonly stddev: number
  percentile(pct: number): number
  readonly percentiles: Map<number, number>
}

function createNoopHistogram(): Histogram {
  return {
    enable() {},
    disable() {},
    reset() {},
    record(_val: number) {},
    recordDelta() {},
    get min() {
      return 0
    },
    get max() {
      return 0
    },
    get mean() {
      return 0
    },
    get exceeds() {
      return 0
    },
    get stddev() {
      return 0
    },
    percentile(_pct: number) {
      return 0
    },
    get percentiles() {
      return new Map<number, number>()
    }
  }
}

/**
 * Stub for `monitorEventLoopDelay`.
 * Returns a no-op histogram object with `enable()`, `disable()`, etc.
 */
export function monitorEventLoopDelay(_options?: { resolution?: number }): Histogram {
  return createNoopHistogram()
}

/**
 * Stub for `createHistogram`.
 * Returns a no-op histogram object.
 */
export function createHistogram(_options?: {
  lowest?: number
  highest?: number
  figures?: number
}): Histogram {
  return createNoopHistogram()
}

/**
 * Stub for `eventLoopUtilization`.
 * Returns zeroed utilization metrics.
 */
export function eventLoopUtilization(): {
  idle: number
  active: number
  utilization: number
} {
  return { idle: 0, active: 0, utilization: 0 }
}

/**
 * Stub for `timerify`.
 * Returns the function as-is without wrapping.
 */
export function timerify<T extends Function>(fn: T): T {
  return fn
}

/**
 * Stub for perf_hooks constants.
 */
export const constants = Object.freeze({})

export default {
  performance,
  PerformanceEntry,
  PerformanceMark,
  PerformanceMeasure,
  PerformanceObserver,
  PerformanceObserverEntryList,
  PerformanceResourceTiming,
  monitorEventLoopDelay,
  createHistogram,
  eventLoopUtilization,
  timerify,
  constants
}
