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

### Older Intel Macs (without AVX2)

The launcher automatically switches to the `darwin-x64-baseline` build if
the standard Intel binary exits with an illegal-instruction error (`SIGILL`).
To select that build before the first launch:

```bash
METHATECH_BINARY_TARGET=darwin-x64-baseline methatech
```

## Why MethaTech?

**Choice of leading models** — The CLI picker includes 27 models from the MethaTech panel, 9 of them free, with DeepSeek V4 Flash selected by default. See the [repo root README](../README.md) for the full catalog and prices.

**Fast** — Context gathering in seconds, with parallel agents splitting the work.

**Loaded** — Built-in web research, browser use, and more.

## FAQ

**How do models work?** Models come from the MethaTech panel at [console.methatech.eu.org](https://console.methatech.eu.org). 9 models are free; 18 paid models charge against your panel balance, priced per 1M tokens. Run `/model` in the CLI to see the catalog and current prices.

**Can I use my own provider?** Yes — `/byok` connects the MethaTech panel, OpenRouter, or any OpenAI-compatible provider with your own key.

**Does MethaTech read files outside my project?** No, with a few exceptions, such as files an agent reads in the conversation, files you share, and settings like your agent instructions and skills.

## Links

- [Website](https://methatech.eu.org)
- [Panel](https://console.methatech.eu.org)
- [GitHub](https://github.com/clickmamaheti-prog/methatech-cli)
