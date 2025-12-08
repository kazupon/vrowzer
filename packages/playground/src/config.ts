import type { InlineConfig, ResolvedConfig } from 'vite'

const SYMBOL_RESOLVED_CONFIG: unique symbol = Symbol('vite:resolved-config')

export function isResolvedConfig(
  inlineConfig: InlineConfig | ResolvedConfig
): inlineConfig is ResolvedConfig {
  return (SYMBOL_RESOLVED_CONFIG in inlineConfig && inlineConfig[SYMBOL_RESOLVED_CONFIG]) as boolean
}
