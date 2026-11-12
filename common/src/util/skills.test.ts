import { afterEach, describe, expect, test } from 'bun:test'

import {
  formatAvailableSkillsXml,
  formatSkillContent,
  getBundledSkillsDir,
  stripSkillFrontmatter,
} from './skills'

import type { SkillsMap } from '../types/skill'

describe('formatSkillContent', () => {
  const skillWithFrontmatter = {
    content: [
      '---',
      'name: systematic-debugging',
      'description: Find the root cause of a bug before fixing it.',
      'author: Hermes Agent (adapted from obra/superpowers)',
      'license: Apache-2.0',
      '---',
      '',
      '# Systematic Debugging',
      '',
      'Reproduce the bug first.',
    ].join('\n'),
    filePath: '/skills/systematic-debugging/SKILL.md',
  }

  test('strips the frontmatter so metadata never reaches the model', () => {
    const formatted = formatSkillContent(skillWithFrontmatter)

    // The body is intact.
    expect(formatted).toContain('# Systematic Debugging')
    expect(formatted).toContain('Reproduce the bug first.')
    expect(formatted).toContain(
      'Base directory for this skill: "/skills/systematic-debugging/"',
    )
    // No frontmatter line survives — in particular not the author line
    // naming the upstream agent.
    expect(formatted).not.toContain('---')
    expect(formatted).not.toContain('author:')
    expect(formatted).not.toContain('Hermes Agent')
    expect(formatted).not.toContain('license:')
    expect(formatted).not.toContain('description: Find the root cause')
  })

  test('leaves content without frontmatter untouched', () => {
    const formatted = formatSkillContent({
      content: '# Review\n\nCheck the diff.',
      filePath: '/skills/review/SKILL.md',
    })

    expect(formatted).toContain('# Review')
    expect(formatted).toContain('Check the diff.')
  })

  test('keeps a markdown horizontal rule in the body', () => {
    // A `---` line AFTER the closing delimiter is body content, not
    // frontmatter, and must survive the strip.
    const formatted = formatSkillContent({
      content: '---\nname: review\ndescription: x\n---\n\n# Review\n\n---\n\nDone.',
      filePath: '/skills/review/SKILL.md',
    })

    expect(formatted).toContain('# Review')
    expect(formatted).toContain('Done.')
    expect(formatted).toContain('\n---\n')
  })

  test('does not mangle content with an unterminated frontmatter block', () => {
    const content = '---\nname: review\ndescription: x\n\n# Review\n'
    expect(stripSkillFrontmatter(content)).toBe(content)
  })

  test('does not strip a `---js` opener (the parser refuses it too)', () => {
    const content = '---js\nglobalThis.x = 1\n---\n\n# Review\n'
    expect(stripSkillFrontmatter(content)).toBe(content)
  })
})

describe('getBundledSkillsDir', () => {
  const realExecPath = process.execPath
  const realFlag = process.env.METHATECH_IS_BINARY

  afterEach(() => {
    process.execPath = realExecPath
    if (realFlag === undefined) delete process.env.METHATECH_IS_BINARY
    else process.env.METHATECH_IS_BINARY = realFlag
  })

  test('returns undefined outside the compiled binary', () => {
    delete process.env.METHATECH_IS_BINARY
    expect(getBundledSkillsDir()).toBeUndefined()
  })

  test('resolves to the skills sibling of the binary when built', () => {
    process.env.METHATECH_IS_BINARY = 'true'
    process.execPath = '/usr/local/bin/methatech'
    expect(getBundledSkillsDir()).toBe('/usr/local/bin/skills')
  })
})

describe('formatAvailableSkillsXml', () => {
  test('omits skills that only the user may invoke', () => {
    const skills: SkillsMap = {
      deploy: {
        name: 'deploy',
        description: 'Deploy the application',
        content: 'deployment instructions',
        disableModelInvocation: true,
        filePath: '/skills/deploy/SKILL.md',
      },
      review: {
        name: 'review',
        description: 'Review code changes',
        content: 'review instructions',
        filePath: '/skills/review/SKILL.md',
      },
    }

    const xml = formatAvailableSkillsXml(skills)

    expect(xml).toContain('<name>review</name>')
    expect(xml).not.toContain('deploy')
  })

  test('returns an empty listing when every skill is user-only', () => {
    const skills: SkillsMap = {
      deploy: {
        name: 'deploy',
        description: 'Deploy the application',
        content: 'deployment instructions',
        disableModelInvocation: true,
        filePath: '/skills/deploy/SKILL.md',
      },
    }

    expect(formatAvailableSkillsXml(skills)).toBe('')
  })
})
