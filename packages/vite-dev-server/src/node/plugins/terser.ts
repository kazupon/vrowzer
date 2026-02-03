import type {
  TerserMinifyOptions
} from '#types/internal/terserOptions'

export interface TerserOptions extends TerserMinifyOptions {
  /**
   * Vite-specific option to specify the max number of workers to spawn
   * when minifying files with terser.
   *
   * @default number of CPUs minus 1
   */
  maxWorkers?: number
}

// TODO: fill in codes ...
