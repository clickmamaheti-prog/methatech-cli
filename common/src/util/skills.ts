import path from 'path'

import type { SkillDefinition, SkillsMap } from '../types/skill'

export function isSkillModelInvocable(skill: SkillDefinition): boolean {
  return skill.disableModelInvocation !== true
}

/**
 * The plain `---` opener the skill parser accepts (see parse-skill.ts):
 * an optional byte-order mark, `---`, optional trailing spaces, one newline.
 * A language suffix (`---js`, `---coffee`) is NOT a plain opener — the
 * parser refuses it outright, and so does this strip.
 */
const FRONTMATTER_OPENER = /^\uFEFF?---[ \t]*\r?\n/
/** The closing `---` on its own line (start of the block, or after a newline). */
const FRONTMATTER_CLOSER = /(?:^|\n)---[ \t]*\r?(?:\n|$)/

/**
 * Remove a leading YAML frontmatter block (`---` ... `---`) from a SKILL.md
 * document and return the body. Content without a plain frontmatter opener,
 * or with no closing delimiter, is returned unchanged.
 *
 * The frontmatter is metadata (name, description, author, license) — the
 * model needs the skill's instructions, not its attribution. In particular
 * the `author:` line names the upstream agent that wrote the skill, and
 * must never reach the model: the skill list (name + description) is clean,
 * but the full file content is not.
 */
export function stripSkillFrontmatter(content: string): string {
  const opener = content.match(FRONTMATTER_OPENER)
  if (!opener) return content
  const rest = content.slice(opener[0].length)
  const closer = rest.match(FRONTMATTER_CLOSER)
  if (!closer || closer.index === undefined) return content
  return rest.slice(closer.index + closer[0].length)
}

/**
 * Directory of skills bundled with the compiled CLI binary, resolved only
 * when running as that binary.
 *
 * The repo's `.agents/skills/` are copied next to the binary at build time
 * (see cli/scripts/build-binary.ts), so an npm user in a fresh directory
 * still gets the bundled skills. This resolves to that sibling directory
 * only when the process IS the compiled binary; in any other host (dev,
 * server, tests) it is undefined and there is no bundled source.
 *
 * A compile-time define: only the literal `process.env.METHATECH_IS_BINARY`
 * is replaced by `bun build --compile` (see cli/scripts/freebuff-mode.ts
 * for FREEBUFF_MODE). In a dev/test run it is unset and this returns
 * undefined.
 */
export function getBundledSkillsDir(): string | undefined {
  if (process.env.METHATECH_IS_BINARY !== 'true') return undefined
  return path.join(path.dirname(process.execPath), 'skills')
}

/** Keep bundled resource paths usable in both tool and user-invoked skills. */
export function formatSkillContent(
  skill: Pick<SkillDefinition, 'content' | 'filePath'>,
): string {
  // Forward slashes work in Windows file tools and Git Bash as well as POSIX.
  // Preserve the supplying host's path rather than resolving it on this host.
  const filePath = skill.filePath.replace(/\\/g, '/')
  const baseDirectory = filePath.slice(0, filePath.lastIndexOf('/') + 1) || './'
  // Strip the frontmatter: only the skill's instructions reach the model,
  // never its metadata (in particular never the `author:` line).
  const body = stripSkillFrontmatter(skill.content)
  return `Base directory for this skill: ${JSON.stringify(baseDirectory)}
Resolve skill-relative paths (such as scripts/, references/, and assets/) against this directory, not the project's working directory.

${body}`
}

/**
 * Escapes special XML characters in a string.
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Formats available skills as XML for inclusion in tool descriptions.
 */
export function formatAvailableSkillsXml(skills: SkillsMap): string {
  const skillEntries = Object.values(skills).filter(isSkillModelInvocable)
  if (skillEntries.length === 0) {
    return ''
  }

  const skillsXml = skillEntries
    .map(
      (skill) =>
        `  <skill>\n    <name>${skill.name}</name>\n    <description>${escapeXml(skill.description)}</description>\n  </skill>`,
    )
    .join('\n')

  return `<available_skills>\n${skillsXml}\n</available_skills>`
}
