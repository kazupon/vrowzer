/**
 * Git Submodule History Tracker
 *
 * Records the current state of all git submodules in `refers/` directory
 * to a dated markdown file in `refers/__history__/`.
 */

import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const REFERS_DIR = 'refers'
const HISTORY_DIR = path.join(REFERS_DIR, '__history__')

interface SubmoduleInfo {
  name: string
  commitHash: string
  shortHash: string
  refDescription: string
  isInitialized: boolean
}

/**
 * Parse git submodule status output
 * Format: " <hash> <path> (<ref>)" or "-<hash> <path>" (uninitialized)
 */
function parseSubmoduleStatus(output: string): SubmoduleInfo[] {
  const lines = output.trim().split('\n').filter(Boolean)

  return lines.map(line => {
    const isInitialized = !line.startsWith('-')
    const cleanLine = line.replace(/^[-+ ]/, '')

    const match = cleanLine.match(/^([a-f0-9]+)\s+(\S+)(?:\s+\((.+)\))?$/)
    if (!match) {
      throw new Error(`Failed to parse submodule line: ${line}`)
    }

    const [, commitHash = '', _path = '', refDescription = ''] = match
    const name = _path.replace(`${REFERS_DIR}/`, '')

    return {
      name,
      commitHash,
      shortHash: commitHash.slice(0, 7),
      refDescription,
      isInitialized
    }
  })
}

/**
 * Generate markdown content for submodule snapshot
 */
function generateMarkdown(submodules: SubmoduleInfo[], timestamp: Date): string {
  const dateStr = timestamp.toISOString().split('T')[0]
  const isoTimestamp = timestamp.toISOString()

  const lines = [
    `# Submodule Snapshot - ${dateStr}`,
    '',
    `Generated at: ${isoTimestamp}`,
    '',
    '## Submodules',
    ''
  ]

  // User requested list format
  for (const sub of submodules) {
    lines.push(`- ${sub.name}: ${sub.shortHash}`)
  }

  lines.push('')
  lines.push('## Details')
  lines.push('')
  lines.push('| Name | Commit | Ref | Status |')
  lines.push('|------|--------|-----|--------|')

  for (const sub of submodules) {
    const status = sub.isInitialized ? 'OK' : 'Not initialized'
    lines.push(`| ${sub.name} | \`${sub.shortHash}\` | ${sub.refDescription || '-'} | ${status} |`)
  }

  lines.push('')

  return lines.join('\n')
}

async function main(): Promise<void> {
  const cwd = process.cwd()

  // Get submodule status
  const result = spawnSync('git', ['submodule', 'status'], {
    cwd,
    encoding: 'utf-8'
  })

  if (result.status !== 0) {
    console.error('Failed to get submodule status:', result.stderr)
    process.exit(1)
  }

  const output = result.stdout

  if (!output.trim()) {
    console.log('No submodules found.')
    return
  }

  const submodules = parseSubmoduleStatus(output)
  console.log(`Found ${submodules.length} submodules`)

  const now = new Date()
  const markdown = generateMarkdown(submodules, now)

  // Create history directory
  const historyPath = path.join(cwd, HISTORY_DIR)
  await mkdir(historyPath, { recursive: true })

  // Write to file (format: YYYY-MM-DDTHH-MM-SS.md)
  const filename = `${now
    .toISOString()
    .replace(/:/g, '-')
    .replace(/\.\d{3}Z$/, '')}.md`
  const filepath = path.join(historyPath, filename)
  await writeFile(filepath, markdown, 'utf-8')

  console.log(`Written: ${filepath}`)
}

await main()
