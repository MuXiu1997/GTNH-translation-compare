export function* lineIterator(content: string): IterableIterator<[number, string, number, number]> {
  const lines = content.split(/\r?\n/)
  let end = 0
  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx]!
    const start = end + (idx !== 0 ? 1 : 0)
    end = start + line.length
    yield [idx, line, start, end]
  }
}
