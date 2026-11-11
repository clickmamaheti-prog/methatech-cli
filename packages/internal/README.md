# packages/internal — fork-side test-only shim

Upstream keeps `packages/internal` private (server-only code, Infisical-backed
env loading). It is absent from the public snapshot.

This directory contains ONLY a minimal `src/env.ts` stub so the CLI test suite
can run: `cli/src/__tests__/test-utils.ts` requires
`../../../packages/internal/src/env` to load the CLI test environment. The stub
exposes `process.env` as `env`; the test defaults are set by `test-utils.ts`
itself before the require. See the header comment in `src/env.ts`.

Do NOT import this shim from production code, do NOT put secrets here, and
delete this directory if the real `packages/internal` ever lands in the fork.
