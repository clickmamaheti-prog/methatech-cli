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
 *   catalog. (The server catalog fetch can never succeed in this fork —
 *   there is no Freebuff server — so nothing ever replaces it.)
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
} from '@codebuff/common/constants/methatech-models'

import type { FreebuffModelDirectory } from './freebuff-model-directory'
import type { FreebuffAccessTier } from '@codebuff/common/constants/freebuff-models'

export const methatechModelDirectory: FreebuffModelDirectory = {
  catalog: null,
  pickerModels: (
    _accessTier: FreebuffAccessTier | null | undefined,
    _hasPaidSubscription: boolean,
  ) => METHATECH_MODELS,
  get: (id) => getMethatechModel(id),
  isKnown: (id) => isMethatechModelId(id),
  isPickerModel: (id) => isMethatechModelId(id),
  row: () => undefined,
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
