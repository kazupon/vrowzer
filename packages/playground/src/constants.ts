/**
 * Prefix for resolved fs paths, since windows paths may not be valid as URLs.
 */
export const FS_PREFIX = `/@fs/`

export const CSS_LANGS_RE: RegExp = /\.(css|less|sass|scss|styl|stylus|pcss|postcss|sss)(?:$|\?)/
