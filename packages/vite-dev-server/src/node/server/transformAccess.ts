import { cleanUrl } from '../../shared/utils'
import type { ResolvedConfig } from '../config'
import { checkLoadingAccess } from './middlewares/static'

const urlRE = /[?&]url\b/
const rawRE = /[?&]raw\b/
const inlineRE = /[?&]inline\b/
const svgRE = /\.svg\b/

export function isServerAccessDeniedForTransform(
  config: ResolvedConfig,
  id: string,
): boolean {
  if (rawRE.test(id) || urlRE.test(id) || inlineRE.test(id) || svgRE.test(id)) {
    return (
      checkLoadingAccess(config, cleanUrl(id)) !== 'allowed' ||
      checkLoadingAccess(config, id) !== 'allowed'
    )
  }
  return false
}
