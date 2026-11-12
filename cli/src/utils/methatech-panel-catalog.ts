/**
 * FORK (MethaTech): the panel as the server model catalog.
 *
 * Models come from the SERVER, not from the CLI build. The panel is the
 * source of truth (its GET /api/available_model lists every live model
 * with its price), and the CLI syncs that list at runtime: on start, and
 * again at the catalog's `refreshAt`, while the user is signed in.
 *
 * This file converts the panel's /api/available_model answer into the
 * server-catalog shape the picker, the model store and the session hooks
 * already read (docs/freebuff-model-catalog.md), so a model added on the
 * panel shows up in the CLI with no code change, no git pull and no npm
 * republish. The compiled panel catalog
 * (common/src/constants/methatech-models.ts) stays only as the fallback
 * for when the panel cannot be reached, and as the source of the display
 * names, free-model order and context windows the panel does not send.
 *
 * The panel relay resolves a plain panel model id, so a row's key and its
 * handle are both that id (the same rule the compiled directory uses).
 * `legacyDigests` carries the digest of the id, so a pick saved before the
 * catalog existed migrates onto its live row.
 */
import {
  getMethatechModel,
  isMethatechFreeModelId,
  isMethatechModelId,
  METHATECH_DEFAULT_MODEL_ID,
  METHATECH_FREE_MODEL_IDS,
  methatechModelContextWindow,
  registerMethatechPanelModelIds,
} from '@methatech/common/constants/methatech-models'
import {
  freebuffLegacyModelDigest,
} from '@methatech/common/types/freebuff-model-catalog'

import type { FreebuffModelCatalog } from '@methatech/common/types/freebuff-model-catalog'
import type { FreebuffCatalogRow } from '@methatech/common/types/freebuff-model-catalog'

/** The panel endpoint that lists the live models (public, no auth). */
export const METHATECH_PANEL_MODELS_PATH = '/api/available_model'

/** How soon the CLI re-syncs the model list while it runs. */
export const METHATECH_PANEL_CATALOG_REFRESH_MS = 10 * 60 * 1000

/** Where a locked row's press would go; all panel rows are open, so this
 *  is never shown, but the catalog schema requires it. */
const METHATECH_PANEL_PLANS_URL = 'https://console.methatech.eu.org/price'

/** Brand words the display-name prettifier writes with their own casing. */
const PANEL_MODEL_BRANDS: Record<string, string> = {
  gpt: 'GPT',
  glm: 'GLM',
  qwen: 'Qwen',
  kimi: 'Kimi',
  grok: 'Grok',
  claude: 'Claude',
  gemini: 'Gemini',
  deepseek: 'DeepSeek',
  mimo: 'MiMo',
  minimax: 'MiniMax',
  seed: 'Seed',
  hy3: 'HY3',
  longcat: 'Longcat',
  beam: 'Beam',
  step: 'Step',
  solar: 'Solar',
  command: 'Command',
  methatech: 'MethaTech',
  opus: 'Opus',
  sonnet: 'Sonnet',
  haiku: 'Haiku',
  luna: 'Luna',
  sol: 'Sol',
  terra: 'Terra',
  astra: 'Astra',
}

/** A brand word glued to its version (`qwen3.8`) reads as one word. */
const BRAND_VERSION_PREFIXES = [
  'qwen',
  'kimi',
  'gpt',
  'glm',
  'deepseek',
  'grok',
  'seed',
  'mimo',
]

/**
 * One word of a model id, prettified. Version-like words (`v2.6`, `120b`,
 * `a23b`) keep their digits and take capital letters; a brand word takes
 * its canonical casing; anything else is capitalised.
 */
function prettifyPanelModelWord(word: string): string {
  const lower = word.toLowerCase()
  const brand = PANEL_MODEL_BRANDS[lower]
  if (brand) return brand
  // A brand glued to its version: `qwen3.8` -> `Qwen 3.8`.
  for (const prefix of BRAND_VERSION_PREFIXES) {
    if (lower.startsWith(prefix) && lower.length > prefix.length) {
      const rest = word.slice(prefix.length)
      if (/^\d/.test(rest)) {
        const brandName = PANEL_MODEL_BRANDS[prefix] ?? prefix
        return `${brandName} ${prettifyPanelModelWord(rest)}`
      }
    }
  }
  if (/\d/.test(word)) {
    // Version/code word: capitalise a leading letter, upper-case trailing
    // letters (`120b` -> `120B`, `a23b` -> `A23B`, `v2.6` -> `V2.6`).
    return word.replace(/^[a-z]/, (c) => c.toUpperCase()).replace(/[a-z]+$/, (c) =>
      c.toUpperCase(),
    )
  }
  return word.charAt(0).toUpperCase() + word.slice(1)
}

/**
 * A panel model id as a picker name. A known compiled id keeps its
 * compiled name; anything new is prettified from the id, with a `:variant`
 * suffix as a parenthetical (`deepseek-v4.1-flash:fast` ->
 * `DeepSeek V4.1 Flash (Fast)`), so variants never share a name.
 */
export function methatechPanelModelDisplayName(
  id: string,
  ownedBy?: string,
): string {
  if (isMethatechModelId(id)) return getMethatechModel(id).displayName
  const [base, variant] = id.split(':')
  // Two single digits in a row are one version (`seed-2-0-code` -> 2.0).
  const words = (base ?? id).split('/').pop()!.split('-')
  const parts: string[] = []
  for (let i = 0; i < words.length; i++) {
    const word = words[i]!
    const next = words[i + 1]
    if (
      /^\d$/.test(word) &&
      next !== undefined &&
      /^\d$/.test(next)
    ) {
      parts.push(`${word}.${next}`)
      i++
      continue
    }
    parts.push(prettifyPanelModelWord(word))
  }
  let name = parts.join(' ')
  if (variant) {
    name += ` (${variant.charAt(0).toUpperCase()}${variant.slice(1)})`
  } else if ((base ?? id).includes('/') && ownedBy) {
    // A prefixed id with no variant (e.g. `gemini/gemini-3.5-flash`) names
    // its owner, so it never reads as the bare model of the same name.
    name += ` (${ownedBy})`
  }
  return name
}

/** Display dollars per 1M tokens from a panel price ratio ($1 = 500,000 quota). */
function formatPanelPriceDollars(ratio: number): string {
  return `$${(ratio * 2).toFixed(2)}`
}

export function methatechPanelModelTagline(
  inputRatio: number,
  outputRatio: number,
  free: boolean,
): string {
  if (free) return 'Free'
  return `${formatPanelPriceDollars(inputRatio)}/${formatPanelPriceDollars(outputRatio)} per 1M`
}

interface PanelAvailableModelEntry {
  groups?: unknown
  owned_by?: unknown
  price?: {
    model?: unknown
    type?: unknown
    channel_type?: unknown
    input?: unknown
    output?: unknown
    locked?: unknown
  }
}

/** FNV-1a over the model list, so `version` only moves when the list does. */
function panelCatalogVersion(entries: Array<[string, PanelAvailableModelEntry]>): string {
  const input = entries
    .map(
      ([id, entry]) =>
        `${id}:${entry.price?.input ?? ''}:${entry.price?.output ?? ''}`,
    )
    .join('|')
  let h1 = 0x811c9dc5
  let h2 = 0x01000193 ^ 0x5bd1e995
  for (let i = 0; i < input.length; i++) {
    const c = input.charCodeAt(i)
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0
    h2 = Math.imul(h2 ^ c, 0x5bd1e995) >>> 0
  }
  return h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0')
}

/**
 * Convert a GET /api/available_model answer into a server model catalog,
 * or null when the body is not one. The answer is `{ data: { <id>:
 * { owned_by, price: { input, output, locked } } } }`; a bare map is
 * accepted too. Locked price rows are dropped, and a row with no usable
 * price is treated as free.
 */
export function parseMethatechPanelCatalog(
  body: unknown,
  now: number = Date.now(),
): FreebuffModelCatalog | null {
  if (!body || typeof body !== 'object') return null
  const record = body as Record<string, unknown>
  const map =
    record.data && typeof record.data === 'object'
      ? (record.data as Record<string, unknown>)
      : record
  const entries = Object.entries(map).filter(
    ([id, value]) =>
      typeof id === 'string' &&
      id.length > 0 &&
      value !== null &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      // A panel entry carries a price and/or an owner; anything else (a
      // Freebuff catalog body, a stray field) is not a model row.
      ('price' in (value as Record<string, unknown>) ||
        'owned_by' in (value as Record<string, unknown>)),
  ) as Array<[string, PanelAvailableModelEntry]>
  if (entries.length === 0) return null

  const rows: FreebuffCatalogRow[] = []
  for (const [id, entry] of entries) {
    const price = entry.price
    if (price?.locked === true) continue
    const input =
      typeof price?.input === 'number' && Number.isFinite(price.input)
        ? price.input
        : 0
    const output =
      typeof price?.output === 'number' && Number.isFinite(price.output)
        ? price.output
        : 0
    const ownedBy =
      typeof entry.owned_by === 'string' && entry.owned_by.length > 0
        ? entry.owned_by
        : undefined
    const free =
      isMethatechFreeModelId(id) || (input === 0 && output === 0)
    rows.push({
      key: id,
      handle: id,
      displayName: methatechPanelModelDisplayName(id, ownedBy),
      tagline: methatechPanelModelTagline(input, output, free),
      badges: [],
      multimodal: false,
      premium: !free,
      dataUse: 'service',
      access: 'open',
      contextWindow: methatechModelContextWindow(id),
      sortOrder: 0,
      legacyDigests: [freebuffLegacyModelDigest(id)],
    })
  }
  if (rows.length === 0) return null

  // Free rows first in the panel's free-model order, then paid rows
  // cheapest first by input price — the compiled catalog's own order.
  const freeOrder = (id: string): number => {
    const index = METHATECH_FREE_MODEL_IDS.indexOf(id)
    return index === -1 ? METHATECH_FREE_MODEL_IDS.length : index
  }
  rows.sort((a, b) => {
    if (a.premium !== b.premium) return a.premium ? 1 : -1
    if (!a.premium && !b.premium) {
      const order = freeOrder(a.key) - freeOrder(b.key)
      if (order !== 0) return order
    }
    const priceOf = (row: FreebuffCatalogRow): [number, number] => {
      const entry = entries.find(([id]) => id === row.key)?.[1]
      const input =
        typeof entry?.price?.input === 'number' ? entry.price.input : 0
      const output =
        typeof entry?.price?.output === 'number' ? entry.price.output : 0
      return [input, output]
    }
    const [aIn, aOut] = priceOf(a)
    const [bIn, bOut] = priceOf(b)
    if (aIn !== bIn) return aIn - bIn
    if (aOut !== bOut) return aOut - bOut
    return a.key.localeCompare(b.key)
  })
  rows.forEach((row, index) => {
    row.sortOrder = index
  })

  const recommendedKey = rows.some(
    (row) => row.key === METHATECH_DEFAULT_MODEL_ID,
  )
    ? METHATECH_DEFAULT_MODEL_ID
    : (rows.find((row) => !row.premium)?.key ?? rows[0]!.key)

  // Register every panel row id as a MethaTech panel model, so the SDK
  // routes it to the panel relay (/v1) instead of the Freebuff backend
  // (/api/v1). The compiled list only has base ids; panel variants like
  // 'glm-5.3-flash:fast' live only here.
  registerMethatechPanelModelIds(rows.map((row) => row.key))

  return {
    protocol: 1,
    version: panelCatalogVersion(entries),
    issuedAt: now,
    refreshAt: now + METHATECH_PANEL_CATALOG_REFRESH_MS,
    rows,
    recommendedKey,
    fallbackKey: recommendedKey,
    plansUrl: METHATECH_PANEL_PLANS_URL,
  }
}
