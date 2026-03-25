import { NULL_BYTE_PLACEHOLDER, VALID_ID_PREFIX } from './constants'

const _globalThis = globalThis as any

export const isWindows: boolean = (() => {
  // Deno
  if (_globalThis.Deno?.build?.os) {
    return _globalThis.Deno.build.os === 'windows'
  }
  // Node.js / Bun
  if (typeof process !== 'undefined' && process.platform) {
    return process.platform === 'win32'
  }
  // Browser
  if (typeof navigator !== 'undefined' && navigator.userAgent) {
    return navigator.userAgent.includes('Windows')
  }
  return false
})()
// NOTE(kazupon): for browser env, we assume non-windows
// export const isWindows: boolean =
//   typeof process !== 'undefined' && process.platform === 'win32'

/**
 * Prepend `/@id/` and replace null byte so the id is URL-safe.
 * This is prepended to resolved ids that are not valid browser
 * import specifiers by the importAnalysis plugin.
 */
export function wrapId(id: string): string {
  return id.startsWith(VALID_ID_PREFIX)
    ? id
    : VALID_ID_PREFIX + id.replace('\0', NULL_BYTE_PLACEHOLDER)
}

/**
 * Undo {@link wrapId}'s `/@id/` and null byte replacements.
 */
export function unwrapId(id: string): string {
  return id.startsWith(VALID_ID_PREFIX)
    ? id.slice(VALID_ID_PREFIX.length).replace(NULL_BYTE_PLACEHOLDER, '\0')
    : id
}

const windowsSlashRE = /\\/g
export function slash(p: string): string {
  return p.replace(windowsSlashRE, '/')
}

const postfixRE = /[?#].*$/
export function cleanUrl(url: string): string {
  return url.replace(postfixRE, '')
}

export function splitFileAndPostfix(path: string): {
  file: string
  postfix: string
} {
  const file = cleanUrl(path)
  return { file, postfix: path.slice(file.length) }
}

// TODO: fill in code later ...

export function withTrailingSlash(path: string): string {
  if (path[path.length - 1] !== '/') {
    return `${path}/`
  }
  return path
}

// TODO: fill in later ...

export interface PromiseWithResolvers<T> {
  promise: Promise<T>
  resolve: (value: T | PromiseLike<T>) => void
  reject: (reason?: any) => void
}
export function promiseWithResolvers<T>(): PromiseWithResolvers<T> {
  let resolve: any
  let reject: any
  const promise = new Promise<T>((_resolve, _reject) => {
    resolve = _resolve
    reject = _reject
  })
  return { promise, resolve, reject }
}

// TODO: fill in later ...

// ------------------------------------------------------------------------------------------------
// @vrowzer/vite-dev-server original code below
// ------------------------------------------------------------------------------------------------

/**
 * below code is forked from unjs/mlly
 * repo: https://github.com/unjs/mlly
 * loc: https://github.com/unjs/mlly/blob/main/src/syntax.ts#L20-L43
 * license: MIT
 */

/**
 * Options for detecting syntax within a code string.
 */
export type DetectSyntaxOptions = {
  /**
   * Indicates whether comments should be stripped from the code before syntax checking.
   * @default false
   */
  stripComments?: boolean;
};

const ESM_RE = /(?:[\s;]|^)(?:import[\s\w*,{}]*from|import\s*["'*{]|export\b\s*(?:[*{]|default|class|type|function|const|var|let|async function)|import\.meta\b)/m;
const COMMENT_RE = /\/\*.+?\*\/|\/\/.*(?=[nr])/g;

/**
 * Determines if a given code string contains ECMAScript module syntax.
 *
 * @param {string} code - The source code to analyse.
 * @param {DetectSyntaxOptions} opts - See {@link DetectSyntaxOptions}.
 * @returns {boolean} `true` if the code contains ESM syntax, otherwise `false`.
 */
export function hasESMSyntax(code: string, opts: DetectSyntaxOptions = {}) {
  if (opts.stripComments) {
    code = code.replace(COMMENT_RE, "");
  }
  return ESM_RE.test(code);
}

/**
 * Represents a general structure for ECMAScript module imports.
 */
export interface ESMImport {
  /**
   * Specifies the type of import: "static" for static imports and "dynamic" for dynamic imports.
   */
  type: "static" | "dynamic";

  /**
   * The full import declaration code snippet as a string.
   */
  code: string;

  /**
   * The starting position (index) of the import declaration in the source code.
   */
  start: number;

  /**
   * The end position (index) of the import declaration in the source code.
   */
  end: number;
}

/**
 * Represents a static import declaration in an ECMAScript module.
 * Extends {@link ESMImport}.
 */
export interface StaticImport extends ESMImport {
  /**
   * Indicates the type of import, specifically a static import.
   */
  type: "static";

  /**
   * Contains the entire import statement as a string, excluding the module specifier.
   */
  imports: string;

  /**
   * The module specifier from which imports are being brought in.
   */
  specifier: string;
}

/**
 * Represents a parsed static import declaration with detailed components of the import.
 * Extends {@link StaticImport}.
 */
export interface ParsedStaticImport extends StaticImport {
  /**
   * The default import name, if any.
   * @optional
   */
  defaultImport?: string;

  /**
   * The namespace import name, if any, using the `* as` syntax.
   * @optional
   */
  namespacedImport?: string;

  /**
   * An object representing named imports, with their local aliases if specified.
   * Each property key is the original name and its value is the alias.
   * @optional
   */
  namedImports?: { [name: string]: string };
}

/**
 * Represents a dynamic import declaration that is loaded at runtime.
 * Extends {@link ESMImport}.
 */
export interface DynamicImport extends ESMImport {
  /**
   * Indicates that this is a dynamic import.
   */
  type: "dynamic";

  /**
   * The expression or path to be dynamically imported, typically a module path or URL.
   */
  expression: string;
}

/**
 * Represents a type-specific import, primarily used for importing types in TypeScript.
 * Extends {@link ESMImport} but omits the 'type' to redefine it specifically for type imports.
 */
export interface TypeImport extends Omit<ESMImport, "type"> {
  /**
   * Specifies that this is a type import.
   */
  type: "type";

  /**
   * Contains the entire type import statement as a string, excluding the module specifier.
   */
  imports: string;

  /**
   * The module specifier from which to import types.
   */
  specifier: string;
}

export const ESM_STATIC_IMPORT_RE =
  /(?<=\s|^|;|\})import\s*(?:[\s"']*(?<imports>[\p{L}\p{M}\w\t\n\r $*,/{}@.]+)from\s*)?["']\s*(?<specifier>(?<="\s*)[^"]*[^\s"](?=\s*")|(?<='\s*)[^']*[^\s'](?=\s*'))\s*["'][\s;]*/gmu;

const TYPE_RE = /^\s*?type\s/;

export function clearImports(imports: string) {
  return (imports || "")
    .replace(/\/\/[^\n]*\n|\/\*.*\*\//g, "")
    .replace(/\s+/g, " ");
}

export function getImportNames(cleanedImports: string) {
  const topLevelImports = cleanedImports.replace(/{[^}]*}/, "");
  const namespacedImport = topLevelImports.match(/\* as \s*(\S*)/)?.[1];
  const defaultImport =
    topLevelImports
      .split(",")
      .find((index) => !/[*{}]/.test(index))
      ?.trim() || undefined;

  return {
    namespacedImport,
    defaultImport,
  };
}

/**
 * Parses a static import or type import to extract detailed import elements such as default, namespace and named imports.
 * @param {StaticImport | TypeImport} matched - The matched import statement to parse. See {@link StaticImport} and {@link TypeImport}.
 * @returns {ParsedStaticImport} A structured object representing the parsed static import. See {@link ParsedStaticImport}.
 */
export function parseStaticImport(
  matched: StaticImport | TypeImport,
): ParsedStaticImport {
  const cleanedImports = clearImports(matched.imports);

  const namedImports: Record<string, string> = {};
  const _matches = cleanedImports.match(/{([^}]*)}/)?.[1]?.split(",") || [];
  for (const namedImport of _matches) {
    const _match = namedImport.match(/^\s*(\S*) as (\S*)\s*$/);
    const source = _match?.[1] || namedImport.trim();
    const importName = _match?.[2] || source;
    if (source && !TYPE_RE.test(source)) {
      namedImports[source] = importName;
    }
  }
  const { namespacedImport, defaultImport } = getImportNames(cleanedImports);

  return {
    ...matched,
    defaultImport,
    namespacedImport,
    namedImports,
  } as ParsedStaticImport;
}

/**
 * FNV-1a hash implementation (browser compatible)
 * Based on: https://en.wikipedia.org/wiki/Fowler%E2%80%93Noll%E2%80%93Vo_hash_function
 */
function fnv1aHash(data: Uint8Array): string {
  const FNV_PRIME = 0x01000193
  const FNV_OFFSET_BASIS = 0x811c9dc5

  let hash = FNV_OFFSET_BASIS
  for (let i = 0; i < data.length; i++) {
    hash ^= data[i]!
    hash = Math.imul(hash, FNV_PRIME)
  }

  // Convert to unsigned 32-bit and then to base36 for compact representation
  return (hash >>> 0).toString(36)
}

/**
 * Generate an entity tag (browser compatible)
 * Similar to the 'etag' npm package but without Node.js dependencies
 */
export function generateEtag(
  entity: string | Uint8Array,
  options?: { weak?: boolean },
): string {
  const weak = options?.weak ?? true

  // Convert to Uint8Array for consistent processing
  const bytes = typeof entity === 'string'
    ? new TextEncoder().encode(entity)
    : entity

  if (bytes.length === 0) {
    // Fast-path empty content
    return weak ? 'W/"0-0"' : '"0-0"'
  }

  // Compute hash
  const hash = fnv1aHash(bytes)
  const len = bytes.length.toString(16)
  const tag = `"${len}-${hash}"`

  return weak ? `W/${tag}` : tag
}

