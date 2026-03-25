/**
 * Custom Monaco Editor entry — Web-related languages only.
 *
 * Instead of `import * as monaco from 'monaco-editor'` which bundles ALL languages,
 * this module imports only the core editor + languages relevant to web development.
 */

// Disable Monaco Editor web workers in the pre-built IDE.
// Workers require separate bundle entries which are complex to serve
// from the /__vrowzer__/dist/ middleware. Without workers, Monaco still
// provides syntax highlighting, code editing, and basic completions —
// only background IntelliSense (type checking, advanced completions) is unavailable.
;(self as any).MonacoEnvironment = {
  getWorker() {
    // Return a no-op worker to prevent "postMessage" errors
    const blob = new Blob(['self.onmessage = function() {}'], { type: 'application/javascript' })
    return new Worker(URL.createObjectURL(blob))
  }
}

// Core editor
export * from 'monaco-editor/esm/vs/editor/editor.api'

// Web languages
import 'monaco-editor/esm/vs/basic-languages/html/html.contribution'
import 'monaco-editor/esm/vs/basic-languages/css/css.contribution'
import 'monaco-editor/esm/vs/basic-languages/less/less.contribution'
import 'monaco-editor/esm/vs/basic-languages/scss/scss.contribution'
import 'monaco-editor/esm/vs/basic-languages/javascript/javascript.contribution'
import 'monaco-editor/esm/vs/basic-languages/typescript/typescript.contribution'
import 'monaco-editor/esm/vs/basic-languages/xml/xml.contribution'
import 'monaco-editor/esm/vs/basic-languages/yaml/yaml.contribution'
import 'monaco-editor/esm/vs/basic-languages/markdown/markdown.contribution'
import 'monaco-editor/esm/vs/basic-languages/mdx/mdx.contribution'
import 'monaco-editor/esm/vs/basic-languages/pug/pug.contribution'
import 'monaco-editor/esm/vs/basic-languages/graphql/graphql.contribution'
import 'monaco-editor/esm/vs/basic-languages/handlebars/handlebars.contribution'
import 'monaco-editor/esm/vs/basic-languages/shell/shell.contribution'

// Language features (IntelliSense, validation)
import 'monaco-editor/esm/vs/language/typescript/monaco.contribution'
import 'monaco-editor/esm/vs/language/css/monaco.contribution'
import 'monaco-editor/esm/vs/language/json/monaco.contribution'
import 'monaco-editor/esm/vs/language/html/monaco.contribution'
