/**
 * MethaTech panel model catalog — the fork's default catalog.
 *
 * FORK (MethaTech): the panel (console.methatech.eu.org) is the source of
 * truth for models — prices, channels, on/off all live there. This module is
 * a compiled snapshot of the panel's live list, taken from the PUBLIC
 * endpoint GET https://console.methatech.eu.org/api/available_model on
 * 2026-11-10 ~23:04 UTC (27 active models). To re-sync, re-fetch that
 * endpoint and update the rows + METHATECH_MODEL_PRICES below; do not guess
 * prices or ids from memory.
 *
 * Prices in the panel response are RATIOS; display dollars per 1M tokens =
 * ratio x 2 (the panel's own rule: $1 = 500,000 quota). The taglines below
 * carry the display price for paid rows; free rows say "Free".
 *
 * Free vs paid follows the panel's free-model allowlist
 * (isPlaygroundFreeModel): the 10 free models, of which kimi-k2.7-code is
 * NOT in the live list any more (provider retired it) and so is NOT in this
 * catalog — the 9 live free rows are the ones below. The other 18 live
 * models are paid (the panel enforces balance server-side with 402; the
 * fork never locks a row locally — there is no plan to buy here).
 *
 * This module deliberately does NOT touch the Freebuff catalog
 * (freebuff-models.ts): that catalog and its tests stay intact upstream
 * shapes, and the fork's CLI reads THIS catalog through the MethaTech model
 * directory (cli/src/utils/methatech-model-directory.ts).
 */
import type { FreebuffModelOption } from './freebuff-models'

/** The panel model the fork starts on, and the row a pick steps down to. */
export const METHATECH_DEFAULT_MODEL_ID = 'deepseek-v4-flash'
export const METHATECH_FALLBACK_MODEL_ID = 'deepseek-v4-flash'

/** Context window assumed for a panel model with no mapped entry. Smaller
 *  than every window we have measured, so an unmapped model only prunes
 *  early — never wedges a thread. Same value as
 *  FREEBUFF_DEFAULT_CONTEXT_WINDOW. */
export const METHATECH_DEFAULT_CONTEXT_WINDOW = 131_072

/**
 * Display prices ($ per 1M tokens, ratio x 2) from the live
 * /api/available_model snapshot 2026-11-10. Free rows are listed with their
 * panel list price too — the panel charges free credits for them, not
 * balance — so a price here is the list price, not what a free-credit user
 * pays.
 */
export const METHATECH_MODEL_PRICES: Record<
  string,
  { input: number; output: number }
> = {
  'deepseek-v4-flash': { input: 0.5, output: 2 },
  'glm-5.3-flash': { input: 0.25, output: 0.85 },
  'gpt-6-luna': { input: 0.17, output: 0.85 },
  'gemini-3.8-flash': { input: 2.5, output: 12.5 },
  'gpt-6-astra': { input: 17, output: 83.2 },
  'gemini-3.1-pro': { input: 3.35, output: 20 },
  'qwen3.8-flash': { input: 0.25, output: 0.8 },
  'qwen3.7-max': { input: 4.2, output: 12.5 },
  'deepseek-v4.1-flash': { input: 0.5, output: 2 },
  'command-r7b-12-2024': { input: 0.065, output: 0.25 },
  'methatech/uncensored': { input: 0.2, output: 0.6 },
  'command-r-08-2024': { input: 0.25, output: 1 },
  'gpt-oss-120b-medium': { input: 0.25, output: 1 },
  'qwen3.7-plus': { input: 0.7, output: 2.7 },
  'qwen3.6-plus': { input: 0.85, output: 5 },
  'gpt-6.1-terra': { input: 1.7, output: 8.35 },
  'deepseek-v4-pro': { input: 2.2, output: 6.6 },
  'glm-5.2': { input: 2.35, output: 7.35 },
  'glm-5.3': { input: 2.35, output: 7.35 },
  'gpt-6.1-sol': { input: 3.35, output: 16.65 },
  'grok-4.7': { input: 3.35, output: 10 },
  'kimi-k3.1-pro': { input: 3.35, output: 16.65 },
  'command-a-03-2025': { input: 4.2, output: 16.65 },
  'command-r-plus-08-2024': { input: 4.2, output: 16.65 },
  'claude-sonnet-4-6': { input: 5, output: 25 },
  'gemini-4-argon': { input: 6.7, output: 33.3 },
  'claude-opus-4-6-thinking': { input: 8.35, output: 41.6 },
}

/**
 * Hard context windows (in tokens) for the panel models we can back with a
 * number. Same discipline as FREEBUFF_MODEL_CONTEXT_WINDOWS: an observed
 * provider rejection, or a published figure entered LOW (guessing high
 * wedges a thread forever; guessing low only prunes early).
 *
 *   deepseek-v4-flash     observed DeepSeek rejection: 1,048,576
 *   deepseek-v4-pro       observed DeepSeek rejection: 1,048,576
 *   deepseek-v4.1-flash   same V4 family, same observed 1,048,576
 *   glm-5.3-flash         OpenRouter publishes 1,310,720; entered low
 *   gpt-6-luna            publishes 1,050,000; entered low
 *   gpt-6.1-sol           publishes 1,050,000; entered low
 *   gpt-6.1-terra         publishes 1,050,000; entered low
 *   gemini-3.8-flash      publishes 1,048,576; entered low
 *   gemini-4-argon        publishes 1,048,576; entered low
 *
 * Every other panel model is absent and falls back to
 * METHATECH_DEFAULT_CONTEXT_WINDOW. Add one only with the rejection text or
 * published figure that proves the number.
 */
export const METHATECH_MODEL_CONTEXT_WINDOWS: Record<string, number> = {
  'deepseek-v4-flash': 1_048_576,
  'deepseek-v4-pro': 1_048_576,
  'deepseek-v4.1-flash': 1_048_576,
  'glm-5.3-flash': 1_000_000,
  'gpt-6-luna': 1_000_000,
  'gpt-6.1-sol': 1_000_000,
  'gpt-6.1-terra': 1_000_000,
  'gemini-3.8-flash': 1_000_000,
  'gemini-4-argon': 1_000_000,
}

/**
 * dataUse for every panel row: 'service'. The panel relays prompts to
 * upstream providers whose training policies we cannot substantiate per
 * model, so we assert no training warning we cannot back — the same
 * conservative reading the Freebuff catalog uses for GLM 5.3 Flash. No
 * `warning` text is attached for the same reason.
 *
 * multimodal is false for every row: /api/available_model says nothing
 * about image input, and the safe direction is inlining images as text
 * rather than sending multimodal content a lane may reject. Flip a row to
 * true only with a verified multimodal lane behind it.
 *
 * No reasoningEffort / efforts: the provider default stands untouched.
 */
function panelRow(
  id: string,
  displayName: string,
  tagline: string,
  premium: boolean,
): FreebuffModelOption {
  return {
    id,
    displayName,
    tagline,
    availability: 'always',
    dataUse: 'service',
    premium,
    multimodal: false,
  }
}

/** The 9 live free panel models, in the panel's free-model order. */
export const METHATECH_FREE_MODEL_IDS: readonly string[] = [
  'deepseek-v4-flash',
  'glm-5.3-flash',
  'gpt-6-luna',
  'gemini-3.8-flash',
  'gpt-6-astra',
  'gemini-3.1-pro',
  'qwen3.8-flash',
  'qwen3.7-max',
  'deepseek-v4.1-flash',
]

/**
 * The fork's default catalog: free rows first, then paid rows cheapest
 * first by input price. Order is the order shown in the picker.
 */
export const METHATECH_MODELS = [
  panelRow('deepseek-v4-flash', 'DeepSeek V4 Flash', 'Smart & fast · Free', false),
  panelRow('glm-5.3-flash', 'GLM 5.3 Flash', 'Deep reasoning · Free', false),
  panelRow('gpt-6-luna', 'GPT-6 Luna', 'Fast & capable · Free', false),
  panelRow('gemini-3.8-flash', 'Gemini 3.8 Flash', 'Fast multimodal · Free', false),
  panelRow('gpt-6-astra', 'GPT-6 Astra', 'Flagship reasoning · Free', false),
  panelRow('gemini-3.1-pro', 'Gemini 3.1 Pro', 'Deep reasoning · Free', false),
  panelRow('qwen3.8-flash', 'Qwen 3.8 Flash', 'Fast & efficient · Free', false),
  panelRow('qwen3.7-max', 'Qwen 3.7 Max', 'Strong all-rounder · Free', false),
  panelRow('deepseek-v4.1-flash', 'DeepSeek V4.1 Flash', 'Smart & fast · Free', false),
  panelRow('command-r7b-12-2024', 'Command R7B 12-2024', 'Light & cheap · $0.07/$0.25 per 1M', true),
  panelRow('methatech/uncensored', 'MethaTech Uncensored', 'Uncensored · $0.20/$0.60 per 1M', true),
  panelRow('command-r-08-2024', 'Command R 08-2024', 'Efficient retrieval · $0.25/$1.00 per 1M', true),
  panelRow('gpt-oss-120b-medium', 'GPT-OSS 120B Medium', 'Open weights · $0.25/$1.00 per 1M', true),
  panelRow('qwen3.7-plus', 'Qwen 3.7 Plus', 'Strong plus · $0.70/$2.70 per 1M', true),
  panelRow('qwen3.6-plus', 'Qwen 3.6 Plus', 'Capable plus · $0.85/$5.00 per 1M', true),
  panelRow('gpt-6.1-terra', 'GPT-6.1 Terra', 'Capable & efficient · $1.70/$8.35 per 1M', true),
  panelRow('deepseek-v4-pro', 'DeepSeek V4 Pro', 'Deep reasoning · $2.20/$6.60 per 1M', true),
  panelRow('glm-5.2', 'GLM 5.2', 'Solid reasoning · $2.35/$7.35 per 1M', true),
  panelRow('glm-5.3', 'GLM 5.3', 'Deep reasoning · $2.35/$7.35 per 1M', true),
  panelRow('gpt-6.1-sol', 'GPT-6.1 Sol', 'Strong all-rounder · $3.35/$16.65 per 1M', true),
  panelRow('grok-4.7', 'Grok 4.7', 'Real-time knowledge · $3.35/$10.00 per 1M', true),
  panelRow('kimi-k3.1-pro', 'Kimi K3.1 Pro', 'Long context pro · $3.35/$16.65 per 1M', true),
  panelRow('command-a-03-2025', 'Command A 03-2025', 'Enterprise chat · $4.20/$16.65 per 1M', true),
  panelRow('command-r-plus-08-2024', 'Command R+ 08-2024', 'Advanced retrieval · $4.20/$16.65 per 1M', true),
  panelRow('claude-sonnet-4-6', 'Claude Sonnet 4.6', 'Balanced flagship · $5.00/$25.00 per 1M', true),
  panelRow('gemini-4-argon', 'Gemini 4 Argon', 'Flagship multimodal · $6.70/$33.30 per 1M', true),
  panelRow(
    'claude-opus-4-6-thinking',
    'Claude Opus 4.6 Thinking',
    'Deepest reasoning · $8.35/$41.60 per 1M',
    true,
  ),
] as const satisfies readonly FreebuffModelOption[]

export function isMethatechModelId(id: string | null | undefined): boolean {
  if (!id) return false
  return METHATECH_MODELS.some((model) => model.id === id)
}

export function isMethatechFreeModelId(id: string | null | undefined): boolean {
  if (!id) return false
  return METHATECH_FREE_MODEL_IDS.includes(id)
}

export function isMethatechPremiumModelId(
  id: string | null | undefined,
): boolean {
  if (!id) return false
  const model = METHATECH_MODELS.find((candidate) => candidate.id === id)
  return model?.premium ?? false
}

/** Best-effort row for an id (or an unknown one), so display code never
 *  null-checks — the same contract as getFreebuffModel. */
export function getMethatechModel(id: string): FreebuffModelOption {
  return (
    METHATECH_MODELS.find((model) => model.id === id) ?? {
      id,
      displayName: id,
      tagline: '',
      availability: 'always',
      dataUse: 'service',
      premium: false,
      multimodal: false,
    }
  )
}

/** What an arbitrary stored value selects: itself when known, else the
 *  default. Old Freebuff wire ids (e.g. 'deepseek/deepseek-v4-flash')
 *  land here too — the fork has no Freebuff server to coerce them to. */
export function resolveMethatechModel(id: string | null | undefined): string {
  if (id && isMethatechModelId(id)) return id
  return METHATECH_DEFAULT_MODEL_ID
}

export function methatechModelContextWindow(
  id: string | null | undefined,
): number {
  if (!id) return METHATECH_DEFAULT_CONTEXT_WINDOW
  return (
    METHATECH_MODEL_CONTEXT_WINDOWS[id] ?? METHATECH_DEFAULT_CONTEXT_WINDOW
  )
}
