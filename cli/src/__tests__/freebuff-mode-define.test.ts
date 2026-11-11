import { describe, expect, test } from 'bun:test'

import { freebuffModeDefine } from '../../scripts/freebuff-mode'

describe('freebuffModeDefine', () => {
  test('refuses a methatech artifact that is not the free build', () => {
    expect(() => freebuffModeDefine('methatech', {})).toThrow(/FREEBUFF_MODE/)
    expect(() =>
      freebuffModeDefine('methatech', { FREEBUFF_MODE: 'false' }),
    ).toThrow(/FREEBUFF_MODE/)
    expect(() =>
      freebuffModeDefine('methatech', { FREEBUFF_MODE: '1' }),
    ).toThrow(/FREEBUFF_MODE/)
  })

  test('builds methatech with the flag', () => {
    expect(freebuffModeDefine('methatech', { FREEBUFF_MODE: 'true' })).toBe(
      'true',
    )
  })

  test('other artifacts default to the Codebuff client', () => {
    expect(freebuffModeDefine('codebuff', {})).toBe('false')
    expect(freebuffModeDefine('codecane', { FREEBUFF_MODE: '1' })).toBe('false')
    expect(freebuffModeDefine('codecane', { FREEBUFF_MODE: 'true' })).toBe(
      'true',
    )
  })
})
