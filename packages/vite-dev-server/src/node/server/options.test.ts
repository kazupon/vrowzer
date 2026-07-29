import { describe, expect, it } from 'vite-plus/test'
import { serverConfigDefaults } from './options'

describe('serverConfigDefaults', () => {
  it('denies common sensitive files by default', () => {
    expect(serverConfigDefaults.fs.deny).toEqual([
      '.env',
      '.env.*',
      '*.{crt,pem,key,p12,pfx,cer,der}',
      '.npmrc',
      '.yarnrc.yml',
      '**/.git/**',
    ])
  })
})
