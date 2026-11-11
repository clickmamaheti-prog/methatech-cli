# MethaTech

**The MethaTech coding agent.** An AI coding agent that runs in your terminal — describe what you want, and MethaTech edits your code.

MethaTech brings specialized agents and a choice of models to your terminal. Models come from the MethaTech panel at [console.methatech.eu.org](https://console.methatech.eu.org): 9 free models and 18 paid models, priced per 1M tokens. You can also bring your own provider key (OpenRouter or any OpenAI-compatible API) with `/byok`.

## Quick start

Run MethaTech from source:

```bash
git clone https://github.com/clickmamaheti-prog/methatech-cli.git
cd methatech-cli
bun install
bun run build:sdk
bun run dev:methatech
```

Then press ENTER to sign in through the MethaTech panel, and describe what you want. MethaTech finds the relevant files, makes changes, and runs the checks that matter for your project.

Or build the standalone binary:

```bash
bun run build:methatech
./cli/bin/methatech
```

## Models

The model catalog comes from the MethaTech panel, which is the source of truth for models, prices, and availability. The default model is **DeepSeek V4 Flash**. The picker shows 27 models:

**Free (9):**

| Model | Best for |
| ----- | -------- |
| **DeepSeek V4 Flash** | The default; smart and fast |
| **GLM 5.3 Flash** | Deep reasoning |
| **GPT-6 Luna** | Fast and capable |
| **Gemini 3.8 Flash** | Fast multimodal |
| **GPT-6 Astra** | Flagship reasoning |
| **Gemini 3.1 Pro** | Deep reasoning |
| **Qwen 3.8 Flash** | Fast and efficient |
| **Qwen 3.7 Max** | Strong all-rounder |
| **DeepSeek V4.1 Flash** | Smart and fast |

**Paid (18, cheapest first, $ input / $ output per 1M tokens):**

| Model | Price |
| ----- | ----- |
| **Command R7B 12-2024** | $0.07 / $0.25 |
| **MethaTech Uncensored** | $0.20 / $0.60 |
| **Command R 08-2024** | $0.25 / $1.00 |
| **GPT-OSS 120B Medium** | $0.25 / $1.00 |
| **Qwen 3.7 Plus** | $0.70 / $2.70 |
| **Qwen 3.6 Plus** | $0.85 / $5.00 |
| **GPT-6.1 Terra** | $1.70 / $8.35 |
| **DeepSeek V4 Pro** | $2.20 / $6.60 |
| **GLM 5.2** | $2.35 / $7.35 |
| **GLM 5.3** | $2.35 / $7.35 |
| **GPT-6.1 Sol** | $3.35 / $16.65 |
| **Grok 4.7** | $3.35 / $10.00 |
| **Kimi K3.1 Pro** | $3.35 / $16.65 |
| **Command A 03-2025** | $4.20 / $16.65 |
| **Command R+ 08-2024** | $4.20 / $16.65 |
| **Claude Sonnet 4.6** | $5.00 / $25.00 |
| **Gemini 4 Argon** | $6.70 / $33.30 |
| **Claude Opus 4.6 Thinking** | $8.35 / $41.60 |

Prices change; the panel is always authoritative. Paid models charge against your panel balance; the panel enforces balance server-side.

## How MethaTech works

MethaTech uses specialized agents instead of sending every task through one model and one prompt. Depending on the task, agents gather context, plan, edit or research, run tools, and review the result.

- **Codebase context** — File-finding agents map the relevant parts of a project before editing.
- **Implementation and review** — Agents can divide work, make changes, run commands, and inspect the result.
- **Research and browser use** — Agents can investigate documentation and test applications in a real browser.
- **Tools** — Read and edit files, run shell commands, search code, manage todos, and use skills.
- **Bring your own key** — `/byok` connects the MethaTech panel, OpenRouter, or any OpenAI-compatible provider. Run `/byok list` to see connections, `/byok validate <name>` to check one, `/byok select <name>` to switch.

Prompts you send go to the model provider you select; panel models are relayed by the MethaTech panel to its upstream providers.

## Contributing

MethaTech is a TypeScript monorepo built with Bun. Contributions to the CLI, agents, tools, documentation, and underlying runtime are welcome. See the [Contributing Guide](./CONTRIBUTING.md) before starting.

```bash
git clone https://github.com/clickmamaheti-prog/methatech-cli.git
cd methatech-cli
bun install
bun run build:sdk
```

Start the CLI separately with:

```bash
bun run dev:methatech
```

See the [Contributing Guide](./CONTRIBUTING.md) and the docs in `./docs/` for environment setup and the checks to run before opening a pull request.

## Links

- [Website](https://methatech.eu.org)
- [Panel](https://console.methatech.eu.org)
- [GitHub](https://github.com/clickmamaheti-prog/methatech-cli)
- [License](./LICENSE)
