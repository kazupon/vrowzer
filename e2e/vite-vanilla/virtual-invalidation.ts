import type { Plugin } from 'vite-plus'

export default function virtualInvalidationPlugin(): Plugin {
  const publicId = 'virtual:invalidation'
  return {
    name: 'test:virtual-invalidation',
    resolveId(id) {
      if (id === publicId || id.startsWith(`${publicId}?`)) {
        return `\0${id}`
      }
    },
    load(id) {
      if (id === `\0${publicId}` || id.startsWith(`\0${publicId}?`)) {
        return `
import { value } from '/virtual-invalidation-dep.js'
export { value }
if (import.meta.hot) {
  import.meta.hot.accept(() => import.meta.hot.invalidate())
}
`
      }
    }
  }
}
