import type { ModuleFormat, RolldownOutput } from 'rolldown'
import { afterAll, beforeAll, describe, test, vi } from 'vite-plus/test'

// NOTE(kazupon): vite-dev-server loads rolldown from the browser build (`@vrowzer/rolldown`).
// The unit tests run in Node, so they build with the Node build of the same rolldown version.
vi.mock('@vrowzer/rolldown', () => import('rolldown'))
vi.mock('@vrowzer/rolldown/experimental', () => import('rolldown/experimental'))
vi.mock('@vrowzer/rolldown/parseAst', () => import('rolldown/parseAst'))
vi.mock('@vrowzer/rolldown/utils', () => import('rolldown/utils'))

import { build } from '../build'
import { modulePreloadPolyfillId } from './modulePreloadPolyfill'

// Ported from upstream Vite (`packages/vite/src/node/__tests__/plugins/modulePreloadPolyfill/modulePreloadPolyfill.spec.ts`).
// NOTE(kazupon): the snapshots are inline, as the other tests of vite-dev-server have them

beforeAll(() => {
  vi.stubGlobal('__VROWZER_SERVICE_WORKER__', false)
})

afterAll(() => {
  vi.unstubAllGlobals()
})

const buildProject = ({ format = 'es' as ModuleFormat } = {}) =>
  build({
    logLevel: 'silent',
    build: {
      write: false,
      rolldownOptions: {
        input: 'main.js',
        output: {
          format,
        },
        treeshake: {
          moduleSideEffects: false,
        },
      },
      minify: false,
    },
    plugins: [
      {
        name: 'test',
        resolveId(id) {
          if (id === 'main.js') {
            return `\0${id}`
          }
        },
        load(id) {
          if (id === '\0main.js') {
            return `import '${modulePreloadPolyfillId}'`
          }
        },
      },
    ],
  }) as Promise<RolldownOutput>

describe('load', () => {
  test('loads modulepreload polyfill', async ({ expect }) => {
    const { output } = await buildProject()
    expect(output).toHaveLength(1)
    expect(output[0].code).toMatchInlineSnapshot(`
      "//#region \\0vite/modulepreload-polyfill.js
      (function polyfill() {
      	const relList = document.createElement("link").relList;
      	if (relList && relList.supports && relList.supports("modulepreload")) return;
      	for (const link of document.querySelectorAll("link[rel=\\"modulepreload\\"]")) processPreload(link);
      	new MutationObserver((mutations) => {
      		for (const mutation of mutations) {
      			if (mutation.type !== "childList") continue;
      			for (const node of mutation.addedNodes) if (node.tagName === "LINK" && node.rel === "modulepreload") processPreload(node);
      		}
      	}).observe(document, {
      		childList: true,
      		subtree: true
      	});
      	function getFetchOpts(link) {
      		const fetchOpts = {};
      		if (link.integrity) fetchOpts.integrity = link.integrity;
      		if (link.referrerPolicy) fetchOpts.referrerPolicy = link.referrerPolicy;
      		if (link.crossOrigin === "use-credentials") fetchOpts.credentials = "include";
      		else if (link.crossOrigin === "anonymous") fetchOpts.credentials = "omit";
      		else fetchOpts.credentials = "same-origin";
      		return fetchOpts;
      	}
      	function processPreload(link) {
      		if (link.ep) return;
      		link.ep = true;
      		const fetchOpts = getFetchOpts(link);
      		fetch(link.href, fetchOpts);
      	}
      })();
      //#endregion
      "
    `)
  })

  test("doesn't load modulepreload polyfill when format is cjs", async ({
    expect,
  }) => {
    const { output } = await buildProject({ format: 'cjs' })
    expect(output).toHaveLength(1)
    expect(output[0].code).toMatchInlineSnapshot(`""`)
  })
})
