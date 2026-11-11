import { afterEach, beforeEach, describe, expect, it } from 'bun:test'

import {
  assertPublicHttpUrl,
  callExaFindSimilar,
  callExaSearch,
  callFirecrawlCrawl,
  callFirecrawlCrawlStatus,
  callFirecrawlScrape,
  getExaApiKey,
  getFirecrawlApiKey,
} from '../../../../llm-api/web-intelligence-api'
import { handleExaSearch } from '../exa-search'
import { handleFirecrawlCrawl } from '../firecrawl-crawl'
import { handleFirecrawlScrape } from '../firecrawl-scrape'

const logger: any = {
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function captureFetch(
  respond: (url: string, init?: RequestInit) => Response,
): { fetch: typeof globalThis.fetch; calls: { url: string; init?: RequestInit }[] } {
  const calls: { url: string; init?: RequestInit }[] = []
  const fetch = (async (url: any, init?: RequestInit) => {
    calls.push({ url: String(url), init })
    return respond(String(url), init)
  }) as typeof globalThis.fetch
  return { fetch, calls }
}

function outputValue(output: unknown): Record<string, unknown> {
  return (output as any)[0].value as Record<string, unknown>
}

describe('web-intelligence-api', () => {
  beforeEach(() => {
    process.env.EXA_API_KEY = 'test-exa-key'
    process.env.FIRECRAWL_API_KEY = 'test-firecrawl-key'
  })

  afterEach(() => {
    delete process.env.EXA_API_KEY
    delete process.env.FIRECRAWL_API_KEY
  })

  it('reads keys from the environment at call time', () => {
    expect(getExaApiKey()).toBe('test-exa-key')
    expect(getFirecrawlApiKey()).toBe('test-firecrawl-key')
    delete process.env.EXA_API_KEY
    expect(getExaApiKey()).toBeUndefined()
  })

  it('assertPublicHttpUrl accepts public https URLs', () => {
    expect(assertPublicHttpUrl('https://example.com/docs').hostname).toBe(
      'example.com',
    )
  })

  it('assertPublicHttpUrl rejects localhost, private, and non-http URLs', () => {
    for (const bad of [
      'http://localhost:3000/x',
      'http://127.0.0.1/x',
      'http://10.0.0.5/x',
      'http://172.16.4.2/x',
      'http://192.168.1.1/x',
      'http://169.254.169.254/latest/meta-data/',
      'ftp://example.com/x',
      'https://user:pass@example.com/x',
    ]) {
      expect(() => assertPublicHttpUrl(bad)).toThrow()
    }
  })

  it('exa_search sends x-api-key and formats results with highlights', async () => {
    const { fetch, calls } = captureFetch(() =>
      jsonResponse({
        results: [
          {
            title: 'TanStack Query',
            url: 'https://tanstack.com/query',
            publishedDate: '2026-01-01',
            text: 'staleTime defaults to 0.',
            highlights: ['staleTime defaults to 0'],
          },
        ],
      }),
    )
    const result = await callExaSearch({
      query: 'TanStack Query staleTime default',
      fetch,
      signal: new AbortController().signal,
      logger,
    })
    expect(calls).toHaveLength(1)
    expect(calls[0].url).toBe('https://api.exa.ai/search')
    expect((calls[0].init!.headers as Record<string, string>)['x-api-key']).toBe(
      'test-exa-key',
    )
    const body = JSON.parse(calls[0].init!.body as string)
    expect(body.query).toBe('TanStack Query staleTime default')
    expect(result).toContain('TanStack Query')
    expect(result).toContain('https://tanstack.com/query')
    expect(result).toContain('staleTime defaults to 0')
  })

  it('exa_search without a key reports not-configured instead of calling', async () => {
    delete process.env.EXA_API_KEY
    const { fetch, calls } = captureFetch(() => jsonResponse({ results: [] }))
    await expect(
      callExaSearch({
        query: 'x',
        fetch,
        signal: new AbortController().signal,
        logger,
      }),
    ).rejects.toThrow('EXA_API_KEY is not set')
    expect(calls).toHaveLength(0)
  })

  it('EXA_API_BASE_URL overrides the API base URL (test seam)', async () => {
    process.env.EXA_API_BASE_URL = 'http://127.0.0.1:8898'
    try {
      const { fetch, calls } = captureFetch(() => jsonResponse({ results: [] }))
      await callExaSearch({
        query: 'x',
        fetch,
        signal: new AbortController().signal,
        logger,
      })
      expect(calls[0].url).toBe('http://127.0.0.1:8898/search')
    } finally {
      delete process.env.EXA_API_BASE_URL
    }
  })

  it('FIRECRAWL_API_BASE_URL overrides the API base URL (test seam)', async () => {
    process.env.FIRECRAWL_API_BASE_URL = 'http://127.0.0.1:8898/v2'
    try {
      const { fetch, calls } = captureFetch(() =>
        jsonResponse({ success: true, data: { markdown: 'hi' } }),
      )
      await callFirecrawlScrape({
        url: 'https://example.com/p',
        fetch,
        signal: new AbortController().signal,
        logger,
      })
      expect(calls[0].url).toBe('http://127.0.0.1:8898/v2/scrape')
    } finally {
      delete process.env.FIRECRAWL_API_BASE_URL
    }
  })

  it('exa_search surfaces HTTP errors with status', async () => {
    const { fetch } = captureFetch(() =>
      jsonResponse({ error: 'unauthorized' }, 401),
    )
    await expect(
      callExaSearch({
        query: 'x',
        fetch,
        signal: new AbortController().signal,
        logger,
      }),
    ).rejects.toThrow('HTTP 401')
  })

  it('exa_find_similar rejects a private URL before any fetch', async () => {
    const { fetch, calls } = captureFetch(() => jsonResponse({ results: [] }))
    await expect(
      callExaFindSimilar({
        url: 'http://localhost:3000/secret',
        fetch,
        signal: new AbortController().signal,
        logger,
      }),
    ).rejects.toThrow('private networks')
    expect(calls).toHaveLength(0)
  })

  it('firecrawl_scrape sends Bearer auth and returns title plus markdown', async () => {
    const { fetch, calls } = captureFetch(() =>
      jsonResponse({
        success: true,
        data: {
          title: 'Scrape',
          url: 'https://example.com/page',
          markdown: '# Hello\n\nPage body.',
        },
      }),
    )
    const result = await callFirecrawlScrape({
      url: 'https://example.com/page',
      fetch,
      signal: new AbortController().signal,
      logger,
    })
    expect(calls[0].url).toBe('https://api.firecrawl.dev/v2/scrape')
    expect(
      (calls[0].init!.headers as Record<string, string>).Authorization,
    ).toBe('Bearer test-firecrawl-key')
    expect(result).toContain('# Scrape')
    expect(result).toContain('Page body.')
  })

  it('firecrawl_crawl returns the job ID for polling', async () => {
    const { fetch } = captureFetch(() =>
      jsonResponse({ success: true, id: 'job-123', status: 'scraping' }),
    )
    const result = await callFirecrawlCrawl({
      url: 'https://example.com',
      fetch,
      signal: new AbortController().signal,
      logger,
    })
    expect(result).toContain('job-123')
    expect(result).toContain('firecrawl_check_crawl_status')
  })

  it('firecrawl_check_crawl_status returns status and pages', async () => {
    const { fetch } = captureFetch(() =>
      jsonResponse({
        status: 'completed',
        completed: 2,
        total: 2,
        data: [
          { title: 'Home', url: 'https://example.com/', markdown: 'Welcome.' },
          { title: 'Docs', url: 'https://example.com/docs', markdown: 'Docs.' },
        ],
      }),
    )
    const result = await callFirecrawlCrawlStatus({
      crawlId: 'job-123',
      fetch,
      signal: new AbortController().signal,
      logger,
    })
    expect(result).toContain('completed')
    expect(result).toContain('https://example.com/docs')
    expect(result).toContain('Welcome.')
  })
})

describe('web-intelligence handlers', () => {
  // The handlers pass globalThis.fetch to the transport (the runtime-injected
  // fetch is the stubbed Codebuff hosted-services fetch in BYOK runs), so the
  // handler tests stub the global fetch instead of injecting one.
  const realFetch = globalThis.fetch
  let stubbedFetch: typeof globalThis.fetch
  let stubCalls: { url: string; init?: RequestInit }[]

  function stubFetchWith(respond: (url: string, init?: RequestInit) => Response) {
    stubCalls = []
    stubbedFetch = (async (url: any, init?: RequestInit) => {
      stubCalls.push({ url: String(url), init })
      return respond(String(url), init)
    }) as typeof globalThis.fetch
    globalThis.fetch = stubbedFetch
  }

  beforeEach(() => {
    process.env.EXA_API_KEY = 'test-exa-key'
    process.env.FIRECRAWL_API_KEY = 'test-firecrawl-key'
  })

  afterEach(() => {
    globalThis.fetch = realFetch
    delete process.env.EXA_API_KEY
    delete process.env.FIRECRAWL_API_KEY
  })

  it('exa_search handler returns an errorMessage result when the key is missing', async () => {
    delete process.env.EXA_API_KEY
    stubFetchWith(() => jsonResponse({ results: [] }))
    const { output } = await handleExaSearch({
      previousToolCallFinished: Promise.resolve(),
      toolCall: { toolName: 'exa_search', input: { query: 'x' } } as any,
      logger,
      fetch: stubbedFetch,
      signal: new AbortController().signal,
    })
    expect(outputValue(output).errorMessage).toContain('EXA_API_KEY is not set')
    expect(stubCalls).toHaveLength(0)
  })

  it('firecrawl_scrape handler returns the scraped markdown as result', async () => {
    stubFetchWith(() =>
      jsonResponse({
        success: true,
        data: {
          title: 'Page',
          url: 'https://example.com/p',
          markdown: 'Content here.',
        },
      }),
    )
    const { output } = await handleFirecrawlScrape({
      previousToolCallFinished: Promise.resolve(),
      toolCall: {
        toolName: 'firecrawl_scrape',
        input: { url: 'https://example.com/p' },
      } as any,
      logger,
      fetch: stubbedFetch,
      signal: new AbortController().signal,
    })
    expect(outputValue(output).result).toContain('Content here.')
  })

  it('firecrawl_crawl handler returns the job ID as result', async () => {
    stubFetchWith(() =>
      jsonResponse({ success: true, id: 'job-9', status: 'scraping' }),
    )
    const { output } = await handleFirecrawlCrawl({
      previousToolCallFinished: Promise.resolve(),
      toolCall: {
        toolName: 'firecrawl_crawl',
        input: { url: 'https://example.com', limit: 5 },
      } as any,
      logger,
      fetch: stubbedFetch,
      signal: new AbortController().signal,
    })
    expect(outputValue(output).result).toContain('job-9')
  })
})
