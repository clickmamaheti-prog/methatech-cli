# MethaTech

**The MethaTech coding agent.** No subscription. No configuration. Start in seconds.

An AI coding agent that runs in your terminal — describe what you want, and MethaTech edits your code.

## Install

Run from source:

```bash
git clone https://github.com/clickmamaheti-prog/methatech-cli.git
cd methatech-cli
bun install
bun run build:sdk
bun run dev:methatech
```

Or build the standalone binary:

```bash
bun run build:methatech
./cli/bin/methatech
```

## Usage

```bash
cd ~/my-project
methatech
```

## Project Structure

```
freebuff/
├── cli/       # CLI build & npm release files
└── web/       # MethaTech website
```

## Building from Source

```bash
# From the repo root
bun run build:methatech
```

---

For everything else — what MethaTech does, how it works, and FAQ — see the [repo root README](../README.md). We keep that one up to date as the single source of truth.

## License

Apache-2.0
