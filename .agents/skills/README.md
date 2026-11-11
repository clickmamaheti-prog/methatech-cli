# MethaTech bundled skills

Skills the MethaTech CLI loads natively from this directory
(`{projectRoot}/.agents/skills/<name>/SKILL.md`, see
`sdk/src/skills/load-skills.ts`). No code change was needed: the fork's
skill loader already reads this layout, and its frontmatter parser
(`common/src/types/skill.ts`) accepts Hermes frontmatter as-is (unknown
keys such as `version`, `author`, `platforms`, `prerequisites` are
stripped, not rejected; `metadata.hermes` is kept).

## Sources

- Hermes Agent skills (37 of 185): https://github.com/nousresearch/hermes-agent,
  commit 3bcd071226d3d605a2bb3b4f3933e7d583e189d6 (2026-11-11).
  Copied verbatim from `skills/` (core) and `optional-skills/`.
- ui-ux-pro-max (1): `~/workspace/custom-skills/ui-ux-pro-max/SKILL.md`
  (local custom skill). One conversion: the 11 `${CLAUDE_PLUGIN_ROOT}/...`
  script paths became `scripts/search.py` relative to the skill's base
  directory, which the skill tool prints when the skill loads. The
  `scripts/` + `data/` + `references/` subdirectories were copied whole;
  `scripts/search.py` resolves its data via `Path(__file__).parent.parent /
  "data"`, so it works from any location.

## Adopted (38)

Software development: ast-grep, codebase-inspection, code-wiki, dogfood,
github, hermes-agent-skill-authoring, node-inspect-debugger, pr-lens,
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

## Deliberately NOT adopted (148 of 185 Hermes skills)

- har-derived-api-client: written around Hermes's own browser/CDP capture
  pathways, which the fork does not have.
- parallel-cli: needs the `parallel-cli` binary and prefers Hermes native
  `web_search`/`web_extract` tools, which the fork does not have.
- grounded-citations: depends on the Hermes CLI (`hermes skills install`)
  and a `$HERMES_HOME` citation ledger.
- Everything else (145): out of scope for a coding agent — Apple/macOS-only
  tools, smart-home, health, gaming, finance/trading models, blockchain,
  ML training (axolotl/unsloth/torchtitan/...), media/video generation,
  social-media schedulers, and skills about other agents
  (claude-code, codex, opencode, openhands, hermes-agent itself).
  The full catalog stays available as reference in
  `~/workspace/hermes-source/` (not modified).

## Known Hermes coupling in adopted skills (kept verbatim)

A few adopted skills mention Hermes paths/commands in examples
(`~/.hermes/...`, `HERMES_HOME`, `hermes skills install`): python-debugpy,
node-inspect-debugger, fastmcp, code-wiki, hermes-agent-skill-authoring.
The underlying techniques are generic; the agent adapts paths to the
project. A conversion pass can rewrite those examples on demand.
