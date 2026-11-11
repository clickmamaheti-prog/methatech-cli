// FORK (MethaTech): the catalog row the catalog-root flow needs. Without
// a row, a turn runs plain base3 whose model defaults to OPUS_MODEL instead
// of the user's pick (see docs/FORK-METHATECH.md §9).
import { describe, expect, test } from 'bun:test'

import {
  methatechCatalogRow,
  methatechModelDirectory,
} from '../methatech-model-directory'

describe('methatechCatalogRow', () => {
  test('panel model yields a row whose handle is the panel model id', () => {
    const row = methatechCatalogRow('deepseek-v4-flash')
    expect(row?.key).toBe('deepseek-v4-flash')
    expect(row?.handle).toBe('deepseek-v4-flash')
    expect(row?.displayName).toBe('DeepSeek V4 Flash')
    expect(row?.access).toBe('open')
    expect(row?.premium).toBe(false)
    expect(methatechModelDirectory.row('deepseek-v4-flash')?.key).toBe(
      'deepseek-v4-flash',
    )
  })

  test('paid panel model is premium', () => {
    expect(methatechCatalogRow('claude-sonnet-4-6')?.premium).toBe(true)
  })

  test('non-panel model has no row', () => {
    expect(methatechCatalogRow('anthropic/claude-opus-5')).toBeUndefined()
    expect(methatechModelDirectory.row('anthropic/claude-opus-5')).toBeUndefined()
  })
})
