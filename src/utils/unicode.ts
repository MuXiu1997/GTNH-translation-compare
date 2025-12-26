/**
 * Convert a string to a unicode string.
 * @param s The string to convert.
 * @returns The unicode string.
 */
export function toUnicode(s: string): string {
  return Array.from(s)
    .map(c => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`)
    .join('')
}
