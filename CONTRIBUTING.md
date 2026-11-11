# Contributing

This repository is the MethaTech CLI: the AI coding agent that runs in your terminal, with models from the MethaTech panel. Pull requests merge here.

## Public Contributions

Good PRs are usually scoped to:

- `cli/`
- `sdk/`
- `common/`
- `agents/`
- `packages/agent-runtime/`
- `packages/code-map/`
- `packages/llm-providers/`
- `freebuff/`, excluding the private web app
- `scripts/tmux/`
- public docs

Please do not add backend, database, billing, deployment, or secret-management code to the public repo.

## Development

Install dependencies:

```bash
bun install
```

Build the SDK:

```bash
bun run build:sdk
```

Build the MethaTech binary:

```bash
bun run build:methatech
```

Start the CLI in development mode:

```bash
bun run dev:methatech
```

## Pull Request Flow

1. Open the PR against this repo.
2. CI validates the change.
3. A maintainer reviews the change.
4. If accepted, the PR merges here.

### What gets a PR accepted

- It is scoped to one thing, and the diff stays reviewable.
- It fixes a real problem you can describe, ideally with a repro.
- It stays inside the paths listed above.

### What gets a PR closed

- It touches backend, database, billing, or deployment paths.
- It changes product direction unilaterally — renaming the project, swapping default models, adding a vendor integration nobody asked for.
- It is a mass mechanical rewrite with no functional change.
- It went stale after review feedback with no response.

## Issue triage

Model outages and daily limits are operational: if a model is unavailable or you have hit a session cap, check the MethaTech panel first. If you think a limit is being *counted* wrong — the wrong number of sessions used, limits not resetting, a premium slot consumed by a free model — that is a bug and we do want the issue.
