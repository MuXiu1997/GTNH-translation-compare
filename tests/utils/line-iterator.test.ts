import { describe, expect, it } from 'bun:test'
import { lineIterator } from '../../src/utils/line-iterator.ts'

describe('lineIterator', () => {
  it('should correctly iterate over lines', () => {
    const content = ['', 'test', '', '测试', ''].join('\n')
    const result = Array.from(lineIterator(content))
    expect(result).toEqual([
      [0, '', 0, 0],
      [1, 'test', 1, 5],
      [2, '', 6, 6],
      [3, '测试', 7, 9],
      [4, '', 10, 10],
    ])
  })
})
