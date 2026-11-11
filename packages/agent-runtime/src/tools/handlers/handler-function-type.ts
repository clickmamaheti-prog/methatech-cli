import type { FileProcessingState } from './tool/write-file'
import type { ToolName } from '@methatech/common/tools/constants'
import type {
  ClientToolCall,
  ClientToolName,
  MethaTechToolCall,
  MethaTechToolMessage,
  MethaTechToolOutput,
} from '@methatech/common/tools/list'
import type { AgentTemplate } from '@methatech/common/types/agent-template'
import type {
  AgentRuntimeDeps,
  AgentRuntimeScopedDeps,
} from '@methatech/common/types/contracts/agent-runtime'
import type { TrackEventFn } from '@methatech/common/types/contracts/analytics'
import type { SendSubagentChunkFn } from '@methatech/common/types/contracts/client'
import type { Logger } from '@methatech/common/types/contracts/logger'
import type { PrintModeEvent } from '@methatech/common/types/print-mode'
import type { AgentState, Subgoal } from '@methatech/common/types/session-state'
import type { ProjectFileContext } from '@methatech/common/util/file'
import type { ToolSet } from 'ai'

type PresentOrAbsent<K extends PropertyKey, V> =
  | { [P in K]: V }
  | { [P in K]: never }

export type MethaTechToolHandlerFunction<T extends ToolName = ToolName> = (
  params: {
    previousToolCallFinished: Promise<void>
    toolCall: MethaTechToolCall<T>

    agentContext: Record<string, Subgoal>
    agentState: AgentState
    agentStepId: string
    agentTemplate: AgentTemplate
    ancestorRunIds: string[]
    apiKey: string
    clientSessionId: string
    fetch: typeof globalThis.fetch
    fileContext: ProjectFileContext
    fileProcessingState: FileProcessingState
    fingerprintId: string
    fullResponse: string
    localAgentTemplates: Record<string, AgentTemplate>
    logger: Logger
    prompt: string | undefined
    repoId: string | undefined
    repoUrl: string | undefined
    runId: string
    sendSubagentChunk: SendSubagentChunkFn
    signal: AbortSignal
    system: string
    tools: ToolSet
    trackEvent: TrackEventFn
    userId: string | undefined
    userInputId: string
    writeToClient: (chunk: string | PrintModeEvent) => void
  } & PresentOrAbsent<
    'requestClientToolCall',
    (
      toolCall: ClientToolCall<T extends ClientToolName ? T : never>,
    ) => Promise<MethaTechToolOutput<T extends ClientToolName ? T : never>>
  > &
    AgentRuntimeDeps &
    AgentRuntimeScopedDeps,
) => Promise<{
  output: MethaTechToolMessage<T>['content']
  creditsUsed?: number
}>
