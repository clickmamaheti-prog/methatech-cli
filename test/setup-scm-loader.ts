/**
 * Register a Bun loader for tree-sitter `.scm` query files.
 *
 * `@methatech/code-map` statically imports `.scm` query files
 * (packages/code-map/src/languages.ts), typed as `string` content
 * (packages/code-map/src/types.ts: `declare module '*.scm'`). Bun has no
 * built-in loader for `.scm`, so without this preload any test that imports
 * the `@methatech/sdk` barrel dies at import time.
 *
 * NOTE: this file is loaded as a Bun *runtime* plugin (via the `preload`
 * in cli/bunfig.toml), whose onLoad result only accepts the loaders
 * js/jsx/ts/tsx/json/toml/object/... — `loader: 'text'` is REJECTED at
 * runtime ("Expected loader to be one of ..."). So the file contents are
 * emitted as a JS module whose default export is the query text, which is
 * exactly what `languages.ts` consumes (`queryPathOrContent: string`).
 */
import { plugin } from 'bun'

plugin({
  name: 'scm-loader',
  setup(build) {
    build.onLoad({ filter: /\.scm$/ }, async (args) => ({
      contents: `export default ${JSON.stringify(await Bun.file(args.path).text())}`,
      loader: 'js',
    }))
  },
})
