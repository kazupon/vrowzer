// no node: protocol intentionally
import { msg as fsMsg } from 'fs'
import { msg as fsDirMsg } from 'fs-dir/test'
import { msg as moduleMsg } from 'aliased-module/index.js'
import { msg as customResolverMsg } from 'custom-resolver'

function text(el: string, value: string) {
  const target = document.querySelector(el)
  if (target) {
    target.textContent = value
  } else {
    console.error(`[alias-test] element not found: ${el}`)
  }
}

text('.fs', fsMsg)
text('.fs-dir', fsDirMsg)
text('.aliased-module', moduleMsg)
text('.custom-resolver', customResolverMsg)

document.body.dataset.testComplete = 'true'
