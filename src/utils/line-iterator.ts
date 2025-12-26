/**
 * A line iterator that yields [index, line, start, end] for each line in the content.
 * Optimized to avoid creating a large array of strings via split().
 * Treats \r\n as a single character for coordinate calculations (logical offsets).
 * @param content The string to iterate over.
 */
export function* lineIterator(content: string): IterableIterator<[number, string, number, number]> {
  let idx = 0
  let start = 0
  let logicalOffset = 0
  const n = content.length

  while (start < n) {
    let end = content.indexOf('\n', start)
    if (end === -1) {
      end = n
    }

    let lineEnd = end
    let hasCR = false
    if (lineEnd > start && content[lineEnd - 1] === '\r') {
      lineEnd--
      hasCR = true
    }

    const line = content.substring(start, lineEnd)
    // Return logical coordinates where \r\n is treated as a single character.
    // The end coordinate is the logical index of the \n character.
    yield [idx++, line, start - logicalOffset, end - logicalOffset]

    if (hasCR) {
      logicalOffset++
    }
    start = end + 1
  }

  // Handle trailing empty line if the content ends with \n
  if (n > 0 && content[n - 1] === '\n') {
    yield [idx, '', n - logicalOffset, n - logicalOffset]
  }
}
