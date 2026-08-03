import { isDirectExecution, parseReleaseTag, runCommand } from './lib/release-utils.mjs'
import { repositoryRoot } from './lib/release-packages.mjs'

function requireSuccessfulAbsence(result, absentCode, description) {
  if (result.code === 0) {
    throw new Error(`${description} already exists`)
  }
  if (result.code !== absentCode) {
    throw new Error(
      `Failed to check ${description}: ${result.stderr || result.stdout || `git exited with ${result.code}`}`
    )
  }
}

export async function assertReleaseTagAvailable({
  tag,
  root = repositoryRoot,
  commandRunner = runCommand
}) {
  parseReleaseTag(tag)

  const local = await commandRunner(
    'git',
    ['show-ref', '--verify', '--quiet', `refs/tags/${tag}`],
    { cwd: root, capture: true, allowFailure: true }
  )
  requireSuccessfulAbsence(local, 1, `local tag ${tag}`)

  const remote = await commandRunner(
    'git',
    ['ls-remote', '--exit-code', '--tags', 'origin', `refs/tags/${tag}`],
    { cwd: root, capture: true, allowFailure: true }
  )
  requireSuccessfulAbsence(remote, 2, `remote tag ${tag}`)
}

export async function checkReleasePreconditions({
  root = repositoryRoot,
  env = process.env,
  commandRunner = runCommand
} = {}) {
  if (!(env.GH_TOKEN?.trim() || env.GITHUB_TOKEN?.trim())) {
    throw new Error('Set GH_TOKEN or GITHUB_TOKEN before creating a release')
  }

  const branch = await commandRunner('git', ['branch', '--show-current'], {
    cwd: root,
    capture: true
  })
  if (branch.stdout.trim() !== 'main') {
    throw new Error(
      `Releases must be created from main, received ${branch.stdout.trim() || '(detached HEAD)'}`
    )
  }

  const status = await commandRunner('git', ['status', '--porcelain=v1', '--untracked-files=all'], {
    cwd: root,
    capture: true
  })
  if (status.stdout.trim()) {
    throw new Error('Release worktree must be clean')
  }

  await commandRunner('git', ['fetch', 'origin', 'main', '--tags'], {
    cwd: root,
    capture: true
  })

  const head = await commandRunner('git', ['rev-parse', 'HEAD'], {
    cwd: root,
    capture: true
  })
  const remoteMain = await commandRunner('git', ['rev-parse', 'origin/main'], {
    cwd: root,
    capture: true
  })
  if (head.stdout.trim() !== remoteMain.stdout.trim()) {
    throw new Error('Local HEAD must exactly match origin/main before release')
  }
}

if (isDirectExecution(import.meta.url)) {
  checkReleasePreconditions()
    .then(() => console.log('Release preconditions passed'))
    .catch(error => {
      console.error(error instanceof Error ? error.message : error)
      process.exitCode = 1
    })
}
