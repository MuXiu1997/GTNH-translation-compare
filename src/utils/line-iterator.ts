/**
 * A line iterator based on Unicode code points and Uint8Array.
 * Yields [line index, byte slice (subarray), logical start code point offset, logical end code point offset].
 * Treats \r\n as a single logical code point (similar to ensureLf).
 * @param buf UTF-8 encoded byte array
 */
export function* lineIterator(buf: Uint8Array): IterableIterator<[number, Uint8Array, number, number]> {
  let lineIdx = 0
  let byteStart = 0
  let currentLogicalCp = 0
  let lineStartLogicalCp = 0

  const n = buf.length
  if (n === 0)
    return

  for (let i = 0; i < n; i++) {
    const b = buf[i]

    // 1. Check if it's the start of a new code point (UTF-8 encoding rule)
    const isNewCp = (b! & 0xC0) !== 0x80

    if (isNewCp) {
      // Check if it's \n in \r\n
      // If previous byte was \r (0x0D) and current is \n (0x0A), combine them as one logical code point
      const isCRLF = b === 0x0A && i > 0 && buf[i - 1] === 0x0D

      if (!isCRLF) {
        currentLogicalCp++
      }
    }

    // 2. Identify newline character \n
    if (b === 0x0A) {
      let lineByteEnd = i
      if (i > 0 && buf[i - 1] === 0x0D) {
        lineByteEnd-- // Exclude \r
      }

      // Return subarray, zero-copy
      const lineBytes = buf.subarray(byteStart, lineByteEnd)
      // End position is the logical code point index of the current \n
      yield [lineIdx++, lineBytes, lineStartLogicalCp, currentLogicalCp - 1]

      byteStart = i + 1
      lineStartLogicalCp = currentLogicalCp
    }
  }

  // 3. Handle last segment (if not ending with \n)
  if (byteStart < n) {
    const lineBytes = buf.subarray(byteStart)
    yield [lineIdx, lineBytes, lineStartLogicalCp, currentLogicalCp]
  }
  // 4. Handle trailing empty line if ends with \n
  else if (n > 0 && buf[n - 1] === 0x0A) {
    yield [lineIdx, new Uint8Array(0), lineStartLogicalCp, lineStartLogicalCp]
  }
}
