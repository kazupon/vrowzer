import { defineConfig } from 'bumpp'
import { updateChangelog } from 'gh-changelogen'
import { assertReleaseTagAvailable } from './scripts/check-release-preconditions.mjs'
import { getBumppReleaseTag } from './scripts/lib/release-utils.mjs'

export default defineConfig({
  all: true,
  commit: 'release: {tag}',
  tag: 'v{version}',
  push: true,
  async execute(operation) {
    const tag = getBumppReleaseTag(operation)
    await assertReleaseTagAvailable({ tag })
    await updateChangelog({
      repository: 'kazupon/vrowzer',
      tagName: tag,
      source: 'generated-notes',
      targetCommitish: 'HEAD',
      output: 'CHANGELOG.md'
    })
  }
})
