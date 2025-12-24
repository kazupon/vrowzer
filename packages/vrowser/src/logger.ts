import { createConsola } from 'consola/browser'

export function createLogger(namespace: string) {
  const logger = createConsola({
    level: 4,
    defaults: {
      tag: namespace
    }
  })
  return logger
}
