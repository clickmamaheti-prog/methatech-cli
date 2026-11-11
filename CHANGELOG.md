# MethaTech CLI Changelog
## 1.0.2 — 2026-11-12

- Linux ARM64 build alongside x64: one package, two binaries, the
  launcher picks the right one. Installs on ARM64 Linux and inside
  proot-distro Ubuntu on Termux (Android ARM). Direct Termux without
  proot is not supported: the binary needs glibc, Termux ships Bionic.
- Nothing else changed from 1.0.1.


## 1.0.1 — 2026-11-12

First npm release (`methatech`, Linux x64 binary).

- E2B sandbox wiring: the agent runs commands and screenshots inside a cloud
  sandbox served by the MethaTech panel (`/v1/e2b/*`); keys stay in the panel
  backend, the CLI speaks plain JSON to it.
- Sandbox auto-kill: the sandbox dies automatically when an agent run ends
  (success, abort, or error); the next run lazily creates a fresh one.
- Panel session is the primary model path (device-code login, 27 panel
  models, 9 free, DeepSeek V4 Flash default); BYOK stays as an alternative.
- Web intelligence via the panel (Exa + Firecrawl) with local env-key
  fallback; 38 MethaTech skills bundled in the repo (`.agents/skills/`).
- Agent identity is MethaTech throughout; no Freebuff/Buffy/Codebuff
  user-visible strings.

Tests (this tree, mock/fake only): agent-runtime 1081/1081, E2B + loop
128/128, SDK byok-run 17/17, tsc exit 0 (agent-runtime, common, cli, sdk).
Pre-existing failures vs HEAD (A/B stash): cli 7, sdk 2 (macOS shim),
common 14. Live E2B screenshot on a real sandbox and TUI end-to-end are
not yet proven; the panel deploy d2b87ee is live.
