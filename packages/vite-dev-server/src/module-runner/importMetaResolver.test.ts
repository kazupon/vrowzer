import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test'

beforeEach(() => {
  vi.resetModules()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('createImportMetaResolver', () => {
  it('registers a synchronous customization hook only once', async () => {
    const registerHooks = vi.fn<(options: unknown) => void>()
    vi.spyOn(process, 'getBuiltinModule').mockReturnValue({
      Module: { registerHooks },
    } as never)
    const { createImportMetaResolver } = await import('./importMetaResolver')

    const firstResolver = createImportMetaResolver()
    const secondResolver = createImportMetaResolver()

    expect(firstResolver).toBeTypeOf('function')
    expect(secondResolver).toBe(firstResolver)
    expect(registerHooks).toHaveBeenCalledTimes(1)
    expect(registerHooks).toHaveBeenCalledWith({
      resolve: expect.any(Function),
    })
  })

  it('registers an asynchronous customization hook only once', async () => {
    const register = vi.fn<(specifier: string) => void>()
    vi.spyOn(process, 'getBuiltinModule').mockReturnValue({
      Module: { register },
    } as never)
    const { createImportMetaResolver } = await import('./importMetaResolver')

    const firstResolver = createImportMetaResolver()
    const secondResolver = createImportMetaResolver()

    expect(firstResolver).toBeTypeOf('function')
    expect(secondResolver).toBe(firstResolver)
    expect(register).toHaveBeenCalledTimes(1)
    expect(register).toHaveBeenCalledWith(expect.stringMatching(/^data:/))
  })
})
