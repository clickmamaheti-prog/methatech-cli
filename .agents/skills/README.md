# MethaTech bundled skills

Skills the MethaTech CLI loads natively from this directory
(`{projectRoot}/.agents/skills/<name>/SKILL.md`, see
`sdk/src/skills/load-skills.ts`). No code change was needed: the fork's
skill loader already reads this layout, and its frontmatter parser
(`common/src/types/skill.ts`) accepts the adopted frontmatter as-is (unknown
keys such as `version`, `author`, `platforms`, `prerequisites` are
stripped, not rejected; `metadata.methatech` is kept).

## Sources

- Agent skills (37 of 185), adopted 2026-11-11 from the upstream
  repository at https://github.com/nousresearch/hermes-agent,
  commit 3bcd071226d3d605a2bb3b4f3933e7d583e189d6 (2026-11-11).
  Copied verbatim from `skills/` (core) and `optional-skills/`, then
  rebranded to MethaTech (see "Rebrand" below). The upstream source is
  cited here as provenance; the URL is kept verbatim because it is the
  factual origin of these files.
- ui-ux-pro-max (1): `~/workspace/custom-skills/ui-ux-pro-max/SKILL.md`
  (local custom skill). One conversion: the 11 `${CLAUDE_PLUGIN_ROOT}/...`
  script paths became `scripts/search.py` relative to the skill's base
  directory, which the skill tool prints when the skill loads. The
  `scripts/` + `data/` + `references/` subdirectories were copied whole;
  `scripts/search.py` resolves its data via `Path(__file__).parent.parent /
  "data"`, so it works from any location.

## Rebrand (2026-11-11)

All user-visible brand mentions in the adopted skills were renamed from
the upstream agent's name to MethaTech: skill folder + `name:`
`hermes-agent-skill-authoring` → `methatech-agent-skill-authoring`,
frontmatter `metadata.hermes:` → `metadata.methatech:`, prose, example
paths (`~/.hermes/` → `~/.config/metatech/`, env `HERMES_HOME` →
`METHATECH_CONFIG_DIR`), and the skill-authoring guide, which was
rewritten for the fork (`.agents/skills/methatech-agent-skill-authoring/SKILL.md`).
211 lines changed across 107 files by a classified rename script
(`~/workspace/bottom-test-scratch/rename-brand-hermes.py`, dry-run reviewed
before apply); the script's hold-outs are listed under "Held" below.

## Adopted (38)

Software development: ast-grep, codebase-inspection, code-wiki, dogfood,
github, methatech-agent-skill-authoring, node-inspect-debugger, pr-lens,
python-debugpy, requesting-code-review, rest-graphql-debug, simplify-code,
spike, subagent-driven-development, systematic-debugging,
test-driven-development. DevOps: docker-management, sdlc-review,
setup-wizard-generator. Web: blocked-page-recovery,
cloudflare-temporary-deploy, page-agent, publish-site, scrollcraft.
Research: llm-wiki, scrapling. Design: architecture-diagram,
claude-design, design-md, popular-web-designs, ui-ux-pro-max.
Multi-agent: agent-merge-conflict-arbiter, dynamic-workflow. MCP:
fastmcp. Security: web-pentest. Productivity: document-to-action-items,
meeting-action-items, weekly-review-planning.

## Deliberately NOT adopted (148 of 185 upstream skills)

- har-derived-api-client: written around the upstream agent's own
  browser/CDP capture pathways, which the fork does not have.
- parallel-cli: needs the `parallel-cli` binary and prefers the upstream
  agent's native `web_search`/`web_extract` tools, which the fork does
  not have.
- grounded-citations: depends on the upstream CLI (skill-install command)
  and an agent-home citation ledger.
- Everything else (145): out of scope for a coding agent — Apple/macOS-only
  tools, smart-home, health, gaming, finance/trading models, blockchain,
  ML training (axolotl/unsloth/torchtitan/...), media/video generation,
  social-media schedulers, and skills about other agents
  (claude-code, codex, opencode, openhands, the upstream agent itself).
  The full catalog stays available as reference in
  `~/workspace/hermes-source/` (not modified).

## Held — the word still appears here, deliberately

These are facts, not brand mentions, and were NOT renamed. Do not
"fix" them with a blind replace:

- **Upstream source URL** (above) + the reference clone path
  `~/workspace/hermes-source/`: the factual origin of the adopted
  skills. Renaming either would fabricate provenance.
- **`author:` frontmatter** in the adopted skills (about 30 files):
  authorship attribution for the humans + the upstream agent who wrote
  them. Renaming an author to MethaTech would be misattribution.
  New skills credit the human first, then MethaTech (see the
  skill-authoring guide).
- **Third-party installer flags** in `spike/SKILL.md:28,197`:
  `npx get-shit-done-cc --hermes` — a flag of the GSD project's
  installer selecting its upstream-agent target. The flag belongs to
  that tool; renaming it would break the command.
- **"Hermes" the JavaScript engine** (NOT the agent): React Native's
  bundled JS engine in `ui-ux-pro-max/data/stacks/react-native.csv:28`
  and `ui-ux-pro-max/scripts/tests/test_native_desktop_stack_freshness.py`
  (5 lines). A different product with the same name; renaming it would
  be factually wrong.
- **Phosphor icon name** `ui-ux-pro-max/data/phosphor-icons-upstream.json:2932`:
  `"hermes"` is a third-party icon identifier. Renaming it would break
  the icon lookup.

## Upstream coupling in adopted skills (renamed 2026-11-11)

Before the rebrand, a few adopted skills mentioned upstream paths/commands
in examples (`~/.hermes/...`, `HERMES_HOME`, skill-install commands):
python-debugpy, node-inspect-debugger, fastmcp, code-wiki,
methatech-agent-skill-authoring. Those examples now point at the fork:
config home `~/.config/metatech/` (override `METHATECH_CONFIG_DIR`),
skill scripts at their repo-relative `.agents/skills/<skill>/scripts/`
paths, and no install command (skills in this repo are already installed
by being present). The underlying techniques are generic; the agent
adapts paths to the project.
