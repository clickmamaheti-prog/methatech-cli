import { mock } from 'bun:test'

import type { MethaTechApiClient } from '../../utils/methatech-api'

export interface MockApiClientOverrides {
  get?: ReturnType<typeof mock>
  post?: ReturnType<typeof mock>
  put?: ReturnType<typeof mock>
  patch?: ReturnType<typeof mock>
  delete?: ReturnType<typeof mock>
  request?: ReturnType<typeof mock>
  me?: ReturnType<typeof mock>
  usage?: ReturnType<typeof mock>
  loginCode?: ReturnType<typeof mock>
  loginStatus?: ReturnType<typeof mock>
  publish?: ReturnType<typeof mock>
  logout?: ReturnType<typeof mock>
  feedback?: ReturnType<typeof mock>
  baseUrl?: string
  authToken?: string
}

/**
 * Default OK response for mock API methods.
 * Returns { ok: true, status: 200 } without data, matching our ApiResponse type
 * where `data` is optional for responses without a body.
 */
const defaultOkResponse = () =>
  Promise.resolve({ ok: true as const, status: 200 })

/**
 * Creates a mock MethaTechApiClient with sensible defaults.
 * All methods return { ok: true, status: 200 } by default.
 * Pass overrides to customize specific methods.
 */
export const createMockApiClient = (
  overrides: MockApiClientOverrides = {},
): MethaTechApiClient => ({
  get: (overrides.get ?? mock(defaultOkResponse)) as MethaTechApiClient['get'],
  post: (overrides.post ??
    mock(defaultOkResponse)) as MethaTechApiClient['post'],
  put: (overrides.put ?? mock(defaultOkResponse)) as MethaTechApiClient['put'],
  patch: (overrides.patch ??
    mock(defaultOkResponse)) as MethaTechApiClient['patch'],
  delete: (overrides.delete ??
    mock(defaultOkResponse)) as MethaTechApiClient['delete'],
  request: (overrides.request ??
    mock(defaultOkResponse)) as MethaTechApiClient['request'],
  me: (overrides.me ?? mock(defaultOkResponse)) as MethaTechApiClient['me'],
  usage: (overrides.usage ??
    mock(defaultOkResponse)) as MethaTechApiClient['usage'],
  loginCode: (overrides.loginCode ??
    mock(defaultOkResponse)) as MethaTechApiClient['loginCode'],
  loginStatus: (overrides.loginStatus ??
    mock(defaultOkResponse)) as MethaTechApiClient['loginStatus'],
  publish: (overrides.publish ??
    mock(defaultOkResponse)) as MethaTechApiClient['publish'],
  logout: (overrides.logout ??
    mock(defaultOkResponse)) as MethaTechApiClient['logout'],
  feedback: (overrides.feedback ??
    mock(defaultOkResponse)) as MethaTechApiClient['feedback'],
  baseUrl: overrides.baseUrl ?? 'https://test.console.methatech.eu.org',
  authToken: overrides.authToken,
})
