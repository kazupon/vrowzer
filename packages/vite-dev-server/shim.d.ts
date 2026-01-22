/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

declare global {
  interface Window {
    testState: {
      swRegistration: ServiceWorkerRegistration | null
      swController: ServiceWorker | null
      fetchResults: Array<{ ok: boolean; status: number; headers: Record<string, string>; body: string }>
      errors: Array<Error>
      ready: boolean
    }
  }
}
export {}
