import {
  FREEBUFF_CLI_CATALOG_ROOT_AGENT_ID,
  getFreebuffBase3RootAgentIdForModel,
  getFreebuffRootAgentIdForModel,
} from '@methatech/common/constants/free-agents'

import { getFreebuffModelDirectory } from '../state/freebuff-catalog-store'
import { freebuffChatModel } from '../state/freebuff-chat-store'
import {
  AGENT_MODE_TO_ID,
  CLI_HARNESS,
  IS_FREEBUFF,
  type AgentMode,
} from './constants'

/**
 * Freebuff is locked to LITE (chat-store's setAgentMode is a no-op when
 * IS_FREEBUFF), so this is effectively "which root does the selected model
 * run". Both harnesses have a root per picker model; CLI_HARNESS picks the
 * family. Fable 5.1 is a deliberate base2 exception for its trace campaign.
 * The default is currently base3; keeping both branches live preserves the
 * release-based rollback path for the CLI.
 *
 * Takes a plain model id: a catalog row has no id and runs the catalog root
 * (see `getAgentIdForMode`).
 */
export function getFreebuffCliAgentIdForModel(model: string): string {
  return CLI_HARNESS === 'base3'
    ? getFreebuffBase3RootAgentIdForModel(model)
    : getFreebuffRootAgentIdForModel(model)
}

/**
 * The root a turn on this selection runs. A catalog row (the selection is a
 * catalog key) runs the ONE catalog root, whose definition is built at runtime
 * from the row (`freebuffCatalogRootAgent`); a compiled model keeps its own.
 */
export function getFreebuffCliAgentIdForSelection(selection: string): string {
  return getFreebuffModelDirectory().row(selection)?.key === selection
    ? FREEBUFF_CLI_CATALOG_ROOT_AGENT_ID
    : getFreebuffCliAgentIdForModel(selection)
}

export function getAgentIdForMode(agentMode: AgentMode): string {
  if (IS_FREEBUFF && agentMode === 'LITE') {
    // FORK (MethaTech): freebuffChatModel() honors the picker nextModel;
    // getSelectedFreebuffModel() does not get the pick for a logged-in user.
    return getFreebuffCliAgentIdForSelection(freebuffChatModel())
  }

  return AGENT_MODE_TO_ID[agentMode]
}
