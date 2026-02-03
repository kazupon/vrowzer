// TODO: fill in code ...

export interface LicenseEntry {
  /**
   * Package name
   */
  name: string
  /**
   * Package version
   */
  version: string
  /**
   * SPDX license identifier (from package.json "license" field)
   */
  identifier?: string
  /**
   * License file text
   */
  text?: string
}

export interface LicenseOptions {
  /**
   * The output file name of the license file relative to the output directory.
   * Specify a path that ends with `.json` to output the raw JSON metadata.
   *
   * @default '.vite/license.md'
   */
  fileName: string
}

const licenseConfigDefaults = Object.freeze({
  fileName: '.vite/license.md',
} satisfies LicenseOptions)

// https://github.com/npm/npm-packlist/blob/53b2a4f42b7fef0f63e8f26a3ea4692e23a58fed/lib/index.js#L284-L286
const licenseFiles = [/^license/i, /^licence/i, /^copying/i]


// TODO: fill in code ...
