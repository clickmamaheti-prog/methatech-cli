# MethaTech fork — what changed vs upstream Freebuff

This fork is the public Freebuff snapshot (HEAD `5d8bd24`) arranged for
MethaTech by Vector's recommendation, approved by Reza 2026-11-10. The old
MethaTech CLI (`~/workspace/metatech-cli/`, 0.1.12) is NOT touched by anything
here and keeps running as-is until this fork replaces it (a later decision).

No commit / push / publish / deploy has been done from this work. Everything
below is uncommitted local change on top of `5d8bd24`.

## 1. Snapshot defects fixed

The public snapshot could not build a clean baseline, so regressions could
not be proven. Fixed:

| Defect | Fix | File |
|---|---|---|
| `npx tsc --noEmit` in `cli/`: 13 errors, all in test files (`@types/react-dom` missing, `tar` module missing) | Added devDeps `@types/react-dom@19.2.3` + `tar@7.5.22` to `cli/package.json` | `cli/package.json`, `bun.lock` |
| `agent-runtime` test `process-file-block.test.ts` failed: `pg-pool` module missing | Added devDep `pg-pool@3.14.0` to `packages/agent-runtime/package.json` | `packages/agent-runtime/package.json`, `bun.lock` |
| CLI unit suite ran 0 tests: `cli/bunfig.toml` preloads `test/setup-scm-loader.ts`, which did not exist in the snapshot | Created the loader. It registers a Bun runtime plugin mapping `*.scm` (tree-sitter queries imported by `packages/code-map/src/languages.ts`) to a JS module whose default export is the query text. NOTE: a runtime plugin rejects `loader: 'text'` — only `js/jsx/ts/tsx/json/toml/object/...` are accepted — so the file contents are emitted as `export default "<text>"`. | `test/setup-scm-loader.ts` |
| 24 CLI test files died at setup: `cli/src/__tests__/test-utils.ts` requires `packages/internal/src/env` (Infisical-backed, private, absent from the snapshot) | Created a **test-only shim** `packages/internal/src/env.ts` that exposes `process.env` as `env`. `test-utils.ts` already writes all needed placeholder values into `process.env` before the require. NEVER import this shim from production code; delete it if the real `packages/internal` ever lands here. | `packages/internal/src/env.ts`, `packages/internal/README.md` |
| SDK suite: 8 SSRF `readUrl` DNS-pinning tests failed because the test env forced a proxy (`HTTP_PROXY`/`HTTPS_PROXY`/`http_proxy`/`https_proxy`/`ALL_PROXY`/`all_proxy` in `sdk/test/setup-env.ts`) | Removed the 6 proxy env vars from `sdk/test/setup-env.ts`. A/B on the full SDK suite: with the change 1127 pass / 37 fail (parallel) vs without 1119 pass / 45 fail — strictly an improvement. The proxy vars are unrelated to the DNS-pinning assertions (they pin DNS resolution, not transport). | `sdk/test/setup-env.ts` |

Result: typecheck 0 errors; CLI suite runs (4,386 pass, 5 fail — all 5
pre-existing/documented, see §5); SDK suite 1,154/1,208 sequential (was
1,103/1,156 parallel — see §5 for the remaining failures, all pre-existing);
agent-runtime 1,024/1,024; agents 313 pass with the full test env (305 unit +
8 e2e that need no key; the 6 remaining need a live API key, see §5);
code-map 50/50; llm-providers 40/40; common back to the pristine baseline
3,461/3,476 (14 fail, all pre-existing).

## 2. Build-time domains (NEXT_PUBLIC_*)

The binary freezes `NEXT_PUBLIC_*` at build time
(`cli/scripts/build-binary.ts` collects every `NEXT_PUBLIC_*` from the build
environment and inlines it with `--define` / `--env "NEXT_PUBLIC_*"`). They
cannot be overridden at runtime. Values are set in the CI build config, the
same way upstream does it — env vars in the build config, never hardcoded:

- `.github/workflows/ci.yml` (job-level `env:`):
  - `NEXT_PUBLIC_CB_ENVIRONMENT: prod`
  - `NEXT_PUBLIC_METHATECH_APP_URL: https://console.methatech.eu.org` (was `https://console.methatech.eu.org`)
  - `NEXT_PUBLIC_FREEBUFF_APP_URL: https://methatech.eu.org` (added; was unset)
  - `NEXT_PUBLIC_SUPPORT_EMAIL: admin@methatech.eu.org` (decided by Reza
    2026-11-10 22:39 WIB, applied to `ci.yml` by Vector; the binary rebuilt
    2026-11-10 22:55 already freezes this value — verified in binary
    strings. Two other `support@freebuff.com` strings remain elsewhere in
    the binary, in hardcoded copy, not the env slot.)
  - `NEXT_PUBLIC_POSTHOG_API_KEY: ci-not-a-key`, `NEXT_PUBLIC_POSTHOG_HOST_URL: https://us.i.posthog.com` (dummy, unchanged)
  - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: ci-not-a-key`, `NEXT_PUBLIC_STRIPE_CUSTOMER_PORTAL: https://billing.stripe.com/p/login/test` (dummy, unchanged)
  - `NEXT_PUBLIC_WEB_PORT: '3000'`

Local builds must export the same values before running the build script, or
the binary will freeze whatever the local shell has (usually empty).

## 3. Login + models (fork side only)

### Login seam

`common/src/constants/hosts.ts:6` — `FREEBUFF_WEB_URL_PROD` changed from
`https://freebuff.com` to `https://methatech.eu.org`. This is the single
domain-change point for the device-code login flow (the CLI sends the user to
this origin to sign in).

Mechanical follow-on (same change, not separate branding): five `common`
tests asserted the old origin and were updated to the new one —
`convex-http-edge.test.ts` (edge route host), `freebuff-house-growth-ads.test.ts`
(2x: integration logo host, referrals URL), `freebuff-house-product-ads.test.ts`
(creative origin) — plus `HOUSE_AD_TEXT_BUDGET` 28 → 26 in
`common/src/constants/freebuff-house-ad.ts`, because the destination URL is
2 chars longer on the new origin and the ad description loses 2 columns
(the test names that constant as the one to update). The ad copy itself still
says Freebuff — rewording it is Phase 3 branding work, not this task.

**KNOWN GAP — login will fail until the panel catches up.** The CLI's
device-code flow calls `/api/auth/cli/code` and `/api/auth/cli/status` on
that origin. Those endpoints DO NOT EXIST in the MethaTech panel yet — that
is a separate panel task. Until it lands, device-code login against
methatech.eu.org fails (the CLI will show the panel's 404). Nothing in this
fork can work around that; do not "fix" it by pointing the CLI back at
freebuff.com.

### Models via BYOK (MethaTech provider) — now the ALTERNATIVE, not the main path

> Since 2026-11-11 (Reza's binding order, "alurnya ke freebuff"): the
> primary path for panel models is the **panel session** (§9 below) — a
> logged-in user runs the panel's models with the login token, no BYOK
> connection, no exported key. This BYOK connection is the fallback /
> alternative, used only when there is no login credential. Everything
> below still works as documented; its role changed, not its mechanics.

No new provider type, no schema change, no duplicate subsystem. A MethaTech
connection is a plain `openai-compatible` BYOK connection fixed to the panel
API:

- `sdk/src/byok.ts` — new constant `METHATECH_BYOK_BASE_URL =
  'https://api.methatech.eu.org/v1'` (exported via the SDK barrel).
- `cli/src/commands/byok.ts` — `/byok add` accepts `methatech` as a
  provider shorthand: it stores provider `openai-compatible` with the fixed
  base URL above. An explicit base URL with `methatech` is rejected (same
  rule as OpenRouter's fixed endpoint). Usage text documents it.
- Tests: `cli/src/commands/__tests__/byok.test.ts` — 2 new tests (shorthand
  stores the right connection; explicit base URL rejected).

**How to use it** (on the user's machine, e.g. Termux — the key is never in
this repo):

```sh
export METHATECH_API_KEY='<panel-api-key>'
```

Then inside the CLI:

```
/byok add methatech methatech glm-5.3-flash METHATECH_API_KEY
/byok validate methatech
/byok select methatech
```

Model ids are the panel's model ids (e.g. `glm-5.3-flash`,
`deepseek-v4-flash`). The panel governs which models exist and their price /
channel / on-off state; the CLI only relays. The key is stored as an env-var
reference (`env:METHATECH_API_KEY`), never the key itself.

The generic route still works too:

```
/byok add my-panel openai-compatible <model> METHATECH_API_KEY https://api.methatech.eu.org/v1
```

## 4. Binary

Still `freebuff`. The rename to `methatech` is Phase 3 rebranding, not this
task. No package names were changed. The boot banner IS changed — see §7
(MethaTech wordmark, Reza's direct order 2026-11-10).


## 5. Accepted baseline gaps (pre-existing, not fixed here)

Proven pre-existing by running the same tests on the pristine snapshot
(`git stash` A/B — identical failures before any change):

- **common suite: 14 fail / 3,476** (unchanged by this work). 6 reference
  private-repo files (`web/src/content/*`, `desktop/cloud`, canonical prompt
  openings); the rest are Desktop/ads mirror assertions against
  `freebuff-desktop/` and `packages/internal/` sources absent from the
  snapshot. They need the private repo, not a code fix.
- **CLI suite: 3 fail — "mirrored in-place guidance"** reads
  `freebuff-desktop/src/server/services/sponsored-run.ts`, which does not
  exist in the snapshot (private Desktop repo). Same cause as above.
- **CLI suite: 2 fail — environment artifacts, not product bugs.**
  `init-direnv` expects `NODE_EXTRA_CA_CERTS` to be unset, but the Muse VM
  sets it (`/run/hatch/egress-tls/ca-bundle.pem`); `run-state-storage`
  expects a `chmod 0o500` directory to block a rename, but the tests run as
  root (uid 0), which bypasses permission checks. Both pass in a clean
  non-root CI environment.
- **SDK suite: 8 fail — e2e mock-mode agent-loop runaway** (sequential run,
  10 fail total incl. the 2 macOS shims below): `e2e/custom-agents/
  apply-patch-tool.e2e.test.ts` (1), `e2e/features/knowledge-files.e2e.test.ts`
  (2), `e2e/features/project-files.e2e.test.ts` (2), `e2e/integration/
  event-ordering.integration.test.ts` (1), `e2e/workflows/
  multi-turn-conversation.e2e.test.ts` (2). In mock mode the agent loop calls
  the mocked LLM 13,000+ times in <100 ms and dies with "Maximum call stack
  size exceeded". The conversation history DOES reach the mock (proven with a
  temporary spy: turn 1's text is present in turn 2's calls), so this is a
  loop-termination defect in mock mode, not a history bug. Fixing the core
  agent step loop is high-risk and out of scope for snapshot completion;
  live-mode behaviour with a real LLM is a separate verification.
- **SDK suite: 2 fail — macOS-only shims** (`sponsored-runtimes.test.ts`,
  `xcode-select` paths). Linux-irrelevant.
- **agents suite: 6 fail — live e2e tests need a real API key**
  (`e2e/context-pruner.e2e.test.ts` 2, `e2e/editor-best-of-n.e2e.test.ts` 1,
  `e2e/file-explorer.e2e.test.ts` 3): they construct a `MethaTechClient`
  without a key and throw "MethaTech API key not found". Not runnable offline.
  Note: the agents e2e files also refuse to LOAD without the full
  `NEXT_PUBLIC_*` test env (the zod env schema in `common/src/env-schema.ts`
  requires all of them); with the full env, 313 pass / 3 skip / 6 fail. The
  bare `bun test` run inside `agents/` (no env) shows 7 file-load errors —
  that is a missing-env invocation issue, not a code defect; the 305 unit
  tests pass either way.
- **SDK parallel runs** show ~27 extra failures vs sequential (globalThis.fetch
  mock interference across Bun parallel workers; `client.test.ts` passes 9/9
  alone). Run SDK suites sequentially (`--parallel=1`) for trustworthy
  numbers.
- **`/tmp` is a 512M tmpfs** on this VM: stale `freebuff-publish-*` dirs
  from test runs filled it and caused 6 ENOSPC failures in the CLI suite.
  Cleaned; re-running the affected files passes. Keep `/tmp` clean before
  full suite runs.

## 6. Open decisions for Reza

1. ~~`NEXT_PUBLIC_SUPPORT_EMAIL` is still `support@freebuff.com`~~ — DECIDED
   by Reza 2026-11-10 22:39 WIB: `admin@methatech.eu.org` (Cloudflare Email
   Routing → his Gmail; delivery already proven by him). Applied to `ci.yml`
   by Vector; takes effect on the next build.
2. Panel device-code endpoints (`/api/auth/cli/code` +
   `/api/auth/cli/status`) — when are they built? Login is blocked until
   then.
3. Phase 3 rebranding (binary `freebuff` → `methatech`, package/remaining
   copy) — still pending; the boot banner (§7) is done, the rest not started.
4. The old CLI (0.1.12) stays untouched until this fork is released as its
   replacement — decide the cutover moment then.

## 7. Boot banner — MethaTech wordmark (Reza's order 2026-11-10 22:47 WIB)

- Source: `cli/src/utils/freebuff-wordmark.ts` (same file/constants,
  `FREEBUFF_WORDMARK` / `FREEBUFF_WORDMARK_COMPACT` — names kept on purpose,
  only the art + header comment changed). The old art was a terminal
  rendering of the Freebuff "FF" polygon logo + Outfit 600 lettering
  ("reebuff" after the logo); there is no figlet font — the glyphs were
  hand-drawn block art, so the MethaTech glyphs were hand-drawn the same
  way (solid `█`, half-block rounded corners `▄`/`▀`, two-column stems).
- Size is MEDIUM on Reza's binding order ("jangan gede-gede", must fit
  mobile): full wordmark 5 rows x 56 columns (was 6 x 64), compact 4 rows
  x 46 columns (was 5 x 40). No separate logo block — the capital M opens
  the word, the capital T opens "Tech". At 80 columns the banner sits with
  12 columns of margin on each side.
- Render path unchanged: `cli/src/login/constants.ts` (`LOGO` /
  `LOGO_SMALL`) → `cli/src/hooks/use-logo.tsx` (width >= 70 → full,
  >= 20 → small) and `cli/src/components/freebuff-chat-header.tsx`
  (widest variant that fits, else text fallback). The text fallbacks in
  those two files changed with the banner (`FREEBUFF` → `METHATECH`,
  `Freebuff` → `MethaTech`, `ASCII_LOGO_LINES` 6 → 5). One test expectation
  updated for the new art (`freebuff-chat-header.test.tsx`: first line
  `███████` → `██   ██`, fallback `Freebuff` → `MethaTech`).
- Verified by GLM from the rebuilt binary (v0.0.0-fork): tmux screenshots
  80x24 + 160x40 + 60x24 (compact) — "MethaTech" legible, centered,
  "Press ENTER to login..." intact. PNGs in
  `~/workspace/your_files/fork-screenshots/methatech-boot-{mobile-80x24,desktop-160x40,narrow-60x24}.png`.
  `npx tsc --noEmit` in `cli/` exit 0; chat-header tests 6/6 pass.
- Known edge: the compact variant is 46 columns (old one was 40), so on
  terminals narrower than 46 columns `useLogo` slices it (pre-existing
  slicing behaviour, same as the old banner below 40 columns).
- NOT changed here: binary name (still `freebuff`), package names, login
  seam, BYOK, build domains, `ci.yml`, colours, any other copy.

## 8. Skills (Hermes + ui-ux-pro-max) and web-intelligence tools (2026-11-11)

- Skills: 38 adopted into `.agents/skills/` (37 Hermes + ui-ux-pro-max),
  loaded from disk by the fork's native skill system
  (`sdk/src/skills/load-skills.ts`, tool `skill`). The model sees them as
  the `skill` tool with all 38 names in its description (native `tools`
  payload, verified in a mock PTY run: `SKILLS_IN_TOOL_DESC=38/38`).
  Provenance + the 148 deliberately not adopted: `.agents/skills/README.md`.
- Web-intelligence tools (native fork tools, built on the fork's own tool
  pattern — params in `common/src/tools/params/tool/`, handlers in
  `packages/agent-runtime/src/tools/handlers/tool/`, transport in
  `packages/agent-runtime/src/llm-api/web-intelligence-api.ts`):
  `exa_search`, `exa_find_similar`, `firecrawl_scrape`, `firecrawl_crawl`,
  `firecrawl_check_crawl_status`. Wired into `common/src/tools/constants.ts`
  (`toolNames` + `publishedTools`), `common/src/tools/list.ts`,
  `packages/agent-runtime/src/tools/handlers/list.ts`,
  `common/src/templates/initial-agents-dir/types/tools.ts` (public agent
  types), the base2 main agent, the base3 CLI root, and the
  `researcher-web` subagent (its prompt now names Exa/Firecrawl). The
  base3 `noWeb` eval flag withholds all seven web tools.
- Keys ONLY from the shell environment, read at call time, never written
  to any file: `EXA_API_KEY`, `FIRECRAWL_API_KEY`. A missing key returns a
  clear "not set" error instead of failing silently. URL inputs are
  checked lexically (http/https only, no credentials, no localhost/private
  hosts); the check does not DNS-resolve, so unlike the SDK's pinned
  fetch it cannot stop DNS rebinding — the fetch happens provider-side.
- Fetch fix that makes these tools work at all in BYOK runs: the handlers
  pass `globalThis.fetch`, NOT the runtime-injected `fetch`. The injected
  fetch is the MethaTech hosted-services fetch, stubbed to throw in BYOK
  runs (`sdk/src/impl/agent-runtime.ts:171-177`). Exa/Firecrawl are
  third-party APIs paid with the user's own keys, not MethaTech hosted
  services — same precedent as the direct provider fetch in
  `sdk/src/impl/model-provider.ts`, `sdk/src/tools/read-url.ts`, and
  `sdk/src/byok.ts`.
- Test seams: `EXA_API_BASE_URL` (default `https://api.exa.ai`) and
  `FIRECRAWL_API_BASE_URL` (default `https://api.firecrawl.dev/v2`).
  Verified against a local fake API + mock provider in PTY (mobile 80x24
  + desktop 160x40): all five tools executed and returned formatted
  results; live validation against the real Exa/Firecrawl APIs with real
  keys is still pending Reza.
- MCP: already present upstream and wired end to end — `mcp.json` in
  `{cwd}/.agents`, `{cwd}/../.agents`, or `{homedir}/.agents`
  (`sdk/src/agents/load-mcp-config.ts`); merged into base agents at
  `cli/src/utils/local-agent-registry.ts:378`; tool definitions via
  `packages/agent-runtime/src/mcp.ts` (`getMCPToolData`, exposed as
  `server__tool`); execution via `sdk/src/run.ts` (`callMCPTool`). No
  rebuild was needed. Verified in PTY with a local stdio MCP server
  (`testecho__echo` → `"ECHO: halo mcp"`).
- Endpoints used (public API docs, checked 2026-11-11): Exa
  `POST https://api.exa.ai/search` + `POST /findSimilar` (header
  `x-api-key`; note `/findSimilar` is marked deprecated by Exa in favour
  of `/search` with a describing query, kept because the tool was
  explicitly ordered); Firecrawl v2 `POST /scrape`, `POST /crawl`,
  `GET /crawl/{id}` at `https://api.firecrawl.dev/v2` (header
  `Authorization: Bearer`).

## 9. Panel session as the primary path + web-intelligence via the panel (2026-11-11)

Reza's binding order: the fork follows the original Freebuff flow — user
logs in, models are directly available through that account, no BYOK setup,
no exported key. BYOK is only the alternative for outside providers.
Reference: the original Freebuff source (`~/workspace/freebuff-source/`,
never the old CLI), `sdk/src/impl/model-provider.ts:584-600` (non-BYOK
models go to the backend's OpenAI-compatible endpoint with the session
apiKey) and `cli/src/hooks/use-send-message.ts:336-351` (a selected BYOK
runs directly; otherwise admission) + `cli/src/state/freebuff-chat-store.ts:73-81`
(admission = local session-store check). The panel is the backend here.

### Model routing (fork)

- `sdk/src/impl/model-provider.ts` — new MethaTech session branch before
  the inherited MethaTech branch: when `isMethatechModelId(model)`, the
  request goes to the panel relay at `getWebsiteUrl() + /v1/chat/completions`
  with `Authorization: Bearer ${apiKey}` where `apiKey` is the login token
  (`cli/src/utils/methatech-client.ts` already resolves the login token
  first). Same host as the login (build-time `NEXT_PUBLIC_METHATECH_APP_URL`),
  same pattern as Freebuff's own `getWebsiteUrl() + /api/v1` — the panel
  binary serves `/v1` on the console host too (verified live 2026-11-11:
  `POST /v1/chat/completions` without a token answers 401 on BOTH
  `console.methatech.eu.org` and `api.methatech.eu.org`, i.e. the route
  exists on both). The panel authorizes the model against the logged-in
  account (catalog + quota of that account, including the free models
  from registration). The inherited MethaTech branch is untouched for
  non-MethaTech models. Earlier the branch pointed at the hardcoded
  `METHATECH_BYOK_BASE_URL` (`https://api.methatech.eu.org/v1`); that
  was wrong for test panels and is now gone from this file.
- `cli/src/utils/methatech-model-directory.ts` — `row()` is implemented
  (`methatechCatalogRow`): a panel model yields a `FreebuffCatalogRow`
  whose `key` and `handle` are the plain panel model id (the panel relay
  resolves the plain id; there is no opaque server handle), `access:
  'open'` (the panel enforces balance server-side with 402; the fork
  never locks a row locally), `dataUse: 'service'`, `compaction`
  undefined (base3 falls back to `compactionPolicyForModel(handle)`),
  `legacyDigests: []`. This is the fix for the PTY blocker of 2026-11-11
  14:23 UTC: with `row: () => undefined`, `selectedFreebuffCatalogRoot()`
  never built a catalog root, so every turn ran plain base3 whose model
  defaults to `OPUS_MODEL` (`anthropic/claude-opus-5`,
  `agents/base3.ts:285`) — `isMethatechModelId` was false, the inherited
  MethaTech branch ran, and the panel 404'd `POST /api/v1/chat/completions`
  ("Invalid URL (POST /api/v1/chat/completions)"). With the row, the
  turn runs the ONE catalog root (`base3-free-catalog`) built from the
  row, model = the user's pick — the Freebuff catalog flow. (BYOK runs
  never hit this: `sdk/src/run.ts:783-798` applies the BYOK model to
  every template, masking the default.)
- `cli/src/hooks/use-send-message.ts` — when the selected model is a panel
  model AND `getUserCredentials()?.authToken` exists, the send takes the
  session path: no `ensureMethatechByokConnection` call, and the Freebuff
  admission gate is skipped for the session path (admission is for the
  MethaTech backend, which is not the panel). When there is NO login
  credential, the old behaviour stands: `ensureMethatechByokConnection`
  (env key `METHATECH_API_KEY`) as the alternative; if that also fails,
  the send falls through to the admission path, which prompts login.
- `cli/src/utils/byok.ts` — `ensureMethatechByokConnection` doc updated:
  fallback/alternative now. Users who already have a `methatech` BYOK
  connection keep it working: when logged in, the session path takes
  precedence (models follow the login account — if the env key belonged
  to a different account, the login account wins); when logged out, the
  BYOK connection runs as before. No migration needed.
- Priority order: (a) panel session (login token → panel relay +
  panel web-intelligence proxy); (b) BYOK provider of the user's choice
  (OpenRouter, Ollama, UncensoredLLMs, ...) + direct env keys, only when
  the user selects it or is not logged in.

### Model sync from the panel (fork, 2026-11-12)

Models come from the SERVER, not from the CLI build. The panel is the
source of truth, and the CLI syncs its live model list at runtime — a
model added on the panel shows up in the CLI with no code change, no git
pull and no npm republish. (Reza's order 2026-11-11 ~23:07 UTC.)

- `cli/src/utils/freebuff-model-catalog.ts` — the catalog fetch asks the
  panel's `GET /api/available_model` (public; the bearer and device
  headers ride along and are ignored). It used to ask
  `GET /api/v1/freebuff/models`, which the panel does not serve, so every
  fetch answered 404 and the CLI silently stayed on its compiled catalog.
- `cli/src/utils/methatech-panel-catalog.ts` (new) — converts the panel
  answer (`{ data: { <id>: { owned_by, price: { input, output, locked } } } }`)
  into the server-catalog shape the picker, model store and session hooks
  already read. A row's key and handle are both the plain panel id; the
  free rows are the 9 compiled free ids plus any zero-price row; the
  tagline is `Free` or `$in/$out per 1M` (ratio x 2, the panel's dollar
  rule); a display name comes from the compiled catalog when the id is
  known, else it is prettified from the id (`:variant` becomes a
  parenthetical, so variants never share a name); `legacyDigests` carries
  the id's digest so a saved pick migrates onto its live row. Locked
  price rows are dropped. Refresh is every 10 minutes while the CLI runs.
- `common/src/constants/methatech-models.ts` stays only as the fallback
  (when the panel cannot be reached) and as the source of the display
  names, free-model order and context windows the panel does not send.
  Verified live 2026-11-12: the converter turns the real panel answer
  into a valid catalog of 77 rows (13 free, 64 paid).

### Web-intelligence via the panel (fork + panel)

- Panel (repo `done-hub`, uncommitted, NOT deployed): new endpoints under
  `router/api-router.go`, `POST /api/v1/web-intelligence/exa/search`,
  `POST /exa/find-similar`, `POST /firecrawl/scrape`, `POST /firecrawl/crawl`,
  `GET /firecrawl/crawl/:id` — all behind `middleware.OpenaiAuth()`
  (same auth as `/api/v1/me`), flat JSON responses (same rule as
  `CliAuthCode`/`CliMe`). Handlers in `controller/web_intelligence.go`
  forward the request body to Exa/Firecrawl as-is and return the upstream
  status + JSON as-is. Server keys from env only
  (`common/config/web_intelligence_env.go`: `EXA_API_KEY`,
  `FIRECRAWL_API_KEY`; base-URL overrides `EXA_API_BASE_URL` /
  `FIRECRAWL_API_BASE_URL` for tests), never hardcoded, never in git.
  Request body capped at 64 KiB, upstream response at 1 MiB, 30 s timeout;
  `http` upstream only allowed for loopback (tests).
- Fork transport (`packages/agent-runtime/src/llm-api/web-intelligence-api.ts`):
  panel proxy FIRST when the handler passes a login token (`apiKey`) and
  the panel base URL comes from `clientEnv.NEXT_PUBLIC_METHATECH_APP_URL`
  (same precedent as `llm-api/methatech-web-api.ts`) — `POST
  {panel}/api/v1/web-intelligence/<op>` with `Bearer <login token>`, same
  JSON body as the direct call, same formatters on the proxied JSON.
  Fallback to the direct env-key call ONLY on: no login token, no panel
  base URL, panel unreachable (network error), 404 (panel too old),
  502, 503 (proxy not configured on the panel). A real panel failure is
  surfaced, never silently worked around: 401/403 (bad token), 400, 402
  (upstream quota), 429. Handlers (`exa-search`, `exa-find-similar`,
  `firecrawl-scrape`, `firecrawl-crawl`, `firecrawl-check-crawl-status`)
  now declare optional `apiKey` + `clientEnv` params (provided by the
  executor, same as `handleWebSearch`) and pass them through.
- Tests: `controller/web_intelligence_test.go` in the panel (7 tests, all
  pass: proxy forwards key + body, 503 without a key, 400 empty/bad JSON,
  GET crawl status, non-loopback http rejected, upstream error status
  passed through). Fork: 6 new tests in
  `packages/agent-runtime/src/tools/handlers/tool/__tests__/web-intelligence.test.ts`
  (panel proxy used with the login token, 404 fallback to direct, 401
  surfaced without fallback, scrape + crawl-status via panel, panel
  skipped without a token) — suite 21/21 pass. Typecheck clean in
  `sdk/`, `packages/agent-runtime/`, `cli/`.
- Two more backend-surface gaps found by the PTY run (2026-11-11) and
  fixed in source, not worked around:
  - Agent validation: `cli/src/hooks/use-agent-validation.ts`
    (`shouldValidateAgentsRemotely`) sends `POST
    {websiteUrl}/api/agents/validate` whenever no BYOK connection is
    selected — the panel has no such endpoint, so the send was blocked
    with "agent validation failed ... (HTTP 404)". Fix in the fork:
    `hasMethatechSession()` — on the panel session path the CLI validates
    agent definitions LOCALLY (the SDK's built-in Zod validation, which
    still runs and can still fail the send), the same rationale as BYOK
    ("BYOK runs validate local agent definitions without sending them to
    Freebuff"). The panel deliberately does NOT implement
    `/api/agents/validate`: it holds no spawnable-agent database, and a
    stub returning empty errors would claim a validation it does not
    perform. Tests: 2 new cases in
    `cli/src/hooks/__tests__/use-agent-validation.test.ts` (session →
    local, no hosted request; panel model without login → remote).
  - Health check: `sdk/src/client.ts` `checkConnection()` probes GET
    `/api/healthz` expecting 200 + `{"status": "ok"}`; the panel 404'd
    it, so the TUI showed a permanent "Can't reach MethaTech's servers"
    warning on the session path (display-only, never blocked a send).
    Fix in the panel: `router/api-router.go` registers `GET /api/healthz`
    on the existing `controller.Health` handler (which already returns
    exactly `{"status": "ok"}`), next to the existing `/health` route.
    NOT implemented on the panel (and not needed for a send): the
    MethaTech-only `/api/v1/freebuff/session`, `/api/v1/freebuff/models`,
    `/api/v1/freebuff/streak`, `/api/v1/ads/policy`, `/api/ads`,
    `/api/logs` — the CLI calls them best-effort and continues on 404.
    If the panel ever needs them, that is separate work, not a stub.
  - Agent runs: `sdk/src/impl/database.ts` `startAgentRun` POSTs
    `/api/v1/agent-runs` (`{action: "START"}`) and throws "Failed to
    start agent run" when the response carries no `runId` — the panel had
    no such route, so the first successful send died there (PTY 2026-11-11
    14:20 UTC). Fix in the panel: `controller/agent_runs.go`, `POST
    /api/v1/agent-runs` behind `middleware.OpenaiAuth()`, flat JSON.
    START creates an in-memory run (capped at 10,000, oldest evicted)
    and returns `{"runId": "run_<12 random bytes hex>"}`; FINISH closes
    it with status/steps/credits; FINISH of an unknown run (e.g. after a
    panel restart) still returns 200. No database table, no invented
    billing. Tests: `controller/agent_runs_test.go`, 4 tests, all pass.
  - Catalog root (the 14:23 UTC blocker, fixed in the fork, see above):
    `row()` was `() => undefined`, so turns ran plain base3 with
    `OPUS_MODEL` and the inherited MethaTech branch 404'd on the panel.
    Fixed by `methatechCatalogRow` in
    `cli/src/utils/methatech-model-directory.ts`.
- PTY proof (2026-11-11 ~14:37–14:39 UTC, test panel :3033 + fake
  upstream :8898, CLI env clean, NO env key exported, NO BYOK setup):
  login persisted from the device-code approval; `halo` → mock reply
  "Halo! Ada yang bisa saya bantu hari ini?" via the panel relay
  (`POST /v1/chat/completions` 200, user-agent
  `ai-sdk/openai-compatible/0.0.0-test/methatech`, token "MethaTech
  CLI", model `deepseek-v4-flash`); `exa_search` → TUI shows
  "▸ Exa Search", panel `POST /api/v1/web-intelligence/exa/search` 200
  (token "MethaTech CLI"), fake upstream `POST /search` with the SERVER
  key; `firecrawl_scrape` → TUI shows "▸ Firecrawl Scrape", panel
  `POST /api/v1/web-intelligence/firecrawl/scrape` 200, fake upstream
  `FIRECRAWL-SCRAPE`. Screenshots (checked by eye, mobile 80x24 +
  desktop 160x40): `~/workspace/your_files/fork-screenshots/session-webintel-mobile.png`,
  `session-webintel-desktop.png`. Note: the mock's final answers repeat
  its SHORT fallback text because its parser does not recognize the CLI's
  tool-result message format — a test-harness artifact, not a product
  defect; the tool executions are proven by the panel + upstream logs.
  New tests: `sdk/src/impl/__tests__/methatech-session-model.test.ts`
  (2: panel model → relay URL on the login host with the login token;
  non-panel model → MethaTech branch) and
  `cli/src/utils/__tests__/methatech-model-directory.test.ts` (3: row
  handle = panel id, paid row premium, non-panel row undefined).
  Final runs: Go controller `TestAgentRuns|TestWebIntel` 11/11 pass,
  `go vet` clean; SDK byok/session suites 58/58; CLI
  use-send-message + use-agent-validation + methatech-byok +
  methatech-model-directory 24/24; agent-runtime web-intelligence 21/21;
  tsc `--noEmit` clean in `sdk/`, `packages/agent-runtime/`, `cli/`.
- OPEN (not invented, not built): the panel has NO per-user quota/billing
  for these calls — `GlobalAPIRateLimit` (per IP) is the only throttle, so
  every authenticated user draws on the same server keys and one heavy
  user can burn the Exa/Firecrawl balance for everyone. Add a per-user
  cap before exposing this to untrusted users. Panel deploy + putting the
  real keys into the panel env still need Reza's explicit order.

## 10. E2B sandboxes via the panel (2026-11-11/12)

- Panel (commit `d2b87ee`, DEPLOYED LIVE 2026-11-12 ~00:21 WIB, PID
  106988): `/v1/e2b/*` endpoints (create/list/get/delete/commands/files)
  behind `OpenaiAuth`, E2B keys from panel env only (`E2B_API_KEY` +
  `E2B_API_KEY_FALLBACK`, fallback-key retry on 429/402 at create).
- Fork transport (`packages/agent-runtime/src/llm-api/e2b-api.ts`): panel
  proxy first with the login token; no direct E2B fallback with a user env
  key, by design (keys stay in the backend). Fallback to local execution
  (or "unavailable") only on: no login token, no panel base URL, panel
  unreachable, 404/502/503. Real panel failures are surfaced, never
  silently worked around: 401/403, 400, 402, 429.
- Tools: `e2b_sandbox` (start/stop/status), `e2b_screenshot` (Playwright
  inside the sandbox, PNG to `.methatech/e2b-shots/`). SYNC terminal
  commands run in the sandbox when a session is active; BACKGROUND stays
  local (dev servers and watchers need this machine).
- Lifecycle (Reza's decision 2026-11-11 23:52 WIB): the sandbox dies
  automatically when the agent run ends — the kill runs in the
  `loopAgentSteps` `finally` block, so it also runs on abort and on
  error, not only on success. Idempotent, never throws, never
  double-kills (the session is cleared BEFORE the panel call; a fresh
  10 s timeout signal, never the run's signal, which may be aborted).
  Lazy recreate: the next SYNC command or screenshot with no active
  session creates a fresh sandbox automatically via the panel — no manual
  start. Manual `e2b_sandbox start` remains as an override (a re-start
  kills the old session first, so it cannot leak).
- Probe budgets: lazy-create 5 s (`E2B_LAZY_CREATE_TIMEOUT_MS`) — a dead
  panel must not stall the first command of a run; explicit start keeps
  the 30 s budget. Kill budget 10 s.
- BYOK runs never touch the panel for E2B: the SDK passes the placeholder
  apiKey `'byok-local'` (`BYOK_LOCAL_USER_ID`) when there is no hosted
  key, and the transport returns "not available" without any fetch, so
  sync commands run locally and the BYOK "no MethaTech request" invariant
  holds. Explicit `e2b_sandbox start` in a BYOK run reports "not logged
  in" (device-code login) instead of a confusing 401.
- Tests: `e2b-api` (incl. the BYOK no-fetch case), `e2b-session` (kill
  idempotence, ensure), `e2b.test.ts` (lazy-create SYNC, local fallback
  with the "ran LOCALLY" note, 402 surfaced, stop failure),
  `loop-agent-steps` (kill on success/abort/error, no-session no-op).
  Full agent-runtime suite 1081/1081; `tsc --noEmit` clean in
  `agent-runtime`, `common`, `cli`, `sdk`. Note: loop tests that run real
  shell commands stub `globalThis.fetch` to throw — no panel exists in
  the test env, and the lazy-create probe must fail fast there instead of
  hanging on a real fetch to the fake panel host.
- NOT proven live: TUI end-to-end (old PTY harness blocked by injection
  checks), Playwright screenshot against a REAL E2B sandbox, Connect-JSON
  wire vs real envd.
- OPEN (not invented, not built): Playwright template (the base template
  has no Playwright; install-on-first-screenshot is slow and may exceed
  the 120 s panel timeout; custom template option), no per-user quota
  (same gap as web-intelligence — one heavy user can burn the shared E2B
  credit). Trade-off to know: when logged in and the panel is DOWN, the
  first SYNC command of a run waits up to the 5 s probe budget before
  falling back to local.
