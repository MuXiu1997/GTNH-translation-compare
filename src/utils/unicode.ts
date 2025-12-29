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

/**
 * Gets the number of Unicode code points in a string up to a given UTF-16 index.
 * Optimized: No string slicing, no array allocation.
 * @param s The string.
 * @param utf16Index The UTF-16 index.
 * @returns The code point count.
 */
export function utf16ToCodePointIndex(s: string, utf16Index: number): number {
  let count = 0
  for (let i = 0; i < utf16Index; i++) {
    count++
    const code = s.charCodeAt(i)
    // If it's a high surrogate and there's a following low surrogate within the range
    if (code >= 0xD800 && code <= 0xDBFF && i + 1 < utf16Index) {
      const next = s.charCodeAt(i + 1)
      if (next >= 0xDC00 && next <= 0xDFFF) {
        i++ // Skip the low surrogate
      }
    }
  }
  return count
}

/**
 * Gets the total number of Unicode code points in a string.
 * @param s The string.
 * @returns The code point count.
 */
export function codePointLength(s: string): number {
  return utf16ToCodePointIndex(s, s.length)
}
