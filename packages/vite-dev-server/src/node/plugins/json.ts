// TODO: fill in code ...

export interface JsonOptions {
  /**
   * Generate a named export for every property of the JSON object
   * @default true
   */
  namedExports?: boolean
  /**
   * Generate performant output as JSON.parse("stringified").
   *
   * When set to 'auto', the data will be stringified only if the data is bigger than 10kB.
   * @default 'auto'
   */
  stringify?: boolean | 'auto'
}

// TODO: fill in code ...
