import { describe, expect, test } from 'vite-plus/test'
import {
  getBumppReleaseTag,
  getDistTag,
  getPackageNameFromSpecifier,
  isPrereleaseTag,
  parseReleaseTag
} from './lib/release-utils.mjs'

describe('release utilities', () => {
  test('parses only canonical v-prefixed release tags', () => {
    expect(parseReleaseTag('v1.2.3-beta.1')).toBe('1.2.3-beta.1')
    expect(() => parseReleaseTag('1.2.3')).toThrow('v<semver>')
    expect(() => parseReleaseTag('v01.2.3')).toThrow('canonical')
  })

  test.each([
    ['v1.2.3', false],
    ['v1.2.3-beta.0', true],
    ['v1.2.3-rc.1', true]
  ])('identifies whether %s is a prerelease tag', (tag, expected) => {
    expect(isPrereleaseTag(tag)).toBe(expected)
  })

  test('derives the future tag from the version available during the bumpp execute hook', () => {
    expect(getBumppReleaseTag({ state: { newVersion: '1.2.3-beta.0', tagName: '' } })).toBe(
      'v1.2.3-beta.0'
    )
    expect(() => getBumppReleaseTag({ state: { tagName: '' } })).toThrow(
      'did not provide the new release version'
    )
  })

  test.each([
    ['1.2.3', 'latest'],
    ['1.2.3-beta.1', 'beta'],
    ['1.2.3-rc.1', 'rc'],
    ['1.2.3-1', 'next'],
    ['1.2.3-v1.0', 'next'],
    ['1.2.3-x.0', 'next'],
    ['1.2.3-latest.1', 'next']
  ])('maps %s to the %s npm dist-tag', (version, distTag) => {
    expect(getDistTag(version)).toBe(distTag)
  })

  test('extracts package roots without treating builtins as packages', () => {
    expect(getPackageNameFromSpecifier('@vrowzer/fs/promises')).toBe('@vrowzer/fs')
    expect(getPackageNameFromSpecifier('pathe/utils')).toBe('pathe')
    expect(getPackageNameFromSpecifier('node:path')).toBeNull()
    expect(getPackageNameFromSpecifier('./local.js')).toBeNull()
  })
})
