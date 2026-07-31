import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import type { ResolvedConfig } from '../config'
import { expandGlobIds } from './resolve'

vi.mock('../idResolver', () => ({
  createBackCompatIdResolver() {
    throw new Error('id resolver is not used by expandGlobIds')
  },
}))

let root: string

function createConfig(): ResolvedConfig {
  return {
    packageCache: new Map(),
    resolve: { preserveSymlinks: false },
    root,
  } as unknown as ResolvedConfig
}

beforeEach(() => {
  root = fs.realpathSync(
    fs.mkdtempSync(path.join(os.tmpdir(), 'vrowzer-optimizer-resolve-')),
  )
  const packageDir = path.join(root, 'node_modules/my-pkg')
  const distDir = path.join(packageDir, 'dist')
  fs.mkdirSync(distDir, { recursive: true })
  fs.writeFileSync(
    path.join(packageDir, 'package.json'),
    `${JSON.stringify(
      {
        name: 'my-pkg',
        exports: {
          '.': './dist/index.js',
          './utils': './dist/utils.js',
          './private': null,
          './also-private': null,
          './public': './dist/public.js',
        },
      },
      undefined,
      2,
    )}\n`,
  )
  for (const file of ['index.js', 'utils.js', 'public.js']) {
    fs.writeFileSync(path.join(distDir, file), '')
  }
})

afterEach(() => {
  fs.rmSync(root, { force: true, recursive: true })
})

describe('expandGlobIds', () => {
  it('skips null-valued exports', () => {
    const result = expandGlobIds('my-pkg/*', createConfig())

    expect(result).toContain('my-pkg')
    expect(result).toContain('my-pkg/utils')
    expect(result).toContain('my-pkg/public')
    expect(result).not.toContain('my-pkg/private')
    expect(result).not.toContain('my-pkg/also-private')
  })
})
