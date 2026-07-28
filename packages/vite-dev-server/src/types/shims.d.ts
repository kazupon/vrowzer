declare module 'postcss-import' {
  import type { Plugin } from 'postcss'

  const plugin: (options: {
    resolve: (
      id: string,
      basedir: string,
      importOptions: unknown,
    ) => string | string[] | Promise<string | string[]>
    load: (id: string) => Promise<string>
    nameLayer: (index: number, rootFilename: string) => string
  }) => Plugin

  export = plugin
}
