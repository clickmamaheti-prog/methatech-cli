/** MethaTech wordmark for the terminal, in the same block style as the
 * Freebuff wordmark this replaces (solid blocks, half-block rounded
 * corners, two-column stems, Outfit-style letterforms).
 *
 * Medium size on purpose (Reza 2026-11-10): the full wordmark is 5 rows
 * x 56 columns so "MethaTech" (9 letters) fits an 80-column mobile
 * terminal with comfortable margins on both sides, and the compact
 * variant is 4 rows x 46 columns for narrow terminals. No separate logo
 * block: the capital M opens the word, the capital T opens "Tech".
 * Kept as text so the CLI needs neither a font nor an image renderer.
 */
export const FREEBUFF_WORDMARK = `██   ██        ██  ██           ██████             ██
███ ███  ▄███  ██  ██     ▄███    ██    ▄███  ▄███ ██
██ █ ██ ██▄██ ████ ██▄██ ██  ██   ██   ██▄██ ██    ██▄██
██   ██ ██▀▀▀  ██  ██ ██ ██▄▄██   ██   ██▀▀▀ ██    ██ ██
██   ██  ▀███  ▀██ ██ ██  ▀████   ██    ▀███  ▀███ ██ ██`

export const FREEBUFF_WORDMARK_COMPACT = `█   █       █  █          █████           █
██ ██  ▄██  █  █     ▄██    █    ▄██  ▄██ █
█ █ █ █▄██ ███ █▄██ █  ██   █   █▄██ █    █▄██
█   █  ▀██  ▀█ █  █  ▀███   █    ▀██  ▀██ █  █`
