import { afterEach, describe, expect, test, vi } from 'vite-plus/test'
import { Vrowzer } from './index.ts'

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
  }
}

function setupDocument(): void {
  vi.stubGlobal('document', {
    createElement(tag: string) {
      expect(tag).toBe('iframe')
      return new TestIframe()
    }
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

  test('dispose() clears all handlers', () => {
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
    vrowzer.dispose()
    vrowzer.emit('progress', 'after-dispose')
    vrowzer.emit('suspended')
    expect(count).toBe(1)
  })
})
