import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { parseArgs } from 'node:util'
import {
  loadReleasePackages,
  releaseDependencyFields,
  repositoryRoot,
  sortPublishPackages
} from './lib/release-packages.mjs'
import { isDirectExecution, parseReleaseTag, runCommand } from './lib/release-utils.mjs'

const repositoryUrl = 'git+https://github.com/kazupon/vrowzer.git'
const bugsUrl = 'https://github.com/kazupon/vrowzer/issues'

function validatePublicMetadata(packageInfo, errors) {
  const { manifest } = packageInfo
  const expectedHomepage = `https://github.com/kazupon/vrowzer/tree/main/${packageInfo.directory}#readme`

  if (manifest.private === true) {
    errors.push(`${packageInfo.name} must not be private`)
  }
  if (!manifest.description) {
    errors.push(`${packageInfo.name} is missing description`)
  }
  if (!manifest.license) {
    errors.push(`${packageInfo.name} is missing license`)
  }
  if (manifest.publishConfig?.access !== 'public') {
    errors.push(`${packageInfo.name} must set publishConfig.access to public`)
  }
  if (manifest.repository?.type !== 'git' || manifest.repository?.url !== repositoryUrl) {
    errors.push(`${packageInfo.name} has invalid repository metadata`)
  }
  if (manifest.repository?.directory !== packageInfo.directory) {
    errors.push(`${packageInfo.name} repository.directory must be ${packageInfo.directory}`)
  }
  if (manifest.bugs?.url !== bugsUrl) {
    errors.push(`${packageInfo.name} bugs.url must be ${bugsUrl}`)
  }
  if (manifest.homepage !== expectedHomepage) {
    errors.push(`${packageInfo.name} homepage must be ${expectedHomepage}`)
  }
  if (manifest.scripts?.prepack !== 'vp run build') {
    errors.push(`${packageInfo.name} must define prepack as "vp run build"`)
  }
}

function validateInternalSpecifiers(packageInfo, internalNames, errors) {
  for (const field of releaseDependencyFields) {
    for (const [dependencyName, specifier] of Object.entries(packageInfo.manifest[field] ?? {})) {
      if (!internalNames.has(dependencyName)) {
        continue
      }
      if (specifier !== 'workspace:*') {
        errors.push(
          `${packageInfo.name} ${field}.${dependencyName} must use workspace:*, received ${specifier}`
        )
      }
    }
  }
}

function validateChangelog(changelog, tag, errors) {
  const firstHeading = changelog.split(/\r?\n/).find(line => /^#\s+\S/.test(line))
  if (!firstHeading) {
    errors.push('CHANGELOG.md does not contain a release heading')
  } else if (!firstHeading.split(/[\s()[\]]+/).includes(tag)) {
    errors.push(`CHANGELOG.md latest release heading does not contain ${tag}`)
  }
}

async function validateTagAtHead(root, tag, errors) {
  const head = await runCommand('git', ['rev-parse', 'HEAD'], {
    cwd: root,
    capture: true
  })
  const taggedCommit = await runCommand(
    'git',
    ['rev-parse', '--verify', `refs/tags/${tag}^{commit}`],
    { cwd: root, capture: true, allowFailure: true }
  )

  if (taggedCommit.code !== 0) {
    errors.push(`Git tag ${tag} does not exist in this checkout`)
  } else if (taggedCommit.stdout.trim() !== head.stdout.trim()) {
    errors.push(`Git tag ${tag} does not point to HEAD`)
  }
}

export async function checkReleaseVersion({
  root = repositoryRoot,
  tag,
  checkGit = true,
  changelog
}) {
  const version = parseReleaseTag(tag)
  const packages = await loadReleasePackages({ root })
  const internalNames = new Set(packages.map(packageInfo => packageInfo.name))
  const errors = []

  for (const packageInfo of packages) {
    if (packageInfo.manifest.version !== version) {
      errors.push(
        `${packageInfo.name} version is ${packageInfo.manifest.version}, expected ${version}`
      )
    }

    if (packageInfo.publish) {
      validatePublicMetadata(packageInfo, errors)
    } else if (packageInfo.manifest.private !== true) {
      errors.push(`${packageInfo.name} must remain private`)
    }

    validateInternalSpecifiers(packageInfo, internalNames, errors)
  }

  const publishedPackages = packages.filter(packageInfo => packageInfo.publish)
  if (packages.length !== 12 || publishedPackages.length !== 11) {
    errors.push(
      `release inventory must contain 12 packages and 11 public packages, received ${packages.length} and ${publishedPackages.length}`
    )
  }

  let publishOrder = []
  try {
    publishOrder = sortPublishPackages(packages)
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error))
  }

  const changelogSource = changelog ?? (await readFile(resolve(root, 'CHANGELOG.md'), 'utf8'))
  validateChangelog(changelogSource, tag, errors)

  if (checkGit) {
    await validateTagAtHead(root, tag, errors)
  }

  if (errors.length > 0) {
    throw new Error(`Release validation failed:\n- ${errors.join('\n- ')}`)
  }

  return { version, packages, publishOrder }
}

async function main() {
  const { values } = parseArgs({
    options: {
      tag: { type: 'string', default: process.env.TAG }
    }
  })
  if (!values.tag) {
    throw new Error('Pass the existing release tag with --tag or TAG')
  }

  const result = await checkReleaseVersion({ tag: values.tag })
  console.log(`Validated ${values.tag}`)
  console.log(`Publish order: ${result.publishOrder.map(({ name }) => name).join(' -> ')}`)
}

if (isDirectExecution(import.meta.url)) {
  main().catch(error => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
}
