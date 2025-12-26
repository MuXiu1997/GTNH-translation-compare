const HEX_CHARS = new Uint8Array([
  48,
  49,
  50,
  51,
  52,
  53,
  54,
  55,
  56,
  57,
  97,
  98,
  99,
  100,
  101,
  102,
]) // '0123456789abcdef' in ASCII

const decoder = new TextDecoder()

/**
 * Convert a string to a unicode string using \uXXXX format.
 * Optimized using TypedArray and TextDecoder for performance.
 * @param s The string to convert.
 * @returns The unicode string.
 */
export function toUnicode(s: string): string {
  const n = s.length
  const buf = new Uint8Array(n * 6)

  for (let i = 0; i < n; i++) {
    const code = s.charCodeAt(i)
    const offset = i * 6

    buf[offset] = 92 // '\'
    buf[offset + 1] = 117 // 'u'
    buf[offset + 2] = HEX_CHARS[(code >> 12) & 0xF]!
    buf[offset + 3] = HEX_CHARS[(code >> 8) & 0xF]!
    buf[offset + 4] = HEX_CHARS[(code >> 4) & 0xF]!
    buf[offset + 5] = HEX_CHARS[code & 0xF]!
  }

  return decoder.decode(buf)
}
