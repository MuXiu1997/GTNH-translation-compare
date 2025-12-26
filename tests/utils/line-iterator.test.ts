import { describe, expect, it } from 'bun:test'
import { lineIterator } from '~/utils/line-iterator.ts'

describe('lineIterator', () => {
  it('should correctly iterate over lines with LF', () => {
    const content = ['', 'test', '', '测试', ''].join('\n')
    const result = Array.from(lineIterator(content))
    // LF-only: start/end are indices of content start and delimiter position
    // content is "\ntest\n\n测试\n"
    expect(result).toEqual([
      [0, '', 0, 0],
      [1, 'test', 1, 5],
      [2, '', 6, 6],
      [3, '测试', 7, 9],
      [4, '', 10, 10],
    ])
  })

  it('should handle empty string', () => {
    const result = Array.from(lineIterator(''))
    expect(result).toEqual([])
  })

  it('should handle single line without newline', () => {
    const result = Array.from(lineIterator('hello'))
    expect(result).toEqual([[0, 'hello', 0, 5]])
  })

  it('should handle CRLF (Windows) line endings as logical offsets', () => {
    const content = 'line1\r\nline2\r\n'
    const result = Array.from(lineIterator(content))
    // Logical indices:
    // l(0) i(1) n(2) e(3) 1(4) \r\n(5)
    // l(6) i(7) n(8) e(9) 2(10) \r\n(11)
    // \n is at logical index 5 and 11
    expect(result).toEqual([
      [0, 'line1', 0, 6],
      [1, 'line2', 6, 12],
      [2, '', 12, 12],
    ])
  })

  it('should handle multiple consecutive newlines', () => {
    const content = '\n\n'
    const result = Array.from(lineIterator(content))
    expect(result).toEqual([
      [0, '', 0, 0],
      [1, '', 1, 1],
      [2, '', 2, 2],
    ])
  })

  it('should correctly report coordinates for unicode characters', () => {
    const content = '🚀\n星辰'
    const result = Array.from(lineIterator(content))
    // 🚀 is 2 code units in UTF-16, \n is at index 2
    expect(result).toEqual([
      [0, '🚀', 0, 2],
      [1, '星辰', 3, 5],
    ])
  })
})
