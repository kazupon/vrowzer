export const VROWZER_INTERNAL_ASSET_QUERY = '__vrowzer_internal_asset'

const ROLLDOWN_ASSET_QUERY_VALUE = 'rolldown'
const ROLLDOWN_ASSET_NAMES = new Set([
  'rolldown-binding.wasm32-wasi.wasm',
  'rolldown-worker.js'
])

export function withInternalRolldownAssetQuery(relativePath: string): string {
  return `${relativePath}?${VROWZER_INTERNAL_ASSET_QUERY}=${ROLLDOWN_ASSET_QUERY_VALUE}`
}

export function isInternalRolldownAssetUrl(rawUrl: string): boolean {
  const url = new URL(rawUrl)
  const fileName = url.pathname.slice(url.pathname.lastIndexOf('/') + 1)
  return (
    url.searchParams.get(VROWZER_INTERNAL_ASSET_QUERY) === ROLLDOWN_ASSET_QUERY_VALUE &&
    ROLLDOWN_ASSET_NAMES.has(fileName)
  )
}
