/**
 * Prod origin of the web app (marketing site + browser sign-in).
 * The CLI and Freebuff Desktop both send users here for the device-code login
 * flow; sharing the literal keeps their prod defaults from drifting.
 *
 * FORK (MethaTech): points at our own site instead of freebuff.com.
 * KNOWN GAP: the device-code endpoints the CLI calls
 * (`/api/auth/cli/code` + `/api/auth/cli/status`) do NOT exist in the
 * MethaTech panel yet, so device-code login will fail until the panel
 * implements them (separate panel task). See docs/FORK-METHATECH.md.
 */
export const FREEBUFF_WEB_URL_PROD = 'https://methatech.eu.org'
