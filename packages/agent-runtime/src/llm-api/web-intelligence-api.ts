/**
 * Exa + Firecrawl transport for the MethaTech fork's web-intelligence tools.
 *
 * NOTE ON FETCH: the `fetch` parameter is dependency-injected for tests, but
 * the handlers pass `globalThis.fetch`, NOT the runtime-injected `fetch`.
 * The injected fetch is the Codebuff hosted-services fetch, which is stubbed
 * to throw in BYOK runs (sdk/src/impl/agent-runtime.ts:171-177: "BYOK has no
 * Codebuff service allowance, so fail closed"). Exa/Firecrawl are third-party
 * APIs paid with the user's own env keys, not Codebuff hosted services, so
 * they use the process fetch — the same precedent as the direct provider
 * fetch in sdk/src/impl/model-provider.ts, sdk/src/tools/read-url.ts, and
 * sdk/src/byok.ts (`fetch: fetchImpl = globalThis.fetch`).
 */

import type { Logger } from '@codebuff/common/types/contracts/logger'

const EXA_API_BASE_URL_DEFAULT = 'https://api.exa.ai'
const FIRECRAWL_API_BASE_URL_DEFAULT = 'https://api.firecrawl.dev/v2'
const FETCH_TIMEOUT_MS = 30_000
const MAX_RESULT_CHARS = 20_000

/** Test seam (and self-hosted Firecrawl): override the API base URL. */
export function getExaApiBaseUrl(): string {
  return process.env.EXA_API_BASE_URL?.trim() || EXA_API_BASE_URL_DEFAULT
}

/** Test seam (and self-hosted Firecrawl): override the API base URL. */
export function getFirecrawlApiBaseUrl(): string {
  return (
    process.env.FIRECRAWL_API_BASE_URL?.trim() || FIRECRAWL_API_BASE_URL_DEFAULT
  )
}

export const EXA_API_KEY_ENV_VAR = 'EXA_API_KEY'
export const FIRECRAWL_API_KEY_ENV_VAR = 'FIRECRAWL_API_KEY'

export const EXA_NOT_CONFIGURED_MESSAGE = `${EXA_API_KEY_ENV_VAR} is not set in this MethaTech process. Export ${EXA_API_KEY_ENV_VAR}='<key>' in the shell before starting the CLI. The key is read at call time and is never written to any file.`
export const FIRECRAWL_NOT_CONFIGURED_MESSAGE = `${FIRECRAWL_API_KEY_ENV_VAR} is not set in this MethaTech process. Export ${FIRECRAWL_API_KEY_ENV_VAR}='<key>' in the shell before starting the CLI. The key is read at call time and is never written to any file.`

/** Keys are read from the process environment at call time, never from files. */
export function getExaApiKey(): string | undefined {
  return process.env[EXA_API_KEY_ENV_VAR]?.trim() || undefined
}

/** Keys are read from the process environment at call time, never from files. */
export function getFirecrawlApiKey(): string | undefined {
  return process.env[FIRECRAWL_API_KEY_ENV_VAR]?.trim() || undefined
}

/**
 * Lexical SSRF guard for user/model-supplied URLs: only http/https, no
 * credentials in the URL, and no localhost / private / link-local / reserved
 * host. This is lexical only — it does not DNS-resolve the host, so unlike
 * the SDK's pinned fetch it cannot stop DNS rebinding. Exa/Firecrawl fetch
 * the URL server-side, so the blast radius of a rebinding attack here is the
 * provider's fetcher, not this machine.
 */
export function assertPublicHttpUrl(rawUrl: string): URL {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    throw new Error(`Invalid URL: ${rawUrl}`)
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`Only http:// and https:// URLs are allowed: ${rawUrl}`)
  }
  if (url.username || url.password) {
    throw new Error(`URLs with embedded credentials are not allowed: ${rawUrl}`)
  }
  const host = url.hostname.toLowerCase()
  const blocked =
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host === '0.0.0.0' ||
    host === '::' ||
    host === '::1' ||
    host === '[::1]' ||
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^169\.254\./.test(host) ||
    /^0\./.test(host) ||
    /^172\.(1[6-9]|2[0-9]|3[01])\./.test(host) ||
    /^f[cd]/.test(host) ||
    /^fe[89ab]/.test(host)
  if (blocked) {
    throw new Error(
      `URLs pointing at localhost or private networks are not allowed: ${rawUrl}`,
    )
  }
  return url
}

function truncateResult(text: string): string {
  if (text.length <= MAX_RESULT_CHARS) return text
  return `${text.slice(0, MAX_RESULT_CHARS)}\n\n[Result truncated to ${MAX_RESULT_CHARS} characters.]`
}

type PostJsonParams = {
  url: string
  apiKey: string
  authScheme: 'x-api-key' | 'bearer'
  body: Record<string, unknown>
  fetch: typeof globalThis.fetch
  signal: AbortSignal
  logger: Logger
  label: string
}

async function postJson({
  url,
  apiKey,
  authScheme,
  body,
  fetch,
  signal,
  logger,
  label,
}: PostJsonParams): Promise<Record<string, unknown>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (authScheme === 'x-api-key') {
    headers['x-api-key'] = apiKey
  } else {
    headers.Authorization = `Bearer ${apiKey}`
  }
  const startedAt = Date.now()
  let response: Response
  try {
    response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.any([
        signal,
        AbortSignal.timeout(FETCH_TIMEOUT_MS),
      ]),
    })
  } catch (error) {
    throw new Error(
      `${label} request failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    )
  }
  const text = await response.text()
  if (!response.ok) {
    const snippet = text.slice(0, 500)
    logger.warn(
      { label, status: response.status, durationMs: Date.now() - startedAt },
      `${label} returned HTTP ${response.status}`,
    )
    throw new Error(
      `${label} returned HTTP ${response.status}${snippet ? `: ${snippet}` : ''}`,
    )
  }
  try {
    const parsed: unknown = JSON.parse(text)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('unexpected non-object response')
    }
    return parsed as Record<string, unknown>
  } catch {
    throw new Error(`${label} returned a response that is not JSON`)
  }
}

async function getJson(params: {
  url: string
  apiKey: string
  fetch: typeof globalThis.fetch
  signal: AbortSignal
  logger: Logger
  label: string
}): Promise<Record<string, unknown>> {
  const { url, apiKey, fetch, signal, logger, label } = params
  const startedAt = Date.now()
  let response: Response
  try {
    response = await fetch(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.any([
        signal,
        AbortSignal.timeout(FETCH_TIMEOUT_MS),
      ]),
    })
  } catch (error) {
    throw new Error(
      `${label} request failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    )
  }
  const text = await response.text()
  if (!response.ok) {
    const snippet = text.slice(0, 500)
    logger.warn(
      { label, status: response.status, durationMs: Date.now() - startedAt },
      `${label} returned HTTP ${response.status}`,
    )
    throw new Error(
      `${label} returned HTTP ${response.status}${snippet ? `: ${snippet}` : ''}`,
    )
  }
  try {
    const parsed: unknown = JSON.parse(text)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('unexpected non-object response')
    }
    return parsed as Record<string, unknown>
  } catch {
    throw new Error(`${label} returned a response that is not JSON`)
  }
}

type ExaResult = {
  title?: unknown
  url?: unknown
  publishedDate?: unknown
  text?: unknown
  highlights?: unknown
}

function formatExaResults(results: unknown): string {
  if (!Array.isArray(results) || results.length === 0) {
    return 'No results.'
  }
  const lines: string[] = []
  for (const item of results as ExaResult[]) {
    const title = typeof item.title === 'string' ? item.title : ''
    const url = typeof item.url === 'string' ? item.url : ''
    const publishedDate =
      typeof item.publishedDate === 'string' ? item.publishedDate : ''
    lines.push(`- ${title}${url ? ` (${url})` : ''}${publishedDate ? ` — ${publishedDate}` : ''}`)
    const text = typeof item.text === 'string' ? item.text.trim() : ''
    if (text) lines.push(`  ${text}`)
    if (Array.isArray(item.highlights)) {
      for (const highlight of item.highlights) {
        if (typeof highlight === 'string' && highlight.trim()) {
          lines.push(`  > ${highlight.trim()}`)
        }
      }
    }
  }
  return lines.join('\n')
}

export async function callExaSearch(params: {
  query: string
  numResults?: number
  searchType?: 'auto' | 'fast' | 'deep'
  fetch: typeof globalThis.fetch
  signal: AbortSignal
  logger: Logger
}): Promise<string> {
  const apiKey = getExaApiKey()
  if (!apiKey) throw new Error(EXA_NOT_CONFIGURED_MESSAGE)
  const { query, numResults = 5, searchType = 'auto', fetch, signal, logger } =
    params
  const json = await postJson({
    url: `${getExaApiBaseUrl()}/search`,
    apiKey,
    authScheme: 'x-api-key',
    body: {
      query,
      numResults,
      type: searchType,
      contents: { text: true, highlights: true },
    },
    fetch,
    signal,
    logger,
    label: 'Exa search',
  })
  return truncateResult(formatExaResults(json.results))
}

export async function callExaFindSimilar(params: {
  url: string
  numResults?: number
  fetch: typeof globalThis.fetch
  signal: AbortSignal
  logger: Logger
}): Promise<string> {
  const apiKey = getExaApiKey()
  if (!apiKey) throw new Error(EXA_NOT_CONFIGURED_MESSAGE)
  assertPublicHttpUrl(params.url)
  const { url, numResults = 5, fetch, signal, logger } = params
  const json = await postJson({
    url: `${getExaApiBaseUrl()}/findSimilar`,
    apiKey,
    authScheme: 'x-api-key',
    body: {
      url,
      numResults,
      contents: { text: true, highlights: true },
    },
    fetch,
    signal,
    logger,
    label: 'Exa findSimilar',
  })
  return truncateResult(formatExaResults(json.results))
}

export async function callFirecrawlScrape(params: {
  url: string
  onlyMainContent?: boolean
  fetch: typeof globalThis.fetch
  signal: AbortSignal
  logger: Logger
}): Promise<string> {
  const apiKey = getFirecrawlApiKey()
  if (!apiKey) throw new Error(FIRECRAWL_NOT_CONFIGURED_MESSAGE)
  assertPublicHttpUrl(params.url)
  const { url, onlyMainContent = true, fetch, signal, logger } = params
  const json = await postJson({
    url: `${getFirecrawlApiBaseUrl()}/scrape`,
    apiKey,
    authScheme: 'bearer',
    body: {
      url,
      formats: ['markdown'],
      onlyMainContent,
    },
    fetch,
    signal,
    logger,
    label: 'Firecrawl scrape',
  })
  const data = json.data as Record<string, unknown> | undefined
  if (!data) return 'No content returned.'
  const title = typeof data.title === 'string' ? data.title : ''
  const sourceUrl = typeof data.url === 'string' ? data.url : url
  const markdown = typeof data.markdown === 'string' ? data.markdown : ''
  return truncateResult(
    `${title ? `# ${title}\n` : ''}Source: ${sourceUrl}\n\n${markdown || 'No markdown content returned.'}`,
  )
}

export async function callFirecrawlCrawl(params: {
  url: string
  limit?: number
  fetch: typeof globalThis.fetch
  signal: AbortSignal
  logger: Logger
}): Promise<string> {
  const apiKey = getFirecrawlApiKey()
  if (!apiKey) throw new Error(FIRECRAWL_NOT_CONFIGURED_MESSAGE)
  assertPublicHttpUrl(params.url)
  const { url, limit = 10, fetch, signal, logger } = params
  const json = await postJson({
    url: `${getFirecrawlApiBaseUrl()}/crawl`,
    apiKey,
    authScheme: 'bearer',
    body: {
      url,
      limit,
      scrapeOptions: { formats: ['markdown'], onlyMainContent: true },
    },
    fetch,
    signal,
    logger,
    label: 'Firecrawl crawl',
  })
  const id = typeof json.id === 'string' ? json.id : ''
  const status = typeof json.status === 'string' ? json.status : 'started'
  if (!id) return 'Crawl started but no job ID was returned.'
  return `Crawl ${status}. Job ID: ${id}\nPoll the job with firecrawl_check_crawl_status using crawl_id "${id}".`
}

export async function callFirecrawlCrawlStatus(params: {
  crawlId: string
  fetch: typeof globalThis.fetch
  signal: AbortSignal
  logger: Logger
}): Promise<string> {
  const apiKey = getFirecrawlApiKey()
  if (!apiKey) throw new Error(FIRECRAWL_NOT_CONFIGURED_MESSAGE)
  const { crawlId, fetch, signal, logger } = params
  const json = await getJson({
    url: `${getFirecrawlApiBaseUrl()}/crawl/${encodeURIComponent(crawlId)}`,
    apiKey,
    fetch,
    signal,
    logger,
    label: 'Firecrawl crawl status',
  })
  const status = typeof json.status === 'string' ? json.status : 'unknown'
  const completed =
    typeof json.completed === 'number' ? json.completed : undefined
  const total = typeof json.total === 'number' ? json.total : undefined
  const counts =
    completed !== undefined || total !== undefined
      ? ` (${completed ?? '?'} of ${total ?? '?'} pages complete)`
      : ''
  const data = Array.isArray(json.data) ? json.data : []
  const lines: string[] = [`Crawl status: ${status}${counts}`]
  for (const page of data as Record<string, unknown>[]) {
    const title = typeof page.title === 'string' ? page.title : ''
    const pageUrl = typeof page.url === 'string' ? page.url : ''
    const markdown =
      typeof page.markdown === 'string' ? page.markdown.trim() : ''
    lines.push(`\n## ${title || pageUrl}\n${pageUrl}`)
    if (markdown) lines.push(markdown)
  }
  return truncateResult(lines.join('\n'))
}
