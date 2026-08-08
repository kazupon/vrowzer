import { describe, expect, test, vi } from 'vite-plus/test'
import {
  assertReleaseTagAvailable,
  checkReleasePreconditions
} from './check-release-preconditions.mjs'

type CommandResult = { code: number; stdout: string; stderr: string }
type CommandRunner = (command: string, args: string[]) => Promise<CommandResult>

function result(code = 0, stdout = '', stderr = '') {
  return { code, stdout, stderr }
}

describe('release preconditions', () => {
  test('requires a GitHub token before running git commands', async () => {
    const commandRunner = vi.fn<CommandRunner>()

    await expect(checkReleasePreconditions({ env: {}, commandRunner })).rejects.toThrow(
      'Set GH_TOKEN or GITHUB_TOKEN'
    )
    expect(commandRunner).not.toHaveBeenCalled()
  })

  test('accepts a clean main branch synchronized with origin', async () => {
    const commandRunner = vi.fn<CommandRunner>(async (_command, args) => {
      if (args[0] === 'branch') {
        return result(0, 'main\n')
      }
      if (args[0] === 'status') {
        return result()
      }
      if (args[0] === 'fetch') {
        return result()
      }
      if (args[1] === 'HEAD') {
        return result(0, 'commit\n')
      }
      if (args[1] === 'origin/main') {
        return result(0, 'commit\n')
      }
      throw new Error(`Unexpected git command: ${args.join(' ')}`)
    })

    await expect(
      checkReleasePreconditions({ env: { GH_TOKEN: 'token' }, commandRunner })
    ).resolves.toBeUndefined()
  })

  test('rejects a dirty worktree', async () => {
    const commandRunner = vi.fn<CommandRunner>(async (_command, args) => {
      if (args[0] === 'branch') {
        return result(0, 'main\n')
      }
      return result(0, ' M package.json\n')
    })

    await expect(
      checkReleasePreconditions({ env: { GH_TOKEN: 'token' }, commandRunner })
    ).rejects.toThrow('worktree must be clean')
  })

  test('rejects a local or remote tag that already exists', async () => {
    const localExists = vi.fn<CommandRunner>(async () => result())
    await expect(
      assertReleaseTagAvailable({ tag: 'v1.2.3', commandRunner: localExists })
    ).rejects.toThrow('local tag v1.2.3 already exists')

    const remoteExists = vi.fn<CommandRunner>(async (_command, args) =>
      args[0] === 'show-ref' ? result(1) : result()
    )
    await expect(
      assertReleaseTagAvailable({ tag: 'v1.2.3', commandRunner: remoteExists })
    ).rejects.toThrow('remote tag v1.2.3 already exists')
  })
})
