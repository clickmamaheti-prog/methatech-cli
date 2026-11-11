/**
 * FORK-SIDE TEST-ONLY SHIM — NOT the upstream `packages/internal` package.
 *
 * Upstream keeps `packages/internal` private: its real `src/env.ts` loads
 * the full environment (including secrets) from Infisical and validates it
 * against the private env schema. That package is absent from the public
 * snapshot, so the CLI test helper (`cli/src/__tests__/test-utils.ts`,
 * `loadCliEnv()`) cannot require it and 24 test files die at setup with
 * "Failed to load CLI environment via packages/internal/src/env".
 *
 * This stub exists ONLY so those tests can load the environment they
 * already define: `test-utils.ts` calls `ensureCliEnvDefaults()` first,
 * which writes placeholder values (TEST_CLIENT_ENV_DEFAULTS /
 * TEST_SERVER_ENV_DEFAULTS) into `process.env`. This module simply exposes
 * the process environment as `env`, mirroring what the real module returns
 * in a test run without Infisical.
 *
 * Rules for this shim:
 * - NEVER import it from production code (`cli/`, `common/`, `sdk/`,
 *   `packages/agent-runtime/`, ...). Upstream's own rule (see the note in
 *   `cli/src/agents/bundled-agents.generated.ts`): `packages/internal/`
 *   holds server-only code and must never be imported from client code.
 * - NEVER put real secrets here. Values come from `process.env` only.
 * - If the real `packages/internal` ever lands in the fork, DELETE this
 *   directory — the real module replaces it.
 */
export const env: Record<string, string | undefined> = { ...process.env }
