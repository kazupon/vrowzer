import { afterEach, describe, expect, test, vi } from 'vite-plus/test'
import { Vrowzer } from './index.ts'

import type { PreviewLoadErrorInfo } from './index.ts'

const HOST_ORIGIN = 'https://host.test'
const TOKEN_1 = '00000000-0000-4000-8000-000000000001'
const TOKEN_2 = '00000000-0000-4000-8000-000000000002'
const TOKEN_3 = '00000000-0000-4000-8000-000000000003'

class TestContainer {
  readonly children: TestIframe[] = []

  appendChild(iframe: TestIframe): TestIframe {
    iframe.parent = this
    this.children.push(iframe)
    return iframe
  }
}

class TestIframe {
  readonly attributes = new Map<string, string>()
  readonly srcdocWrites: string[] = []
  readonly style = { cssText: '' }
  parent: TestContainer | null = null
  // Like a WindowProxy, this stays the same object across srcdoc navigations
  contentWindow: object | null = {}

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value)
  }

  set srcdoc(value: string) {
    this.srcdocWrites.push(value)
  }

  get srcdoc(): string {
    return this.srcdocWrites.at(-1) ?? ''
  }

  remove(): void {
    if (!this.parent) {
      return
    }
    const index = this.parent.children.indexOf(this)
    if (index >= 0) {
      this.parent.children.splice(index, 1)
    }
    this.parent = null
    this.contentWindow = null
  }
}

function assertMessageEventType(type: string): void {
  if (type !== 'message') {
    throw new Error(`Unexpected window event listener: ${type}`)
  }
}

class TestWindow {
  readonly location = { origin: HOST_ORIGIN }
  readonly messageListeners = new Set<(event: MessageEvent) => void>()

  addEventListener(type: string, listener: (event: MessageEvent) => void): void {
    assertMessageEventType(type)
    this.messageListeners.add(listener)
  }

  removeEventListener(type: string, listener: (event: MessageEvent) => void): void {
    assertMessageEventType(type)
    this.messageListeners.delete(listener)
  }

  dispatchMessage(event: { data: unknown; source: unknown; origin?: string }): void {
    const messageEvent = { origin: HOST_ORIGIN, ...event } as unknown as MessageEvent
    for (const listener of this.messageListeners) {
      listener(messageEvent)
    }
  }
}

function setupDocument(): TestWindow {
  vi.stubGlobal('document', {
    createElement(tag: string) {
      expect(tag).toBe('iframe')
      return new TestIframe()
    }
  })
  const testWindow = new TestWindow()
  vi.stubGlobal('window', testWindow)
  return testWindow
}

function stubLoadTokens(): void {
  let count = 0
  vi.spyOn(crypto, 'randomUUID').mockImplementation(() => {
    count++
    return `00000000-0000-4000-8000-${String(count).padStart(12, '0')}`
  })
}

function createContainer(): HTMLElement {
  return new TestContainer() as unknown as HTMLElement
}

function getTestContainer(container: HTMLElement): TestContainer {
  return container as unknown as TestContainer
}

function getTestIframe(iframe: HTMLIFrameElement): TestIframe {
  return iframe as unknown as TestIframe
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('Vrowzer factory', () => {
  test('returns frozen object', () => {
    const vrowzer = Vrowzer()
    expect(Object.isFrozen(vrowzer)).toBe(true)
  })

  test('returns object with all Vrowzer interface methods', () => {
    const vrowzer = Vrowzer()
    expect(vrowzer.ready).toBeTypeOf('function')
    expect(vrowzer.mount).toBeTypeOf('function')
    expect(vrowzer.getSession).toBeTypeOf('function')
    expect(vrowzer.sessions).toBeTypeOf('function')
    expect(vrowzer.reloadPreview).toBeTypeOf('function')
    expect(vrowzer.unmount).toBeTypeOf('function')
    expect(vrowzer.addFile).toBeTypeOf('function')
    expect(vrowzer.updateFile).toBeTypeOf('function')
    expect(vrowzer.deleteFile).toBeTypeOf('function')
  })

  test('returns object with Emittable methods', () => {
    const vrowzer = Vrowzer()
    expect(vrowzer.on).toBeTypeOf('function')
    expect(vrowzer.off).toBeTypeOf('function')
    expect(vrowzer.once).toBeTypeOf('function')
    expect(vrowzer.emit).toBeTypeOf('function')
    expect(vrowzer.dispose).toBeTypeOf('function')
  })
})

describe('Vrowzer preview base path', () => {
  test('gives each instance its own preview base path under basePath', () => {
    const first = Vrowzer()
    const second = Vrowzer()
    const custom = Vrowzer({ basePath: '/app/__preview__' })

    expect(first.previewBasePath).toMatch(/^\/__preview__\/[0-9a-f]{12}\/$/)
    expect(second.previewBasePath).toMatch(/^\/__preview__\/[0-9a-f]{12}\/$/)
    expect(second.previewBasePath).not.toBe(first.previewBasePath)
    expect(custom.previewBasePath).toMatch(/^\/app\/__preview__\/[0-9a-f]{12}\/$/)
  })

  test('keeps the preview base path, which cannot be changed, after dispose()', async () => {
    const vrowzer = Vrowzer()
    const previewBasePath = vrowzer.previewBasePath

    expect(() => {
      ;(vrowzer as { previewBasePath: string }).previewBasePath = '/__preview__/other/'
    }).toThrow(TypeError)
    await vrowzer.dispose()

    expect(vrowzer.previewBasePath).toBe(previewBasePath)
  })

  test('loads the previews from the preview base path', () => {
    setupDocument()
    const vrowzer = Vrowzer()

    const session = vrowzer.mount(createContainer(), { id: 'desktop' })

    expect(getTestIframe(session.iframe).srcdoc).toContain(
      `const previewUrl = ${JSON.stringify(vrowzer.previewBasePath)};`
    )
  })
})

describe('Vrowzer preview sessions', () => {
  test('mounts and returns a frozen preview session', () => {
    setupDocument()
    const container = createContainer()
    const vrowzer = Vrowzer()

    const session = vrowzer.mount(container, { id: 'desktop' })

    expect(Object.isFrozen(session)).toBe(true)
    expect(session.id).toBe('desktop')
    expect(session.container).toBe(container)
    expect(getTestContainer(container).children).toEqual([session.iframe])
    expect(vrowzer.getSession('desktop')).toBe(session)
    expect(vrowzer.sessions()).toEqual([session])
  })

  test('requires a non-empty session id', () => {
    setupDocument()
    const vrowzer = Vrowzer()

    expect(() => vrowzer.mount(createContainer(), { id: '' })).toThrow(
      'mount() requires a non-empty preview session id'
    )
  })

  test('returns an existing session without moving or reloading it', () => {
    setupDocument()
    const firstContainer = createContainer()
    const secondContainer = createContainer()
    const vrowzer = Vrowzer()
    const first = vrowzer.mount(firstContainer, {
      id: 'mobile',
      params: { width: '390' }
    })
    const iframe = getTestIframe(first.iframe)

    const second = vrowzer.mount(secondContainer, {
      id: 'mobile',
      params: { width: '430' }
    })

    expect(second).toBe(first)
    expect(iframe.srcdocWrites).toHaveLength(1)
    expect(getTestContainer(firstContainer).children).toEqual([first.iframe])
    expect(getTestContainer(secondContainer).children).toHaveLength(0)
  })

  test('returns a frozen snapshot of mounted sessions', () => {
    setupDocument()
    const vrowzer = Vrowzer()
    const desktop = vrowzer.mount(createContainer(), { id: 'desktop' })
    const mobile = vrowzer.mount(createContainer(), { id: 'mobile' })

    const snapshot = vrowzer.sessions()

    expect(Object.isFrozen(snapshot)).toBe(true)
    expect(snapshot).toEqual([desktop, mobile])
    expect(vrowzer.sessions()).not.toBe(snapshot)
  })

  test('reloads one session by object or id and all sessions without a target', () => {
    setupDocument()
    const vrowzer = Vrowzer()
    const desktop = vrowzer.mount(createContainer(), { id: 'desktop' })
    const mobile = vrowzer.mount(createContainer(), { id: 'mobile' })
    const desktopIframe = getTestIframe(desktop.iframe)
    const mobileIframe = getTestIframe(mobile.iframe)

    vrowzer.reloadPreview(desktop)
    expect(desktopIframe.srcdocWrites).toHaveLength(2)
    expect(mobileIframe.srcdocWrites).toHaveLength(1)

    vrowzer.reloadPreview('mobile')
    expect(desktopIframe.srcdocWrites).toHaveLength(2)
    expect(mobileIframe.srcdocWrites).toHaveLength(2)

    vrowzer.reloadPreview()
    expect(desktopIframe.srcdocWrites).toHaveLength(3)
    expect(mobileIframe.srcdocWrites).toHaveLength(3)
  })

  test('unmounts one session or all sessions', () => {
    setupDocument()
    const vrowzer = Vrowzer()
    const desktopContainer = createContainer()
    const mobileContainer = createContainer()
    const desktop = vrowzer.mount(desktopContainer, { id: 'desktop' })
    const mobile = vrowzer.mount(mobileContainer, { id: 'mobile' })

    desktop.unmount()

    expect(vrowzer.getSession('desktop')).toBeUndefined()
    expect(getTestContainer(desktopContainer).children).toHaveLength(0)
    expect(vrowzer.sessions()).toEqual([mobile])

    vrowzer.unmount()

    expect(vrowzer.sessions()).toHaveLength(0)
    expect(getTestContainer(mobileContainer).children).toHaveLength(0)
  })

  test('ignores a stale session object after its id is reused', () => {
    setupDocument()
    const vrowzer = Vrowzer()
    const oldSession = vrowzer.mount(createContainer(), { id: 'mobile' })
    oldSession.unmount()
    const currentSession = vrowzer.mount(createContainer(), { id: 'mobile' })
    const currentIframe = getTestIframe(currentSession.iframe)

    oldSession.reload()
    oldSession.unmount()
    vrowzer.reloadPreview(oldSession)
    vrowzer.unmount(oldSession)

    expect(vrowzer.getSession('mobile')).toBe(currentSession)
    expect(currentIframe.srcdocWrites).toHaveLength(1)
    expect(getTestContainer(currentSession.container).children).toEqual([currentSession.iframe])
  })

  test('snapshots and safely serializes preview context', () => {
    setupDocument()
    const params = {
      marker: '</script>\u2028\u2029',
      width: '390'
    }
    const options = {
      id: 'mobile</script>\u2028\u2029',
      params
    }
    const vrowzer = Vrowzer()
    const session = vrowzer.mount(createContainer(), options)
    options.id = 'changed'
    params.width = '430'

    session.reload()

    const srcdoc = getTestIframe(session.iframe).srcdoc
    expect(srcdoc).toContain('"id":"mobile\\u003c/script>\\u2028\\u2029"')
    expect(srcdoc).toContain('"marker":"\\u003c/script>\\u2028\\u2029"')
    expect(srcdoc).toContain('"width":"390"')
    expect(srcdoc).not.toContain('"width":"430"')
    expect(vrowzer.getSession('mobile</script>\u2028\u2029')).toBe(session)
  })
})

describe('Vrowzer events', () => {
  test('on() returns a stop function', () => {
    const vrowzer = Vrowzer()
    const stop = vrowzer.on('progress', () => {})
    expect(stop).toBeTypeOf('function')
    stop()
  })

  test('on() receives emitted events', () => {
    const vrowzer = Vrowzer()
    const received: string[] = []
    vrowzer.on('progress', phase => {
      received.push(phase)
    })
    vrowzer.emit('progress', 'registering')
    vrowzer.emit('progress', 'registered')
    expect(received).toEqual(['registering', 'registered'])
  })

  test('once() receives event only once', () => {
    const vrowzer = Vrowzer()
    let count = 0
    vrowzer.once('progress', () => {
      count++
    })
    vrowzer.emit('progress', 'first')
    vrowzer.emit('progress', 'second')
    expect(count).toBe(1)
  })

  test('stop function unregisters handler', () => {
    const vrowzer = Vrowzer()
    let count = 0
    const stop = vrowzer.on('progress', () => {
      count++
    })
    vrowzer.emit('progress', 'first')
    stop()
    vrowzer.emit('progress', 'second')
    expect(count).toBe(1)
  })

  test('off() unregisters handler', () => {
    const vrowzer = Vrowzer()
    let count = 0
    const handler = () => {
      count++
    }
    vrowzer.on('progress', handler)
    vrowzer.emit('progress', 'first')
    vrowzer.off('progress', handler)
    vrowzer.emit('progress', 'second')
    expect(count).toBe(1)
  })

  test('dispose() clears all handlers', async () => {
    const vrowzer = Vrowzer()
    let count = 0
    vrowzer.on('progress', () => {
      count++
    })
    vrowzer.on('suspended', () => {
      count++
    })
    vrowzer.emit('progress', 'test')
    expect(count).toBe(1)
    await vrowzer.dispose()
    vrowzer.emit('progress', 'after-dispose')
    vrowzer.emit('suspended')
    expect(count).toBe(1)
  })
})

describe('Vrowzer preview load errors', () => {
  const MAIN_URL = `${HOST_ORIGIN}/__preview__/main.js`

  function createReport(token: string, fields: Record<string, unknown> = {}) {
    return {
      type: 'vrowzer:preview-load-error',
      token,
      stage: 'script',
      message: `Failed to load the module script: ${MAIN_URL}`,
      url: MAIN_URL,
      ...fields
    }
  }

  function collectLoadErrors(vrowzer: ReturnType<typeof Vrowzer>): PreviewLoadErrorInfo[] {
    const received: PreviewLoadErrorInfo[] = []
    vrowzer.on('previewLoadError', info => {
      received.push(info)
    })
    return received
  }

  test('embeds a load token and the host origin in the bootstrap document', () => {
    setupDocument()
    stubLoadTokens()
    const vrowzer = Vrowzer()

    const session = vrowzer.mount(createContainer(), { id: 'desktop' })

    const srcdoc = getTestIframe(session.iframe).srcdoc
    expect(srcdoc).toContain(`"${TOKEN_1}"`)
    expect(srcdoc).toContain(`"${HOST_ORIGIN}"`)
  })

  test('renews the load token whenever a session reloads', () => {
    setupDocument()
    stubLoadTokens()
    const vrowzer = Vrowzer()
    const session = vrowzer.mount(createContainer(), { id: 'desktop' })

    session.reload()

    const [first, second] = getTestIframe(session.iframe).srcdocWrites
    expect(first).toContain(`"${TOKEN_1}"`)
    expect(second).toContain(`"${TOKEN_2}"`)
    expect(second).not.toContain(`"${TOKEN_1}"`)
  })

  test('emits previewLoadError for a report from the current document', () => {
    const testWindow = setupDocument()
    stubLoadTokens()
    const vrowzer = Vrowzer()
    const received = collectLoadErrors(vrowzer)
    const session = vrowzer.mount(createContainer(), { id: 'desktop' })

    testWindow.dispatchMessage({
      // The session id comes from the host's record, not from the report
      data: createReport(TOKEN_1, { id: 'spoofed' }),
      source: getTestIframe(session.iframe).contentWindow
    })

    expect(received).toEqual([
      {
        id: 'desktop',
        stage: 'script',
        message: `Failed to load the module script: ${MAIN_URL}`,
        url: MAIN_URL
      }
    ])
    expect(Object.isFrozen(received[0])).toBe(true)
  })

  test('identifies the reporting session when several are mounted', () => {
    const testWindow = setupDocument()
    stubLoadTokens()
    const vrowzer = Vrowzer()
    const received = collectLoadErrors(vrowzer)
    vrowzer.mount(createContainer(), { id: 'desktop' })
    const mobile = vrowzer.mount(createContainer(), { id: 'mobile' })

    testWindow.dispatchMessage({
      data: createReport(TOKEN_2),
      source: getTestIframe(mobile.iframe).contentWindow
    })

    expect(received.map(info => info.id)).toEqual(['mobile'])
  })

  test('ignores reports that do not match the current document', () => {
    const testWindow = setupDocument()
    stubLoadTokens()
    const vrowzer = Vrowzer()
    const received = collectLoadErrors(vrowzer)
    const desktop = vrowzer.mount(createContainer(), { id: 'desktop' })
    const mobile = vrowzer.mount(createContainer(), { id: 'mobile' })
    const desktopWindow = getTestIframe(desktop.iframe).contentWindow
    const mobileWindow = getTestIframe(mobile.iframe).contentWindow
    // TOKEN_3 replaces TOKEN_1
    desktop.reload()

    // A document replaced by reload()
    testWindow.dispatchMessage({ data: createReport(TOKEN_1), source: desktopWindow })
    // A token of another session
    testWindow.dispatchMessage({ data: createReport(TOKEN_2), source: desktopWindow })
    // An unknown token
    testWindow.dispatchMessage({ data: createReport('unknown'), source: desktopWindow })
    // Another source window
    testWindow.dispatchMessage({ data: createReport(TOKEN_3), source: mobileWindow })
    // Another origin
    testWindow.dispatchMessage({
      data: createReport(TOKEN_3),
      source: desktopWindow,
      origin: 'https://other.test'
    })
    // Other message types and malformed reports
    testWindow.dispatchMessage({
      data: createReport(TOKEN_3, { type: 'other' }),
      source: desktopWindow
    })
    testWindow.dispatchMessage({ data: 'vrowzer:preview-load-error', source: desktopWindow })
    testWindow.dispatchMessage({
      data: createReport(TOKEN_3, { stage: 'runtime' }),
      source: desktopWindow
    })
    // A document of a removed session
    mobile.unmount()
    testWindow.dispatchMessage({ data: createReport(TOKEN_2), source: mobileWindow })

    expect(received).toEqual([])

    testWindow.dispatchMessage({ data: createReport(TOKEN_3), source: desktopWindow })

    expect(received.map(info => info.id)).toEqual(['desktop'])
  })

  test('keeps only known and bounded fields from a report', () => {
    const testWindow = setupDocument()
    stubLoadTokens()
    const vrowzer = Vrowzer()
    const received = collectLoadErrors(vrowzer)
    const session = vrowzer.mount(createContainer(), { id: 'desktop' })
    const source = getTestIframe(session.iframe).contentWindow
    const longUrl = `${HOST_ORIGIN}/${'p'.repeat(3000)}`

    testWindow.dispatchMessage({
      data: createReport(TOKEN_1, {
        message: 'x'.repeat(5000),
        url: `blob:${HOST_ORIGIN}/0000`,
        status: 42,
        error: { name: 1, message: 'boom' },
        stack: 'at bootstrap',
        extra: true
      }),
      source
    })
    testWindow.dispatchMessage({
      data: createReport(TOKEN_1, {
        stage: 'html',
        message: '',
        url: longUrl,
        status: 404,
        error: { name: 'TypeError', message: 'Failed to fetch' }
      }),
      source
    })

    expect(received).toEqual([
      { id: 'desktop', stage: 'script', message: 'x'.repeat(1000) },
      {
        id: 'desktop',
        stage: 'html',
        message: 'Failed to load the preview HTML',
        url: longUrl.slice(0, 2048),
        status: 404,
        error: { name: 'TypeError', message: 'Failed to fetch' }
      }
    ])
    expect(Object.isFrozen(received[1]?.error)).toBe(true)
  })

  test('listens for messages only while sessions are mounted', () => {
    const testWindow = setupDocument()
    const vrowzer = Vrowzer()

    expect(testWindow.messageListeners.size).toBe(0)

    const desktop = vrowzer.mount(createContainer(), { id: 'desktop' })
    vrowzer.mount(createContainer(), { id: 'mobile' })
    expect(testWindow.messageListeners.size).toBe(1)

    desktop.unmount()
    expect(testWindow.messageListeners.size).toBe(1)

    vrowzer.unmount()
    expect(testWindow.messageListeners.size).toBe(0)

    vrowzer.mount(createContainer(), { id: 'desktop' })
    expect(testWindow.messageListeners.size).toBe(1)
  })
})
