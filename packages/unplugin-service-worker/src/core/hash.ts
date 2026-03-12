/**
 * Simple string hash utility.
 *
 * Shared across the package to avoid duplicated hash implementations.
 *
 * @module hash
 */

/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

/**
 * Generate a simple 32-bit hash from a string.
 *
 * @param input - An input string
 * @returns An alphanumeric hash string
 */
export function hash(input: string): string {
  let h = 0
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i)
    h = (h << 5) - h + char
    h = h & h // Convert to 32-bit integer
  }
  return Math.abs(h).toString(36).slice(0, 8)
}
