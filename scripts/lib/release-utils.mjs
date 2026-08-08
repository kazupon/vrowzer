/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

import { spawn } from 'node:child_process'
import { builtinModules } from 'node:module'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import semver from 'semver'

const nodeBuiltins = new Set(
  builtinModules.flatMap(name => [name, name.startsWith('node:') ? name.slice(5) : `node:${name}`])
)

export function parseReleaseTag(tag) {
  if (typeof tag !== 'string' || !tag.startsWith('v')) {
    throw new Error(`Release tag must use the v<semver> format, received ${JSON.stringify(tag)}`)
  }

  const version = semver.valid(tag.slice(1))
  if (!version || tag !== `v${version}`) {
    throw new Error(`Release tag must use the canonical v<semver> format, received ${tag}`)
  }

  return version
}

export function isPrereleaseTag(tag) {
  return semver.prerelease(parseReleaseTag(tag)) !== null
}

export function getBumppReleaseTag(operation) {
  const version = operation?.state?.newVersion
  if (typeof version !== 'string') {
    throw new Error('bumpp did not provide the new release version')
  }
  return `v${parseReleaseTag(`v${version}`)}`
}

export function getDistTag(version) {
  const parsed = semver.parse(version)
  if (!parsed) {
    throw new Error(`Invalid release version: ${version}`)
  }
  if (parsed.prerelease.length === 0) {
    return 'latest'
  }

  const candidate = parsed.prerelease[0]
  if (
    typeof candidate !== 'string' ||
    candidate === 'latest' ||
    semver.validRange(candidate) !== null ||
    !/^[a-zA-Z][a-zA-Z0-9._-]*$/.test(candidate)
  ) {
    return 'next'
  }

  return candidate
}

export function getPackageNameFromSpecifier(specifier) {
  if (
    typeof specifier !== 'string' ||
    specifier.startsWith('.') ||
    specifier.startsWith('/') ||
    specifier.startsWith('#') ||
    specifier.includes('://') ||
    nodeBuiltins.has(specifier)
  ) {
    return null
  }

  const normalized = specifier.split(/[?#]/, 1)[0]
  if (nodeBuiltins.has(normalized)) {
    return null
  }
  if (normalized.startsWith('@')) {
    return normalized.split('/').slice(0, 2).join('/')
  }
  return normalized.split('/', 1)[0]
}

export async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'))
}

export async function runCommand(
  command,
  args,
  { cwd, env = process.env, capture = false, allowFailure = false } = {}
) {
  const child = spawn(command, args, {
    cwd,
    env,
    shell: false,
    stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit'
  })

  let stdout = ''
  let stderr = ''
  if (capture) {
    child.stdout.setEncoding('utf8')
    child.stderr.setEncoding('utf8')
    child.stdout.on('data', chunk => {
      stdout += chunk
    })
    child.stderr.on('data', chunk => {
      stderr += chunk
    })
  }

  const code = await new Promise((resolveExit, reject) => {
    child.once('error', reject)
    child.once('close', resolveExit)
  })

  const result = { code, stdout, stderr }
  if (code !== 0 && !allowFailure) {
    const details = capture ? `\n${stderr || stdout}` : ''
    throw new Error(`${command} ${args.join(' ')} exited with code ${code}${details}`)
  }

  return result
}

export function isDirectExecution(metaUrl) {
  if (!process.argv[1]) {
    return false
  }
  return metaUrl === pathToFileURL(resolve(process.argv[1])).href
}
