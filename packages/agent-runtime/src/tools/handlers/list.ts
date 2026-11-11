import { handleAddMessage } from './tool/add-message'
import { handleAddSubgoal } from './tool/add-subgoal'
import { handleApplyPatch } from './tool/apply-patch'
import { handleAskUser } from './tool/ask-user'
import { handleBrowserLogs } from './tool/browser-logs'
import { handleCodeSearch } from './tool/code-search'
import { handleCloudPlanReady } from './tool/cloud-plan-ready'
import { handleCreatePlan } from './tool/create-plan'
import { handleEndTurn } from './tool/end-turn'
import { handleExaFindSimilar } from './tool/exa-find-similar'
import { handleExaSearch } from './tool/exa-search'
import { handleFindFiles } from './tool/find-files'
import { handleFirecrawlCheckCrawlStatus } from './tool/firecrawl-check-crawl-status'
import { handleFirecrawlCrawl } from './tool/firecrawl-crawl'
import { handleFirecrawlScrape } from './tool/firecrawl-scrape'
import { handleGlob } from './tool/glob'
import { handleGravityIndex } from './tool/gravity-index'
import { handleListDirectory } from './tool/list-directory'
import { handleLookupAgentInfo } from './tool/lookup-agent-info'
import { handleProposeStrReplace } from './tool/propose-str-replace'
import { handleProposeWriteFile } from './tool/propose-write-file'
import { handleReadDocs } from './tool/read-docs'
import { handleReadFiles } from './tool/read-files'
import { handleReadSubtree } from './tool/read-subtree'
import { handleReadUrl } from './tool/read-url'
import { handleRenderUI } from './tool/render-ui'
import { handleReportProjectProfile } from './tool/report-project-profile'
import { handleRunFileChangeHooks } from './tool/run-file-change-hooks'
import { handleRunTerminalCommand } from './tool/run-terminal-command'
import { handleSetMessages } from './tool/set-messages'
import { handleSetOutput } from './tool/set-output'
import { handleSkill } from './tool/skill'
import { handleSpawnAgentInline } from './tool/spawn-agent-inline'
import { handleSpawnAgents } from './tool/spawn-agents'
import { handleStrReplace } from './tool/str-replace'
import { handleSuggestFollowups } from './tool/suggest-followups'
import { handleTaskCompleted } from './tool/task-completed'
import { handleThinkDeeply } from './tool/think-deeply'
import { handleUpdateSubgoal } from './tool/update-subgoal'
import { handleWebSearch } from './tool/web-search'
import { handleWriteFile } from './tool/write-file'
import { handleWriteTodos } from './tool/write-todos'

import type { MethaTechToolHandlerFunction } from './handler-function-type'
import type { ToolName } from '@methatech/common/tools/constants'

/**
 * Each value in this record that:
 * - Will be called immediately once it is parsed out of the stream.
 * - Takes as argument
 *   - The previous tool call (to await)
 *   - The MethaTechToolCall for the current tool
 *   - Any additional arguments for the tool
 * - Returns a promise that will be awaited
 */
export const methatechToolHandlers: {
  [K in ToolName]: MethaTechToolHandlerFunction<K>
} = {
  add_message: handleAddMessage,
  add_subgoal: handleAddSubgoal,
  apply_patch: handleApplyPatch,
  ask_user: handleAskUser,
  browser_logs: handleBrowserLogs,
  code_search: handleCodeSearch,
  cloud_plan_ready: handleCloudPlanReady,
  create_plan: handleCreatePlan,
  end_turn: handleEndTurn,
  exa_search: handleExaSearch,
  exa_find_similar: handleExaFindSimilar,
  find_files: handleFindFiles,
  firecrawl_check_crawl_status: handleFirecrawlCheckCrawlStatus,
  firecrawl_crawl: handleFirecrawlCrawl,
  firecrawl_scrape: handleFirecrawlScrape,
  glob: handleGlob,
  gravity_index: handleGravityIndex,
  list_directory: handleListDirectory,
  lookup_agent_info: handleLookupAgentInfo,
  propose_str_replace: handleProposeStrReplace,
  propose_write_file: handleProposeWriteFile,
  read_docs: handleReadDocs,
  read_files: handleReadFiles,
  read_subtree: handleReadSubtree,
  read_url: handleReadUrl,
  render_ui: handleRenderUI,
  report_project_profile: handleReportProjectProfile,
  run_file_change_hooks: handleRunFileChangeHooks,
  run_terminal_command: handleRunTerminalCommand,
  set_messages: handleSetMessages,
  set_output: handleSetOutput,
  skill: handleSkill,
  spawn_agents: handleSpawnAgents,
  spawn_agent_inline: handleSpawnAgentInline,
  str_replace: handleStrReplace,
  suggest_followups: handleSuggestFollowups,
  task_completed: handleTaskCompleted,
  think_deeply: handleThinkDeeply,
  update_subgoal: handleUpdateSubgoal,
  web_search: handleWebSearch,
  write_file: handleWriteFile,
  write_todos: handleWriteTodos,
}
