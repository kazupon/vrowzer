import { isCSSRequest, isJSRequest } from '../utils.ts'

export function isExplicitImportRequired(url: string): boolean {
  return !isJSRequest(url) && !isCSSRequest(url)
}
