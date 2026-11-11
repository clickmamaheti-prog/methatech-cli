import { setTreeSitterWasmPath as setCodeMapTreeSitterWasmPath } from '@methatech/code-map/init-node'
import { setWasmDir as setCodeMapWasmDir } from '@methatech/code-map/languages'
import { getFileTokenScores as getCodeMapFileTokenScores } from '@methatech/code-map/parse'

export type * from '@methatech/common/types/json'
export type * from '@methatech/common/types/messages/methatech-message'
export type * from '@methatech/common/types/messages/data-content'
export type * from '@methatech/common/types/print-mode'
export type {
  TextPart,
  ImagePart,
} from '@methatech/common/types/messages/content-part'
export {
  run,
  STATE_SNAPSHOT_INTERRUPTION_MESSAGE,
  toUserInterruptedRunState,
} from './run'
export { USER_INTERRUPTED_MESSAGE } from '@methatech/agent-runtime/util/messages'
export { getFiles } from './tools/read-files'
export type { FileFilter, FileFilterResult } from './tools/read-files'
export type {
  MethaTechClientOptions,
  OverrideToolHandlers,
  RunOptions,
  MessageContent,
  TextContent,
  ImageContent,
} from './run'
export type { TraceWriter } from '@methatech/common/types/contracts/trace'
export { buildUserMessageContent } from '@methatech/agent-runtime/util/messages'
// Agent type exports
export type { AgentDefinition } from '@methatech/common/templates/initial-agents-dir/types/agent-definition'
export type { ToolName } from '@methatech/common/tools/constants'

export type {
  ClientToolCall,
  ClientToolName,
  MethaTechToolOutput,
} from '@methatech/common/tools/list'
export * from './client'
export * from './custom-tool'
export * from './native/ripgrep'
export * from './run-state'
export {
  compactRunState,
  truncateRunStateAtUserTurn,
  withCompactionSummary,
} from './compact-run-state'
export type { CompactedRunState } from './compact-run-state'
export type { ConversationSummary } from '@methatech/common/types/session-state'
export { ToolHelpers } from './tools'
export * from './constants'
export { isAllowedRuntimeAppUrl } from './env'

export { getUserInfoFromApiKey } from './impl/database'
export {
  ALWAYS_TRUSTED_AGENT_PUBLISHERS,
  TRUSTED_AGENT_PUBLISHERS_ENV_VAR,
  UntrustedAgentPublisherError,
  isUntrustedAgentPublisherError,
} from './agent-publisher-trust'
export * from './credentials'
export * from './byok'
export * from './chatgpt'
export * from './project-understanding'
export { resolveProjectKey } from './project-profile'
export {
  getDefaultAgentDirs,
  listLocalAgentFiles,
  loadLocalAgents,
} from './agents/load-agents'
export {
  MCP_CONFIG_FILE_NAME,
  loadMCPConfig,
  loadMCPConfigSync,
  mcpFileSchema,
} from './agents/load-mcp-config'
export {
  loadSkills,
  loadSkillsSync,
  parseSkillFileContent,
} from './skills/load-skills'
export { formatAvailableSkillsXml } from '@methatech/common/util/skills'
export type { LoadSkillsOptions } from './skills/load-skills'
export type { SkillDefinition, SkillsMap } from '@methatech/common/types/skill'
export type {
  LoadedAgents,
  LoadedAgentDefinition,
  LoadLocalAgentsResult,
  AgentValidationError,
} from './agents/load-agents'
export type { MCPFileConfig, LoadedMCPConfig } from './agents/load-mcp-config'

export { validateAgents } from './validate-agents'
export type { ValidationResult, ValidateAgentsOptions } from './validate-agents'

// Free-mode capacity deferral notifications (server-side tier shedding)
export { setFreeModeCapacityDeferralListener } from './impl/model-provider'
export type {
  MethaTechRequestHeadersProvider,
  FreeModeCapacityDeferral,
} from './impl/model-provider'

// Error utilities
export {
  isRetryableStatusCode,
  getErrorStatusCode,
  sanitizeErrorMessage,
  RETRYABLE_STATUS_CODES,
  createHttpError,
  createAuthError,
  createForbiddenError,
  createPaymentRequiredError,
  createServerError,
  createNetworkError,
} from './error-utils'
export type { HttpError } from './error-utils'

// Retry configuration constants
export {
  MAX_RETRIES_PER_MESSAGE,
  RETRY_BACKOFF_BASE_DELAY_MS,
  RETRY_BACKOFF_MAX_DELAY_MS,
  RECONNECTION_MESSAGE_DURATION_MS,
  RECONNECTION_RETRY_DELAY_MS,
} from './retry-config'

export type { MethaTechFileSystem } from '@methatech/common/types/filesystem'

// Tree-sitter / code-map exports
export function getFileTokenScores(
  ...args: Parameters<typeof getCodeMapFileTokenScores>
): ReturnType<typeof getCodeMapFileTokenScores> {
  return getCodeMapFileTokenScores(...args)
}

export function setWasmDir(dir: string): void {
  setCodeMapWasmDir(dir)
}

export function setTreeSitterWasmPath(wasmPath: string): void {
  setCodeMapTreeSitterWasmPath(wasmPath)
}
export type { FileTokenData, TokenCallerMap } from '@methatech/code-map'

export {
  getActiveTerminalCommandProcesses,
  releaseBackgroundTerminalCommands,
  runTerminalCommand,
} from './tools/run-terminal-command'
export type {
  ActiveTerminalCommandProcess,
  TerminalCommandBroker,
  TerminalCommandProcess,
  TerminalCommandSpawnRequest,
} from './tools/run-terminal-command'
// Containment for a sponsored run on the user's own machine (COD-336). Exported
// from the SDK rather than kept in Desktop because the CLI needs the same
// boundary, and a second copy of a seatbelt profile is a second thing to be
// wrong about.
export {
  assertSponsoredCommandCwd,
  assertSponsoredReadPath,
  assertSponsoredWritePath,
  createSponsoredCodeSearchBroker,
  createSponsoredTerminalBroker,
  findBubblewrap,
  sponsoredCodeSearchFlagsRefusal,
  sponsoredContainment,
  sponsoredMacProfile,
} from './tools/sponsored-sandbox'
export type { SponsoredSandboxOptions } from './tools/sponsored-sandbox'
export {
  createSponsoredRootedFileSystem,
  probeSponsoredFileLayer,
} from './tools/sponsored-rooted-filesystem'
export type { SponsoredFileLayerSupport } from './tools/sponsored-rooted-filesystem'
export {
  promptAiSdk,
  promptAiSdkStream,
  promptAiSdkStructured,
} from './impl/llm'
