import { describe, expect, it } from 'bun:test'
import { lineIterator } from '~/utils/line-iterator.ts'

describe('lineIterator', () => {
  const encoder = new TextEncoder()
  const decoder = new TextDecoder()

  it('should correctly iterate over lines with LF', () => {
    const content = encoder.encode(['', 'test', '', '测试', ''].join('\n'))
    const result = Array.from(lineIterator(content)).map(([idx, bytes, start, end]) => [
      idx,
      decoder.decode(bytes),
      start,
      end,
    ])
    // content is "\ntest\n\n测试\n"
    // indices:
    // \n (0)
    // t(1) e(2) s(3) t(4) \n(5)
    // \n (6)
    // 测(7) 试(8) \n(9)
    // \n (10)
    expect(result).toEqual([
      [0, '', 0, 0],
      [1, 'test', 1, 5],
      [2, '', 6, 6],
      [3, '测试', 7, 9],
      [4, '', 10, 10],
    ])
  })

  it('should handle empty input', () => {
    const content = new Uint8Array(0)
    const result = Array.from(lineIterator(content))
    expect(result).toEqual([])
  })

  it('should handle single line without newline', () => {
    const content = encoder.encode('hello')
    const result = Array.from(lineIterator(content)).map(([idx, bytes, start, end]) => [
      idx,
      decoder.decode(bytes),
      start,
      end,
    ])
    expect(result).toEqual([[0, 'hello', 0, 5]])
  })

  it('should handle CRLF (Windows) line endings as logical offsets', () => {
    const content = encoder.encode('line1\r\nline2\r\n')
    const result = Array.from(lineIterator(content)).map(([idx, bytes, start, end]) => [
      idx,
      decoder.decode(bytes),
      start,
      end,
    ])
    // Logical indices:
    // l(0) i(1) n(2) e(3) 1(4) \r\n(5)
    // l(6) i(7) n(8) e(9) 2(10) \r\n(11)
    expect(result).toEqual([
      [0, 'line1', 0, 5],
      [1, 'line2', 6, 11],
      [2, '', 12, 12],
    ])
  })

  it('should handle multiple consecutive newlines', () => {
    const content = encoder.encode('\n\n')
    const result = Array.from(lineIterator(content)).map(([idx, bytes, start, end]) => [
      idx,
      decoder.decode(bytes),
      start,
      end,
    ])
    expect(result).toEqual([
      [0, '', 0, 0],
      [1, '', 1, 1],
      [2, '', 2, 2],
    ])
  })

  it('should correctly report coordinates for unicode characters', () => {
    // 🚀 is 1 code point, \n is at index 1
    const content = encoder.encode('🚀\n星辰')
    const result = Array.from(lineIterator(content)).map(([idx, bytes, start, end]) => [
      idx,
      decoder.decode(bytes),
      start,
      end,
    ])
    expect(result).toEqual([
      [0, '🚀', 0, 1],
      [1, '星辰', 2, 4],
    ])
  })

  it('should handle complex Unicode and CRLF', () => {
    const content = encoder.encode('𠮷A\r\n你好')
    const result = Array.from(lineIterator(content)).map(([idx, bytes, start, end]) => [
      idx,
      decoder.decode(bytes),
      start,
      end,
    ])
    // 𠮷(0), A(1), \r\n(2)
    // 你(3), 好(4)
    expect(result).toEqual([
      [0, '𠮷A', 0, 2],
      [1, '你好', 3, 5],
    ])
  })

  it('should return Uint8Array subarrays (zero-copy)', () => {
    const content = encoder.encode('abc\ndef')
    const result = Array.from(lineIterator(content))
    expect(result?.[0]?.[1]).toBeInstanceOf(Uint8Array)
    expect(result?.[0]?.[1]?.buffer).toBe(content.buffer)
  })
})
