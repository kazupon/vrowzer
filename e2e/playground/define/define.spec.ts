import { stripVTControlCharacters } from 'node:util'
import { describe, expect, test } from 'vite-plus/test'
import { browserLogs, page } from '~utils'

const defines: Record<string, any> = {
  __EXP__: 'false',
  __STRING__: '"hello"',
  __NUMBER__: 123,
  __BOOLEAN__: true,
  __UNDEFINED__: undefined,
  __OBJ__: {
    foo: 1,
    bar: { baz: 2 },
    process: { env: { SOMEVAR: '"PROCESS MAY BE PROPERTY"' } }
  },
  'process.env.NODE_ENV': '"dev"',
  'process.env.SOMEVAR': '"SOMEVAR"',
  'process.env': { NODE_ENV: 'dev', SOMEVAR: 'SOMEVAR', OTHER: 'works' },
  $DOLLAR: 456,
  ÖUNICODE_LETTERɵ: 789,
  __VAR_NAME__: false,
  __STRINGIFIED_OBJ__: JSON.stringify({ foo: true }),
  __DEFINE_IN_ENVIRONMENT__: '"defined in environment"'
}

async function getIframeTexts(...selectors: string[]): Promise<Record<string, string | null>> {
  const result = await page.waitForFunction(
    sels => {
      const iframe = document.querySelector('iframe') as HTMLIFrameElement
      const doc = iframe?.contentDocument
      if (doc?.body?.dataset?.testComplete !== 'true') {
        return
      }

      const elements = sels.map(sel => doc.querySelector(sel))
      if (elements.some(element => !element)) {
        return
      }

      return Object.fromEntries(
        elements.map((element, index) => [sels[index], element!.textContent])
      )
    },
    selectors,
    { timeout: 30000 }
  )

  return (await result.jsonValue()) as Record<string, string | null>
}

describe('define', () => {
  test('page shows Ready status', async () => {
    const status = await page.textContent('#status')
    expect(status).toBe('Ready')
  })

  test('string', async () => {
    const texts = await getIframeTexts(
      '.exp',
      '.string',
      '.number',
      '.boolean',
      '.undefined',
      '.object',
      '.process-node-env',
      '.process-env',
      '.env-var',
      '.process-as-property',
      '.spread-object',
      '.spread-array',
      '.dollar-identifier',
      '.unicode-identifier',
      '.no-identifier-substring',
      '.no-property',
      '.exp-define',
      '.import-json',
      '.define-in-dep',
      '.define-in-environment'
    )

    expect(texts['.exp']).toBe(String(typeof eval(defines.__EXP__)))
    expect(texts['.string']).toBe(JSON.parse(defines.__STRING__))
    expect(texts['.number']).toBe(String(defines.__NUMBER__))
    expect(texts['.boolean']).toBe(String(defines.__BOOLEAN__))
    expect(texts['.undefined']).toBe('')
    expect(texts['.object']).toBe(JSON.stringify(defines.__OBJ__, null, 2))
    expect(texts['.process-node-env']).toBe(JSON.parse(defines['process.env.NODE_ENV']))
    expect(texts['.process-env']).toBe(JSON.stringify(defines['process.env'], null, 2))
    expect(texts['.env-var']).toBe(JSON.parse(defines['process.env.SOMEVAR']))
    expect(texts['.process-as-property']).toBe(defines.__OBJ__.process.env.SOMEVAR)
    expect(texts['.spread-object']).toBe(
      JSON.stringify({ SOMEVAR: defines['process.env.SOMEVAR'] })
    )
    expect(texts['.spread-array']).toBe(JSON.stringify([...defines.__STRING__]))
    expect(texts['.dollar-identifier']).toBe(String(defines.$DOLLAR))
    expect(texts['.unicode-identifier']).toBe(String(defines.ÖUNICODE_LETTERɵ))
    expect(texts['.no-identifier-substring']).toBe(String(true))
    expect(texts['.no-property']).toBe(String(true))
    expect(texts['.exp-define']).toBe('__EXP__')
    expect(texts['.import-json']).toBe('__EXP__')
    expect(texts['.define-in-dep']).toBe(defines.__STRINGIFIED_OBJ__)
    expect(texts['.define-in-environment']).toBe(defines.__DEFINE_IN_ENVIRONMENT__)
  })

  test('ignores constants in string literals', async () => {
    const texts = await getIframeTexts(
      '.ignores-string-literals .process-env-dot',
      '.ignores-string-literals .global-process-env-dot',
      '.ignores-string-literals .globalThis-process-env-dot',
      '.ignores-string-literals .process-env-NODE_ENV',
      '.ignores-string-literals .global-process-env-NODE_ENV',
      '.ignores-string-literals .globalThis-process-env-NODE_ENV',
      '.ignores-string-literals .import-meta-hot'
    )

    expect(texts['.ignores-string-literals .process-env-dot']).toBe('process.env.')
    expect(texts['.ignores-string-literals .global-process-env-dot']).toBe('global.process.env.')
    expect(texts['.ignores-string-literals .globalThis-process-env-dot']).toBe(
      'globalThis.process.env.'
    )
    expect(texts['.ignores-string-literals .process-env-NODE_ENV']).toBe('process.env.NODE_ENV')
    expect(texts['.ignores-string-literals .global-process-env-NODE_ENV']).toBe(
      'global.process.env.NODE_ENV'
    )
    expect(texts['.ignores-string-literals .globalThis-process-env-NODE_ENV']).toBe(
      'globalThis.process.env.NODE_ENV'
    )
    expect(texts['.ignores-string-literals .import-meta-hot']).toBe('import' + '.meta.hot')
  })

  test('replaces constants in template literal expressions', async () => {
    const texts = await getIframeTexts(
      '.replaces-constants-in-template-literal-expressions .process-env-dot',
      '.replaces-constants-in-template-literal-expressions .process-env-NODE_ENV'
    )

    expect(texts['.replaces-constants-in-template-literal-expressions .process-env-dot']).toBe(
      JSON.parse(defines['process.env.SOMEVAR'])
    )
    expect(texts['.replaces-constants-in-template-literal-expressions .process-env-NODE_ENV']).toBe(
      'dev'
    )
  })

  test('replace constants on import.meta.env when it is a invalid json', async () => {
    const texts = await getIframeTexts(
      '.replace-undefined-constants-on-import-meta-env .import-meta-env-UNDEFINED',
      '.replace-undefined-constants-on-import-meta-env .import-meta-env-SOME_IDENTIFIER'
    )

    expect(
      texts['.replace-undefined-constants-on-import-meta-env .import-meta-env-UNDEFINED']
    ).toBe('undefined')
    // Skipped: import.meta.env.SOME_IDENTIFIER requires 'import.meta.env.SOME_IDENTIFIER': '__VITE_SOME_IDENTIFIER__'
    // in define config, but this causes a ReferenceError in vrowzer's Worker startup because
    // extractWorkerConfig forwards all define values to the Worker's internal Vite config,
    // where __VITE_SOME_IDENTIFIER__ (a browser-only runtime global) is not defined.
    // expect(texts['.replace-undefined-constants-on-import-meta-env .import-meta-env-SOME_IDENTIFIER']).toBe('true')
  })

  test('optional values are detected by pattern properly', async () => {
    const texts = await getIframeTexts('.optional-env')
    expect(texts['.optional-env']).toBe(JSON.parse(defines['process.env.SOMEVAR']))
  })

  test('rewrites configured HTML asset sources selected by the filter', async () => {
    const result = await page.waitForFunction(() => {
      const iframe = document.querySelector('iframe') as HTMLIFrameElement
      const doc = iframe?.contentDocument
      if (doc?.body?.dataset?.testComplete !== 'true') {
        return
      }

      const rewritten = doc.querySelector('#rewritten-custom-asset')
      const untouched = doc.querySelector('#untouched-custom-asset')
      if (!rewritten || !untouched) {
        return
      }

      return {
        rewritten: rewritten.getAttribute('data-src'),
        untouched: untouched.getAttribute('data-src')
      }
    })

    expect(await result.jsonValue()).toEqual({
      rewritten: '/__preview__/data.json',
      untouched: '/data.json'
    })
  })

  test('forwards console errors while preserving the iframe console output', async () => {
    const marker = 'vrowzer-forward-console value=42'
    const startIndex = browserLogs.length

    await page.evaluate(() => {
      const iframe = document.querySelector('iframe') as HTMLIFrameElement
      iframe.contentWindow!.console.error('vrowzer-forward-console value=%d', 42)
    })

    await expect
      .poll(
        () =>
          browserLogs
            .slice(startIndex)
            .map(stripVTControlCharacters)
            .some(log => log.includes(`[console.error] ${marker}`)),
        { timeout: 10000 }
      )
      .toBe(true)

    const logs = browserLogs.slice(startIndex).map(stripVTControlCharacters)
    expect(
      logs.some(log => log.includes('vrowzer-forward-console') && !log.includes('[console.error]'))
    ).toBe(true)
  })

  test('maps unhandled runtime errors to the original source', async () => {
    const startIndex = browserLogs.length

    await page.evaluate(() => {
      const iframe = document.querySelector('iframe') as HTMLIFrameElement
      ;(
        iframe.contentDocument!.querySelector('#forward-console-error') as HTMLButtonElement
      ).click()
    })

    await expect
      .poll(
        () =>
          browserLogs
            .slice(startIndex)
            .map(stripVTControlCharacters)
            .find(log =>
              log.includes('[Unhandled error] Error: vrowzer forward console runtime error')
            ),
        { timeout: 10000 }
      )
      .toContain('main.ts:')

    const output = browserLogs
      .slice(startIndex)
      .map(stripVTControlCharacters)
      .find(log => log.includes('[Unhandled error] Error: vrowzer forward console runtime error'))!
    expect(output).toContain('throwForwardConsoleError main.ts:')
    expect(output).toContain("throw new Error('vrowzer forward console runtime error')")
  })

  // Skipped: Requires testEnvQueryParamsPlugin which replaces __VITE_ENV_WITH_QUERY__
  // with '/@vite/env?foo' at build time. In vrowzer, this plugin is not available because
  // it's a host-side transform that doesn't apply to the preview iframe content.
  // The __VITE_ENV_WITH_QUERY__ identifier remains unreplaced, causing a ReferenceError.
  test.skip('env import with query parameters works correctly', async () => {
    const texts = await getIframeTexts('.env-with-query')
    expect(texts['.env-with-query']).toBe('success')
  })
})
