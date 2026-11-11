import { afterEach, describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  useFreebuffModelStore,
  getFreebuffReasoningEffortForModel,
  getEffectiveFreebuffReasoningEffort,
} from '../../state/freebuff-model-store'

// FORK (MethaTech): panel models carry no reasoning-effort ladder — the
// panel advertises no effort support, and the MethaTech directory declares
// efforts: () => null ("the provider default stands untouched"). So a saved
// effort is never honored and no default is advertised for a panel model.
// The Freebuff-server effort machinery below stays in the code for the
// Freebuff send path, but it is inert for panel rows. If a later stage
// probes which panel models accept reasoning_effort, the ladder belongs in
// the MethaTech directory with that evidence — not guessed here.

const previous = useFreebuffModelStore.getState().reasoningEffortByModel
afterEach(() =>
  useFreebuffModelStore.setState({ reasoningEffortByModel: previous }),
)

describe('per-model reasoning', () => {
  const model = 'deepseek-v4-flash'
  test('a panel model advertises no effort default', () => {
    useFreebuffModelStore.setState({ reasoningEffortByModel: {} })
    expect(getFreebuffReasoningEffortForModel(model)).toBeNull()
    expect(getEffectiveFreebuffReasoningEffort(model)).toBeNull()
  })
  test('a saved effort is not honored for a panel model', () => {
    useFreebuffModelStore.setState({
      reasoningEffortByModel: { [model]: 'low' },
    })
    expect(getFreebuffReasoningEffortForModel(model)).toBeNull()
    expect(getEffectiveFreebuffReasoningEffort(model)).toBeNull()
  })
})

/**
 * The send path, asserted by reading the source for the same reason the runner's
 * effortForwarding test does: an absent metadata field IS how "use the default"
 * is expressed, so a dropped value is invisible to every other test.
 */
describe('the CLI turn carries the chosen effort', () => {
  const source = readFileSync(
    join(import.meta.dir, '..', '..', 'hooks', 'use-send-message.ts'),
    'utf8',
  )

  test('it reaches extraMethaTechMetadata under the name the server reads', () => {
    const metadata = source.slice(source.indexOf('extraMethaTechMetadata:'))
    expect(metadata).toContain('freebuff_reasoning_effort')
    expect(metadata).toContain('freebuffReasoningEffort')
  })
})
