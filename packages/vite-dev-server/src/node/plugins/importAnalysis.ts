import {
  CLIENT_DIR
} from '../constants'
import {
  createDebugger,
  isCSSRequest,
  isJSRequest,
  normalizePath
} from '../utils'
import { isDirectCSSRequest } from './css'

const debug = createDebugger('vite:import-analysis')

const clientDir = normalizePath(CLIENT_DIR)

const skipRE = /\.(?:map|json)(?:$|\?)/
export const canSkipImportAnalysis = (id: string): boolean =>
  skipRE.test(id) || isDirectCSSRequest(id)

const optimizedDepChunkRE = /\/chunk-[A-Z\d]{8}\.js/

export const hasViteIgnoreRE: RegExp = /\/\*\s*@vite-ignore\s*\*\//

const urlIsStringRE = /^(?:'.*'|".*"|`.*`)$/

const templateLiteralRE = /^\s*`(.*)`\s*$/

interface UrlPosition {
  url: string
  start: number
  end: number
}

export function isExplicitImportRequired(url: string): boolean {
  return !isJSRequest(url) && !isCSSRequest(url)
}

// TODO: fill in later ...
