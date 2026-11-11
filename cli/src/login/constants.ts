import { FREEBUFF_WEB_URL_PROD } from '@methatech/common/constants/hosts'
import { env, IS_DEV } from '@methatech/common/env'

import { IS_FREEBUFF } from '../utils/constants'
import { FREEBUFF_WORDMARK, FREEBUFF_WORDMARK_COMPACT } from '../utils/freebuff-wordmark'

// Get the website URL from environment or use default
export const WEBSITE_URL = env.NEXT_PUBLIC_METHATECH_APP_URL

/**
 * The freebuff web app, which is where the login flow goes instead of
 * console.methatech.eu.org -- and, since COD-376, where the sponsored-proposal REST front
 * lives too.
 *
 * EXPORTED so that second caller resolves the host the same way. It read
 * `process.env.NEXT_PUBLIC_FREEBUFF_APP_URL` directly, which skips both halves
 * of what this constant does: the `@methatech/common/env` schema (so a typo or
 * an unset variable falls back silently rather than being caught at import),
 * and the `IS_DEV` branch (so a developer's proposal calls left the laptop and
 * hit production while every other CLI call stayed local).
 */
export const FREEBUFF_WEB_URL = IS_DEV
  ? 'http://localhost:3002'
  : (env.NEXT_PUBLIC_FREEBUFF_APP_URL ?? FREEBUFF_WEB_URL_PROD)
export const LOGIN_WEBSITE_URL = IS_FREEBUFF ? FREEBUFF_WEB_URL : WEBSITE_URL

// MethaTech ASCII Logo - compact version for 80-width terminals
const LOGO_METHATECH = `
  ██████╗ ██████╗ ██████╗ ███████╗██████╗ ██╗   ██╗███████╗███████╗
 ██╔════╝██╔═══██╗██╔══██╗██╔════╝██╔══██╗██║   ██║██╔════╝██╔════╝
 ██║     ██║   ██║██║  ██║█████╗  ██████╔╝██║   ██║█████╗  █████╗
 ██║     ██║   ██║██║  ██║██╔══╝  ██╔══██╗██║   ██║██╔══╝  ██╔══╝
 ╚██████╗╚██████╔╝██████╔╝███████╗██████╔╝╚██████╔╝██║     ██║
  ╚═════╝ ╚═════╝ ╚═════╝ ╚══════╝╚═════╝  ╚═════╝ ╚═╝     ╚═╝
`

const LOGO_SMALL_METHATECH = `
  ██████╗ ██████╗
 ██╔════╝ ██╔══██╗
 ██║      ██████╔╝
 ██║      ██╔══██╗
 ╚██████╗ ██████╔╝
  ╚═════╝ ╚═════╝
`

export const LOGO = IS_FREEBUFF ? FREEBUFF_WORDMARK : LOGO_METHATECH
export const LOGO_SMALL = IS_FREEBUFF ? FREEBUFF_WORDMARK_COMPACT : LOGO_SMALL_METHATECH

// Shadow/border characters that receive the sheen animation effect
export const SHADOW_CHARS = new Set([
  '╚',
  '═',
  '╝',
  '║',
  '╔',
  '╗',
  '╠',
  '╣',
  '╦',
  '╩',
  '╬',
])

// Sheen animation constants
export const SHEEN_STEP = 2 // Advance 2 positions per frame for efficiency
export const SHEEN_INTERVAL_MS = 150
