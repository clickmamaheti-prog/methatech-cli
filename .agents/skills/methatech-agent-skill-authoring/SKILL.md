---
name: methatech-agent-skill-authoring
description: "Author SKILL.md files for the MethaTech agent: frontmatter and structure."
version: 2.0.0
author: MethaTech
license: MIT
platforms: [linux, macos, windows]
metadata:
  methatech:
    tags: [skills, authoring, methatech-agent, conventions, skill-md]
    related_skills: [requesting-code-review]
---

# Authoring MethaTech Skills

## Overview

A skill is a `SKILL.md` file the MethaTech CLI loads from a skills
directory. There are two places one can live:

1. **Bundled (this repo):** `.agents/skills/<name>/SKILL.md` inside the
   methatech-cli repo — committed, shipped with the CLI. Use `write_file`
   + `git add`.
2. **Project-local:** `.agents/skills/<name>/SKILL.md` inside a user's
   own project — personal, not shared. Same layout, same loader.

The fork has no skill-manager tool and no install command: skills are
plain files, created and edited with `write_file` / `patch`, and the
loader (`sdk/src/skills/load-skills.ts`) scans the skills directory at
session start. A new skill is visible in the NEXT session, not the
current one. This is expected, not a bug.

Skills in this repo are flat (no category subdirectories, no
`optional-skills/` tree). If a skill is niche, heavy, or vertical-
specific, say so in its description and `When to Use` — do not invent
a tier directory for it.

## When to Use

- User asks you to add a skill "in this repo / project"
- You're committing a reusable workflow that should ship with the CLI
- You're editing an existing skill under `.agents/skills/` (use `patch`
  for small edits, `write_file` for rewrites)
- Don't use for: one-off instructions that belong in the conversation,
  not in a file

## Required Frontmatter

Validator source of truth: `common/src/types/skill.ts`
(`SkillFrontmatterSchema`) + `common/src/constants/skills.ts`. The
loader only REQUIRES `name` + `description`; everything else is
convention and provenance. Unknown keys (`version`, `author`,
`platforms`, `prerequisites`) are stripped, not rejected; `metadata`
is a free-form bag.

Hard requirements (the loader enforces these):

- Starts with `---` as the first bytes (no leading blank line).
- Closes with `\n---\n` before the body.
- Parses as a YAML mapping.
- `name` field present: lowercase alphanumeric with single hyphen
  separators (`SKILL_NAME_REGEX`), ≤ 64 chars (`SKILL_NAME_MAX_LENGTH`).
  The `name` is the key the agent invokes the skill by — it must match
  the directory name.
- `description` field present, clamped at 1024 chars
  (`SKILL_DESCRIPTION_MAX_LENGTH`) — but see the hardline below, which
  is much stricter.
- Non-empty body after the closing `---`.

Repo-standard shape (all fields expected, even where the loader doesn't
enforce them):

```yaml
---
name: my-skill-name               # lowercase, hyphens, ≤64 chars
description: Concise capability statement, under sixty chars.
version: 0.1.0                    # semver; new skills start at 0.1.0
author: Real Name (github-handle), MethaTech
license: MIT
platforms: [linux, macos, windows]   # audit, don't guess — see Platform Gating
metadata:
  methatech:
    tags: [Short, Descriptive, Tags]
    related_skills: [other-skill-in-this-repo]
---
```

### `description` rules (HARDLINE — the loader's 1024 is NOT the standard)

- **≤ 60 characters.** One sentence. Ends with a period.
- State the capability, not the implementation, and don't repeat the skill name or its category name (the index prints the category above the skill).
- No marketing words ("powerful", "comprehensive", "seamless", "advanced").
- 60 is the width the system prompt skill index shows; a longer legacy
  description is clipped at a word boundary.
- If the description contains a `:`, wrap it in double quotes or YAML parses it as a mapping and the loader crashes. Quotes don't count toward the 60.

Good: `Track named companies for material news with cited digests.`
Bad: `Use when a user asks to monitor named competitors or companies for product launches, pricing changes, funding, ...` (240 chars — rejected in review)

### `author` rules

- Credit the **human first**, then "MethaTech" as secondary collaborator: `Ben Barclay (benbarclay), MethaTech`.
- Never `author: MethaTech` alone for contributed skills — credit the human, not the tool, even (especially) when an agent drafted the text.
- Skills adopted from an upstream project KEEP their original `author:`
  line untouched. Attribution is not rebranded: do not rewrite an
  upstream author's name to MethaTech. (See `.agents/skills/README.md`
  for what is held and why.)

### `related_skills` rules

- Every entry must resolve to an existing skill in `.agents/skills/`.
  Do not reference skills that were only planned, live in another PR,
  or exist only in a different project.
- Verify each entry: `search_files(pattern='<name>', target='files', path='.agents/skills')`.

## Platform Gating: audit, don't trust

`platforms:` gates loading by host OS. Set it from what the skill's prose and scripts actually invoke:

| Skill uses only… | `platforms:` |
|---|---|
| MethaTech tools + stdlib Python + cross-platform CLIs | `[linux, macos, windows]` |
| bash pipelines, `grep`/`awk`/`sed` chains, heredocs | `[linux, macos]` |
| `osascript`, `defaults`, `pmset` | `[macos]` |
| `apt`/`systemctl`/`/proc` | `[linux]` |

<!-- no-tmp: ok — names the anti-pattern skill authors must avoid -->
POSIX-only signals to search for in `scripts/`: `fcntl`, `termios`, `pty`, `os.fork`, `os.killpg`, `signal.SIGKILL`, `os.kill(pid, 0)` liveness checks, hardcoded `/tmp` `/proc` `/etc`. Default posture: fix cross-platform first (`tempfile.gettempdir()`, `pathlib.Path`, `psutil.pid_exists`); gate narrower only when the dependency is genuinely platform-bound, and say why in `## Pitfalls`.

## Size Limits

- No content cap is enforced by the fork loader — keep SKILL.md lean
  anyway: target **~100 lines for a simple skill, ~200 for a complex
  one**. Peer skills sit at 8-14k chars.
- Bulky or branch-specific material goes in `references/*.md`, `templates/`, or `scripts/` — pointed to from SKILL.md, not inlined.
- Don't expect the model to inline-write parsers or non-trivial logic every call — ship a helper script in `scripts/` and reference it by path.

## Body Structure (modern section order)

```
# <Skill> Skill
2-3 sentence intro: what it does, what it doesn't do, dependency stance.

## When to Use          — bulleted triggers (+ "Don't use for:" counter-triggers)
## Prerequisites        — exact env vars, installs, API key sourcing
## How to Run           — canonical invocation through the `terminal` tool
## Quick Reference      — flat command list, no narration
## Procedure            — numbered steps, each with a checkable completion criterion
## Pitfalls             — known limits, things that look broken but aren't
## Verification         — how to prove the skill worked
```

Not every section applies to every skill (a pure-procedure task skill may have no Quick Reference), but When to Use + actionable body + Pitfalls + Verification are the minimum. Cut marketing intros, "Setup Check" no-ops, and re-explanations of env vars already in Prerequisites.

### Reference MethaTech tools, not raw shell

When the skill needs a capability, name the proper MethaTech tool in backticks: `terminal`, `read_file`, `write_file`, `patch`, `search_files`, `web_search`, `web_extract`, `browser_exec`, `vision_analyze`, `delegate_task`, `cronjob`. Do NOT name shell utilities the agent already has wrapped (`grep` → `search_files`, `cat` → `read_file`, `sed`/`awk` → `patch`, `find`/`ls` → `search_files target='files'`). A CLI-wrapper skill should frame invocations as `terminal(command="{tool} ...", timeout=...)` — bare shell prose ("run `foo --version`") is a review-blocking non-conformance. If the skill depends on an MCP server, name it and document setup in Prerequisites.

### Never use machine-local paths

Write repo-relative paths (`.agents/skills/...`). A `/home/<you>/...` path baked into a committed skill breaks for every other user and is an instant review flag. Scratch paths in examples use the agent config home (`~/.config/metatech/...`, override `METHATECH_CONFIG_DIR`).

## Writing Quality Principles

A skill exists to make the agent's process more predictable — the agent reliably follows the same useful discipline.

1. **Optimize for process predictability.** If a line does not change behavior, cut it.
2. **Choose the right context load.** The description is paid for every turn; details go in the body or linked references.
3. **End steps with completion criteria.** Checkable and, when it matters, exhaustive: "every modified file accounted for" beats "summarize changes."
4. **Co-locate rules with the concept they govern.**
5. **Use strong leading words** ("tight loop," "root cause," "regression test") over long repeated explanations.
6. **Prune duplication and no-ops.** "Be careful" and "use best practices" don't change model behavior — replace with a checkable criterion or delete.

## Tests and Verification (required for repo skills)

1. **Frontmatter parses** under the loader schema (`name` + `description`
   present, `name` matches the directory, description ≤ 60 chars and
   ends with a period, every `related_skills` entry resolves in
   `.agents/skills/`).
2. **Skill loads:** start the CLI in a fresh session and invoke the skill
   by name — it must appear and its `When to Use` must trigger on the
   intended request. A skill the loader skips (bad name, bad frontmatter)
   is a failed skill, whatever the prose says.
3. **Scripts the skill ships** keep their own tests passing (`bun test`
   for TypeScript, `pytest` for Python) — run them, don't assume.
4. **Commit** with the change, per the repo's commit rules (no commit
   without an order — see the repo AGENTS.md).

Validate locally:

```python
import re, pathlib
from ruamel.yaml import YAML
content = pathlib.Path(".agents/skills/<name>/SKILL.md").read_text()
assert content.startswith("---")
m = re.search(r'\n---\s*\n', content[3:])
fm = YAML(typ="safe").load(content[3:m.start()+3])
assert "name" in fm and "description" in fm
assert len(fm["description"]) <= 60, f"description {len(fm['description'])} chars — hardline is 60"
assert fm["description"].endswith(".")
assert "platforms" in fm
```

Also verify every `related_skills` entry exists in `.agents/skills/`.

## Workflow

1. **Survey peers** with `search_files(target='files')` under
   `.agents/skills/` and read 2-3 peer SKILL.md files to match tone and
   structure. Prefer extending an existing skill over creating a narrow sibling.
2. **Decide the skill's place** — bundled in this repo, or project-local.
   When in doubt, ask before committing rather than defaulting.
3. **Draft** with `write_file` to `.agents/skills/<name>/SKILL.md`.
4. **Validate locally** (previous section).
5. **Verify the skill loads** in a fresh CLI session.
6. **Git add + commit** on the active branch, per the repo's commit rules.
7. **Note:** the CURRENT session's skill loader is cached — the new skill
   will not be visible until a new session. This is expected, not a bug.

## Editing Existing Skills

- **Small fix:** `patch` works on any skill.
- **Major rewrite:** `write_file` the whole SKILL.md.
- **Supporting files:** `write_file` to `references/`, `templates/`, or `scripts/` under the skill dir.
- **Always commit** — bundled skills are source, not runtime state.
- **Never rewrite an adopted upstream skill's `author:` line** — see
  `author` rules above.

## Common Pitfalls

1. **Leading whitespace before `---`.** Validation fails on any leading blank line or BOM.
2. **Trusting the loader's limits as the standard.** The loader allows 1024-char descriptions; review rejects anything over 60. The loader doesn't check `platforms:`, author format, or tests — review does.
3. **`author: MethaTech` on a contributed skill.** Credit the human first.
4. **Description too generic or trigger buried past char 57.**
5. **`related_skills` pointing at skills that don't exist in this repo** (planned, in another project, or never adopted).
6. **Duplicating a peer.** Survey first; extend rather than sibling.
7. **Expecting the current session to see the new skill.** The loader is initialized at session start.
8. **Letting skills accumulate sediment.** When adding a rule, remove the old wording it replaces.
9. **Rebranding attribution.** Upstream `author:` lines, source URLs,
   and third-party tool flags stay as they are — they are facts, not
   brand mentions. See `.agents/skills/README.md` for the held list.

## Verification Checklist

- [ ] File at `.agents/skills/<name>/SKILL.md`
- [ ] Frontmatter starts at byte 0 with `---`, closes with `\n---\n`
- [ ] `name`, `description`, `version`, `author`, `license`, `platforms`, `metadata.methatech.{tags, related_skills}` all present
- [ ] `name` matches the directory name; description ≤ 60 chars, one sentence, ends with a period, no marketing words
- [ ] `author` credits the human contributor first (upstream authors untouched)
- [ ] `platforms:` audited against actual prose/scripts, not copied from a sibling
- [ ] Every `related_skills` entry resolves in `.agents/skills/`
- [ ] Body follows the modern section order; commands framed through MethaTech tools
- [ ] No machine-local paths anywhere in the file
- [ ] Each ordered step has a checkable completion criterion
- [ ] Skill loads in a fresh CLI session under its new name
- [ ] `git add` + commit on the intended branch, per the repo's commit rules
