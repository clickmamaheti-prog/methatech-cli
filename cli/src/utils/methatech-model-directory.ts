/**
 * FORK (MethaTech): the model directory the fork actually runs on.
 *
 * Same `FreebuffModelDirectory` interface as the compiled Freebuff
 * directory, backed by the panel catalog
 * (common/src/constants/methatech-models.ts) instead of the Freebuff one.
 * The picker, the model store and the session hooks all read through the
 * directory, so swapping the directory is what swaps the catalog — the
 * Freebuff catalog itself stays untouched in freebuff-models.ts.
 *
 * Deliberately boring:
 * - No access tiers: the panel has none. Every row is listed to everyone.
 * - No plan lock: there is no plan to buy in this fork. Paid rows are
 *   `premium` (metered by panel balance) and the PANEL enforces balance
 *   server-side with 402 — the fork never locks a row locally.
 * - No availability windows: panel rows are `always`.
 * - No reasoning efforts: the provider default stands untouched.
 * - `catalog` is null: this is a compiled-style directory, not a server
 *   catalog. It is only the fallback: when the user is signed in, the
 *   catalog controller fetches the panel's live model list
 *   (GET /api/available_model, see utils/methatech-panel-catalog.ts) and
 *   the store swaps this directory for the server-catalog one, so the
 *   picker lists what the panel serves right now.
 * - `row()` IS implemented (see `methatechCatalogRow`): the catalog-root
 *   flow needs a row per model, or every turn runs plain base3 whose
 *   model defaults to OPUS_MODEL instead of the user's pick.
 */
import {
  getMethatechModel,
  isMethatechModelId,
  isMethatechPremiumModelId,
  METHATECH_DEFAULT_MODEL_ID,
  METHATECH_FALLBACK_MODEL_ID,
  METHATECH_MODELS,
  methatechModelContextWindow,
  resolveMethatechModel,
} from '@methatech/common/constants/methatech-models'

import type { FreebuffModelDirectory } from './freebuff-model-directory'
import type { FreebuffAccessTier } from '@methatech/common/constants/freebuff-models'
import type { FreebuffCatalogRow } from '@methatech/common/types/freebuff-model-catalog'

/**
 * FORK (MethaTech): the catalog row for a panel model, built from the
 * compiled panel catalog. This is what makes a turn run the ONE catalog
 * root (`freebuffCatalogRootAgent`, model = the row handle) instead of
 * the plain base3 root whose model defaults to OPUS_MODEL — the Freebuff
 * catalog flow, with the panel as the backend. The panel relay resolves
 * the plain panel model id, so the handle IS the id (no opaque server
 * handle); `compaction` stays undefined so base3 falls back to
 * `compactionPolicyForModel(handle)`, and `legacyDigests` stays empty so
 * the compiled-model lookup falls back to the handle too.
 */
export function methatechCatalogRow(
  id: string | null | undefined,
): FreebuffCatalogRow | undefined {
  if (!id || !isMethatechModelId(id)) return undefined
  const model = getMethatechModel(id)
  return {
    key: id,
    handle: id,
    displayName: model.displayName,
    tagline: model.tagline,
    badges: [],
    multimodal: false,
    premium: isMethatechPremiumModelId(id),
    dataUse: 'service',
    access: 'open',
    sortOrder: METHATECH_MODELS.findIndex((candidate) => candidate.id === id),
    contextWindow: methatechModelContextWindow(id),
    legacyDigests: [],
  }
}

export const methatechModelDirectory: FreebuffModelDirectory = {
  catalog: null,
  pickerModels: (
    _accessTier: FreebuffAccessTier | null | undefined,
    _hasPaidSubscription: boolean,
  ) => METHATECH_MODELS,
  get: (id) => getMethatechModel(id),
  isKnown: (id) => isMethatechModelId(id),
  isPickerModel: (id) => isMethatechModelId(id),
  row: (id) => methatechCatalogRow(id),
  efforts: () => null,
  defaultEffort: () => null,
  isAvailable: () => true,
  unavailableLabel: () => undefined,
  isPremium: (id) => isMethatechPremiumModelId(id),
  isLimitedOffer: () => false,
  fallbackModelId: METHATECH_FALLBACK_MODEL_ID,
  recommendedModelId: () => METHATECH_DEFAULT_MODEL_ID,
  supersededBy: () => undefined,
  planRequired: () => false,
  badges: () => [],
  contextWindow: (id) => methatechModelContextWindow(id),
  resolveSelection: (id) => resolveMethatechModel(id),
  resolveForAccessTier: (id) => resolveMethatechModel(id),
  withdrawnMessage: (id) =>
    `${getMethatechModel(id).displayName} is no longer available in MethaTech. We recommend using DeepSeek V4 Flash instead.`,
  plansUrl: undefined,
}

export function isMethatechDirectoryModel(id: string | null | undefined): boolean {
  return isMethatechModelId(id)
}
