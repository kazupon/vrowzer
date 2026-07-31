import type { ModuleRunnerImportMeta } from '../types'

type Expect<T extends true> = T
type IsAssignable<From, To> = From extends To ? true : false

// The root tsconfig also loads Bun-specific ImportMeta augmentations.
type SupportedImportMeta = Pick<
  ImportMeta,
  'url' | 'dirname' | 'filename' | 'resolve'
>

export type cases = [
  Expect<IsAssignable<ModuleRunnerImportMeta, SupportedImportMeta>>,
]
