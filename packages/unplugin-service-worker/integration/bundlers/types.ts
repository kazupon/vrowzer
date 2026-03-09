export interface BuildResult {
  success: boolean
  error?: Error
}

export interface BundlerConfig {
  name: string
  build: (playgroundDir: string, outputDir: string) => Promise<BuildResult>
}
