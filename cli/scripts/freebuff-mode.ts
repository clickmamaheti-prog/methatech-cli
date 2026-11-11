/**
 * The `FREEBUFF_MODE` literal a CLI build compiles in.
 *
 * `bun build --compile` freezes `process.env.FREEBUFF_MODE` into the artifact,
 * and `IS_FREEBUFF` (`cli/src/utils/constants.ts`) is `=== 'true'` on it. The
 * define used to default to 'false', so a `methatech` binary built without the
 * variable (the `workflow_dispatch` path of `cli-release-build.yml` did exactly
 * that) compiled as the paid (non-free) client under the MethaTech name, and nothing
 * failed. The MethaTech artifact now refuses to build unless it is the MethaTech build.
 */
export function freebuffModeDefine(
  binaryName: string,
  env: Record<string, string | undefined>,
): 'true' | 'false' {
  const isFree = env.FREEBUFF_MODE === 'true'
  if (binaryName === 'methatech' && !isFree) {
    throw new Error(
      `Refusing to build methatech with FREEBUFF_MODE=${env.FREEBUFF_MODE ?? '(unset)'}: ` +
        'it would compile as the MethaTech client. Set FREEBUFF_MODE=true.',
    )
  }
  return isFree ? 'true' : 'false'
}
