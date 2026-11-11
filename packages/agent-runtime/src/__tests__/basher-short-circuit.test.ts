/**
 * End-to-end check on basher's summarization short-circuit.
 *
 * The generator-level tests in agents/__tests__/basher.test.ts assert which
 * step is yielded. This drives the REAL basher definition through
 * loopAgentSteps with a mocked LLM and a stubbed terminal, and asserts the
 * thing the change actually exists for: that no LLM call happens at all when
 * the command output is small, and that the parent still receives the output.
 */
import { TEST_USER_ID } from '@methatech/common/old-constants'
import { createTestAgentRuntimeParams } from '@methatech/common/testing/fixtures/agent-runtime'
import { clearMockedModules } from '@methatech/common/testing/mock-modules'
import {
  createMockDbOperations,
  setupDbSpies,
} from '@methatech/common/testing/mocks/database'
import { getInitialSessionState } from '@methatech/common/types/session-state'
import { promptSuccess } from '@methatech/common/util/error'
import { userMessage } from '@methatech/common/util/messages'
import * as analytics from '@methatech/common/analytics'
import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  mock,
  spyOn,
} from 'bun:test'

import basher from '../../../../agents/basher'
import { loopAgentSteps } from '../run-agent-step'
import { clearAgentGeneratorCache } from '../run-programmatic-step'
import { createToolCallChunk, mockFileContext } from './test-utils'

import type { AgentTemplate } from '../templates/types'
import type { DbSpies } from '@methatech/common/testing/mocks/database'

describe('basher summarization short-circuit (end-to-end)', () => {
  let llmCallCount: number
  let dbSpies: DbSpies
  let runtime: any
  // No panel in this test environment: the lazy E2B create probe must
  // fail fast instead of hanging on a real fetch to the fake panel
  // host, so sync commands fall back to local execution immediately.
  const realFetch = globalThis.fetch

  const basherTemplate = {
    ...basher,
    inputSchema: {},
    includeMessageHistory: false,
    inheritParentSystemPrompt: false,
    mcpServers: {},
    spawnableAgents: [],
    stepPrompt: '',
    handleSteps: basher.handleSteps,
  } as unknown as AgentTemplate

  beforeEach(() => {
    globalThis.fetch = (async () => {
      throw new Error('panel unreachable in test')
    }) as unknown as typeof globalThis.fetch
    const {
      agentTemplate: _,
      localAgentTemplates: __,
      ...base
    } = createTestAgentRuntimeParams()
    runtime = { ...base }
    llmCallCount = 0
    dbSpies = setupDbSpies(createMockDbOperations())

    runtime.promptAiSdkStream = mock(async function* ({}) {
      llmCallCount++
      yield { type: 'text' as const, text: 'The command succeeded.\n\n' }
      yield createToolCallChunk('end_turn', {})
      return promptSuccess('mock-message-id')
    })

    spyOn(analytics, 'trackEvent').mockImplementation(() => {})
  })

  afterEach(() => {
    globalThis.fetch = realFetch
    clearAgentGeneratorCache(runtime)
    dbSpies.restore()
    mock.restore()
  })

  afterAll(() => {
    clearMockedModules()
  })

  const runBasher = async (stdout: string) => {
    runtime.requestToolCall = mock(async () => ({
      output: [
        {
          type: 'json' as const,
          value: { command: 'bun test', stdout, exitCode: 0 },
        },
      ],
    }))

    const sessionState = getInitialSessionState(mockFileContext)
    return loopAgentSteps({
      ...runtime,
      agentType: 'basher',
      localAgentTemplates: { basher: basherTemplate },
      repoId: undefined,
      repoUrl: undefined,
      userInputId: 'test-user-input',
      agentState: {
        ...sessionState.mainAgentState,
        agentId: 'basher-test',
        messageHistory: [userMessage('run it')],
        output: undefined,
        stepsRemaining: 10,
      },
      prompt: undefined,
      spawnParams: { command: 'bun test', what_to_summarize: 'did it pass' },
      fingerprintId: 'test-fingerprint',
      fileContext: mockFileContext,
      userId: TEST_USER_ID,
      clientSessionId: 'test-session',
      ancestorRunIds: [],
      onResponseChunk: () => {},
      signal: new AbortController().signal,
    })
  }

  it('makes no LLM call when output is small, and still returns it', async () => {
    const result = await runBasher('2 pass 0 fail')

    expect(llmCallCount).toBe(0)
    // The parent must still receive the command output, not an empty result.
    const serialized = JSON.stringify(result.output)
    expect(serialized).toContain('2 pass 0 fail')
    expect(result.output?.type).not.toBe('error')
  })

  it('still calls the LLM once when output is large', async () => {
    await runBasher('x'.repeat(5000))

    expect(llmCallCount).toBe(1)
  })
})
