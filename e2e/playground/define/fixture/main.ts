import dataJson from './data.json'
import optionalEnv from './optional-env.js'

function text(el: string, value: any) {
  const target = document.querySelector(el)
  if (target) {
    target.textContent = String(value ?? '')
  } else {
    console.error(`[define-test] element not found: ${el}`)
  }
}

try {
  const __VAR_NAME__ = true // ensure define doesn't replace var name

  // @ts-expect-error define
  text('.exp', typeof __EXP__)
  // @ts-expect-error define
  text('.string', __STRING__)
  // @ts-expect-error define
  text('.number', __NUMBER__)
  // @ts-expect-error define
  text('.boolean', __BOOLEAN__)
  // @ts-expect-error define
  text('.undefined', __UNDEFINED__)
  // @ts-expect-error define
  text('.object', JSON.stringify(__OBJ__, null, 2))
  text('.process-node-env', process.env.NODE_ENV)
  text('.process-env', JSON.stringify(process.env, null, 2))
  text('.env-var', process.env.SOMEVAR)
  // @ts-expect-error define
  text('.process-as-property', __OBJ__.process.env.SOMEVAR)
  text(
    '.spread-object',
    JSON.stringify(process.env.SOMEVAR ? { SOMEVAR: `"${process.env.SOMEVAR}"` } : {})
  )
  // @ts-expect-error define
  text('.spread-array', JSON.stringify([...`"${__STRING__}"`]))
  // @ts-expect-error define
  text('.dollar-identifier', $DOLLAR)
  // @ts-expect-error define
  text('.unicode-identifier', ÖUNICODE_LETTERɵ)

  // make sure these kinds of use are NOT replaced:
  const obj = { [`${'_'}_EXP__`]: true }
  // @ts-expect-error define
  text('.no-property', obj.__EXP__)

  // @ts-expect-error define
  window[`${'_'}_EXP__SUBSTR__`] = true
  // @ts-expect-error define
  text('.no-identifier-substring', __EXP__SUBSTR__)

  text('.import-json', dataJson.foo)

  // @ts-expect-error define
  text('.define-in-dep', JSON.stringify(__STRINGIFIED_OBJ__))
  // @ts-expect-error define
  text('.define-in-environment', JSON.stringify(__DEFINE_IN_ENVIRONMENT__))

  // String literals should NOT be replaced
  text('.ignores-string-literals .process-env-dot', 'process.env.')
  text('.ignores-string-literals .global-process-env-dot', 'global.process.env.')
  text('.ignores-string-literals .globalThis-process-env-dot', 'globalThis.process.env.')
  text('.ignores-string-literals .process-env-NODE_ENV', 'process.env.NODE_ENV')
  text('.ignores-string-literals .global-process-env-NODE_ENV', 'global.process.env.NODE_ENV')
  text(
    '.ignores-string-literals .globalThis-process-env-NODE_ENV',
    'globalThis.process.env.NODE_ENV'
  )
  text('.ignores-string-literals .import-meta-hot', 'import.meta.hot')

  // Template literal expressions SHOULD be replaced
  text(
    '.replaces-constants-in-template-literal-expressions .process-env-dot',
    `${process.env.SOMEVAR}`
  )
  text(
    '.replaces-constants-in-template-literal-expressions .process-env-NODE_ENV',
    `${process.env.NODE_ENV}`
  )

  // import.meta.env undefined constants
  text(
    '.replace-undefined-constants-on-import-meta-env .import-meta-env-UNDEFINED',
    `${import.meta.env.UNDEFINED}`
  )
  text(
    '.replace-undefined-constants-on-import-meta-env .import-meta-env-SOME_IDENTIFIER',
    `${import.meta.env.SOME_IDENTIFIER}`
  )

  text('.optional-env', optionalEnv)

  document.querySelector('#forward-console-error')?.addEventListener('click', () => {
    throwForwardConsoleError()
  })

  // Signal completion (before async operations)
  document.body.dataset.testComplete = 'true'

  // env import with query parameters (async, runs after testComplete)
  // @ts-expect-error replaced by plugin
  import(__VITE_ENV_WITH_QUERY__)
    .then(() => {
      text('.env-with-query', 'success')
    })
    .catch((err: any) => {
      text('.env-with-query', `error: ${err.message}`)
    })
} catch (e: any) {
  console.error('[define-test] Error:', e.message, e.stack)
  document.body.dataset.testError = e.message
}

function throwForwardConsoleError() {
  throw new Error('vrowzer forward console runtime error')
}
